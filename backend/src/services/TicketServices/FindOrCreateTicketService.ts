// import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import ShowTicketService from "./ShowTicketService";
import CampaignContacts from "../../models/CampaignContacts";
import socketEmit from "../../helpers/socketEmit";
// import CheckChatBotWelcome from "../../helpers/CheckChatBotWelcome";
import CheckChatBotFlowWelcome from "../../helpers/CheckChatBotFlowWelcome";
import CreateLogTicketService from "./CreateLogTicketService";
import MessageModel from "../../models/Message";
import ListSettingsService from "../SettingServices/ListSettingsService";
import { logger } from "../../utils/logger";
import {
  normalizePhoneNumber,
  normalizeForSearch
} from "../../utils/phoneNumberNormalizer";
import { findMostSimilarNumber } from "../../utils/phoneNumberSimilarity";
import { parsePhoneNumberFromString } from "libphonenumber-js";

interface Data {
  contact: Contact;
  whatsappId: number;
  unreadMessages: number;
  tenantId: number | string;
  groupContact?: Contact;
  msg?: any;
  isSync?: boolean;
  channel: string;
}

/**
 * Verifica se o número é internacional (não brasileiro)
 */
const isInternationalNumber = (number: string): boolean => {
  try {
    const parsed = parsePhoneNumberFromString(number);
    return (
      parsed !== undefined &&
      parsed.country !== undefined &&
      parsed.country !== "BR"
    );
  } catch {
    // Se não conseguir fazer parse, verifica padrões básicos
    const clean = number.replace(/\D/g, "");
    // Se começa com + ou tem código diferente de 55 e mais de 10 dígitos
    return (
      number.startsWith("+") || (clean.length > 10 && !clean.startsWith("55"))
    );
  }
};

/**
 * Verifica se o contato tem número com 9 e implementa a lógica inteligente:
 * 1. Se tem 9, procura contato igual sem 9
 * 2. Se encontrar, usa o sem 9 e deleta o com 9
 * 3. Se não encontrar, corrige o número atual (remove 9)
 * Números internacionais não são processados (não têm o problema do dígito 9)
 */
const checkAndFixContactWith9 = async (
  contact: Contact,
  tenantId: number | string
): Promise<Contact> => {
  // Só processa se não for grupo e tiver número
  if (contact.isGroup || !contact.number) {
    return contact;
  }

  // Se for número internacional, não processa (não precisa remover dígito 9)
  if (isInternationalNumber(contact.number)) {
    logger.info(
      `[checkAndFixContactWith9] Número internacional detectado: ${contact.number} - não processando`
    );
    return contact;
  }

  const normalized = normalizePhoneNumber(contact.number);

  // Se o número não foi normalizado (não tem 9 para remover), retorna o contato original
  if (!normalized.hasChanges) {
    return contact;
  }

  logger.info(
    `[checkAndFixContactWith9] Processando contato ${contact.id} com número ${contact.number} → ${normalized.normalized}`
  );

  // Busca contatos similares (com e sem 9)
  const allContacts = await Contact.findAll({
    where: {
      tenantId,
      isGroup: false,
      number: {
        [Op.ne]: null as any
      }
    },
    attributes: ["id", "number", "name"]
  });

  const existingNumbers = allContacts.map(c => c.number);
  const similarContact = findMostSimilarNumber(
    contact.number,
    existingNumbers,
    90
  );

  if (similarContact) {
    // Encontrou contato similar sem 9
    const existingContact = allContacts.find(
      c => c.number === similarContact.number
    );

    if (existingContact && existingContact.id !== contact.id) {
      logger.info(
        `[checkAndFixContactWith9] Contato similar encontrado: ${existingContact.id} (${existingContact.number}) - deletando contato com 9: ${contact.id}`
      );

      // Transfere tickets do contato com 9 para o contato sem 9
      await Ticket.update(
        { contactId: existingContact.id },
        { where: { contactId: contact.id, tenantId } }
      );

      // Deleta o contato com 9
      await contact.destroy();

      logger.info(
        `[checkAndFixContactWith9] Contato ${contact.id} deletado, usando contato ${existingContact.id}`
      );
      return existingContact;
    }
  }

  // Não encontrou contato similar, corrige o número atual
  logger.info(
    `[checkAndFixContactWith9] Nenhum contato similar encontrado, corrigindo número do contato ${contact.id}`
  );
  await contact.update({ number: normalized.normalized });

  logger.info(
    `[checkAndFixContactWith9] Contato ${contact.id} atualizado: ${contact.number} → ${normalized.normalized}`
  );
  return contact;
};

const FindOrCreateTicketService = async ({
  contact,
  whatsappId,
  unreadMessages,
  tenantId,
  groupContact,
  msg,
  isSync,
  channel
}: Data): Promise<Ticket | any> => {
  // Verifica e corrige contato com número 9 antes de processar o ticket
  const correctedContact = await checkAndFixContactWith9(contact, tenantId);

  // Atualiza a referência do contato se foi corrigido
  if (correctedContact.id !== contact.id) {
    contact = correctedContact;
  }

  // se for uma mensagem de campanha, não abrir tícket
  if (msg && msg.fromMe) {
    const msgCampaign = await CampaignContacts.findOne({
      where: {
        contactId: contact.id,
        messageId: msg.id?.id || msg.message_id || msg.item_id
      }
    });
    if (msgCampaign?.id) {
      logger.info(
        `[FindOrCreateTicketService] Mensagem de campanha detectada | contactId=${contact.id} messageId=${msg.id?.id}`
      );
      return { isCampaignMessage: true };
    }
  }

  // Eco do WhatsApp: associar pelo messageId ao registro de mensagem do sistema (agendada)
  // Se encontrarmos mensagem fromMe com scheduleDate, usar o ticket dela e NÃO criar/reabrir
  if (msg?.id?.id) {
    const scheduledEcho = await MessageModel.findOne({
      where: { messageId: msg.id.id },
      include: ["ticket"]
    });
    if (scheduledEcho?.fromMe && scheduledEcho?.scheduleDate) {
      logger.info(
        `[FindOrCreateTicketService] echo linked to scheduled message | echoedMessageId=${msg.id.id} ticketId=${scheduledEcho.ticket?.id} status=${scheduledEcho.ticket?.status}`
      );
      return scheduledEcho.ticket;
    }
  }

  if (msg && msg.fromMe) {
    const farewellMessage = await MessageModel.findOne({
      where: { messageId: msg.id?.id || msg.message_id || msg.item_id },
      include: ["ticket"]
    });

    if (
      farewellMessage?.ticket?.status === "closed" &&
      farewellMessage?.ticket.lastMessage === msg.body
    ) {
      logger.info(
        `[FindOrCreateTicketService] farewell message detected | ticketId=${farewellMessage.ticket?.id} status=${farewellMessage.ticket?.status}`
      );
      const ticket = farewellMessage.ticket as any;
      ticket.isFarewellMessage = true;
      return ticket;
    }
  }

  // Evitar reabrir/criar ticket para mensagens agendadas (schedule)
  // Se a mensagem foi enviada por nós (fromMe) e possui scheduleDate ou sendType 'schedule',
  // reutilizar o último ticket do contato, mesmo que esteja fechado, sem alterar o status.
  if (msg && msg.fromMe && (msg.scheduleDate || msg.sendType === "schedule")) {
    logger.info(
      `[FindOrCreateTicketService] schedule message detected | tenantId=${tenantId} whatsappId=${whatsappId} contactId=${
        groupContact ? groupContact.id : contact.id
      } | scheduleDate=${msg.scheduleDate} | sendType=${msg.sendType}`
    );
    const lastTicket = await Ticket.findOne({
      where: {
        tenantId,
        whatsappId,
        contactId: groupContact ? groupContact.id : contact.id
      },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: Contact,
          as: "contact",
          include: [
            "extraInfo",
            "tags",
            {
              association: "wallets",
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          association: "whatsapp",
          attributes: ["id", "name"]
        }
      ]
    });

    if (lastTicket) {
      logger.info(
        `[FindOrCreateTicketService] schedule flow: found lastTicket | ticketId=${lastTicket.id} status=${lastTicket.status} | returning without reopening`
      );
      // Não alterar status/userId aqui; apenas retornar o ticket existente
      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: lastTicket
      });
      return lastTicket;
    }

    logger.info(
      `[FindOrCreateTicketService] schedule flow: no lastTicket found | tenantId=${tenantId} whatsappId=${whatsappId} contactId=${
        groupContact ? groupContact.id : contact.id
      } | will continue default flow`
    );
  }

  // Evitar criar/reutilizar ticket quando o contato é o próprio número conectado (Baileys/eco)
  if (!groupContact && contact.number) {
    const session = await Whatsapp.findByPk(whatsappId, { attributes: ["number"] });
    const sessionNumber = (session as any)?.number;
    if (sessionNumber) {
      const norm = (n: string) => (n || "").replace(/\D/g, "");
      if (norm(contact.number) === norm(sessionNumber)) {
        logger.info(
          `[FindOrCreateTicketService] Contato é o próprio número conectado - retornando último ticket sem criar novo: ${contact.number}`
        );
        const lastSelf = await Ticket.findOne({
          where: { tenantId, whatsappId, contactId: contact.id },
          order: [["updatedAt", "DESC"]],
          include: [
            { model: Contact, as: "contact" },
            { model: User, as: "user", attributes: ["id", "name"] },
            { association: "whatsapp", attributes: ["id", "name"] }
          ]
        });
        return lastSelf ?? null;
      }
    }
  }

  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending", "pending_evaluation"]
      },
      tenantId,
      whatsappId,
      contactId: groupContact ? groupContact.id : contact.id
    },
    include: [
      {
        model: Contact,
        as: "contact",
        include: [
          "extraInfo",
          "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        association: "whatsapp",
        attributes: ["id", "name"]
      }
    ]
  });

  if (ticket) {
    unreadMessages =
      ["telegram", "waba", "instagram", "messenger"].includes(channel) &&
      unreadMessages > 0
        ? (unreadMessages += ticket.unreadMessages)
        : unreadMessages;
    await ticket.update({ unreadMessages });
    logger.info(
      `[FindOrCreateTicketService] existing open/pending ticket found | ticketId=${ticket.id} status=${ticket.status} | updated unreadMessages=${unreadMessages}`
    );
    socketEmit({
      tenantId,
      type: "ticket:update",
      payload: ticket
    });
    return ticket;
  }

  if (groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        tenantId,
        whatsappId
      },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: Contact,
          as: "contact",
          include: [
            "extraInfo",
            "tags",
            {
              association: "wallets",
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          association: "whatsapp",
          attributes: ["id", "name"]
        }
      ]
    });

    if (ticket) {
      // CORREÇÃO: Só reabre se a mensagem for do cliente (não é fromMe)
      // Se for mensagem nossa (agendada, campanha, etc.) ou sem mensagem, não reabre
      if (msg && !msg.fromMe) {
        await ticket.update({
          status: "pending",
          userId: null,
          unreadMessages
        });
        logger.info(
          `[FindOrCreateTicketService] reused group ticket set to pending | ticketId=${ticket.id} | message from client`
        );
      } else {
        // Se for mensagem nossa ou sem mensagem, apenas atualizar unreadMessages sem mudar status
        await ticket.update({ unreadMessages });
        logger.info(
          `[FindOrCreateTicketService] reused group ticket without reopening | ticketId=${ticket.id} status=${ticket.status} | fromMe=${msg?.fromMe || 'no message'}`
        );
      }

      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: ticket
      });

      return ticket;
    }
  } else {
    ticket = await Ticket.findOne({
      where: {
        // updatedAt: {
        //   [Op.between]: [+subHours(new Date(), 24), +new Date()]
        // },
        status: {
          [Op.in]: ["open", "pending"]
        },
        tenantId,
        whatsappId,
        contactId: contact.id
      },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: Contact,
          as: "contact",
          include: [
            "extraInfo",
            "tags",
            {
              association: "wallets",
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          association: "whatsapp",
          attributes: ["id", "name"]
        }
      ]
    });

    if (ticket) {
      // CORREÇÃO: Só reabre se a mensagem for do cliente (não é fromMe)
      // Se for mensagem nossa (agendada, campanha, etc.) ou sem mensagem, não reabre
      if (msg && !msg.fromMe) {
        await ticket.update({
          status: "pending",
          userId: null,
          unreadMessages
        });
        logger.info(
          `[FindOrCreateTicketService] reused ticket set to pending | ticketId=${ticket.id} | message from client`
        );
      } else {
        // Se for mensagem nossa ou sem mensagem, apenas atualizar unreadMessages sem mudar status
        await ticket.update({ unreadMessages });
        logger.info(
          `[FindOrCreateTicketService] reused ticket without reopening | ticketId=${ticket.id} status=${ticket.status} | fromMe=${msg?.fromMe || 'no message'}`
        );
      }

      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: ticket
      });

      return ticket;
    }
  }

  // CORREÇÃO: Para mensagens enviadas por nós (fromMe), não criar novo ticket.
  // Isso evita "tickets fantasma" causados pelo eco de mensagens do bot/sistema
  // (farewell, chatbot menu, business hours, etc.) via evento message_create.
  if (msg && msg.fromMe) {
    const lastTicketFromMe = await Ticket.findOne({
      where: {
        tenantId,
        whatsappId,
        contactId: groupContact ? groupContact.id : contact.id
      },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: Contact,
          as: "contact",
          include: [
            "extraInfo",
            "tags",
            {
              association: "wallets",
              attributes: ["id", "name"]
            }
          ]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          association: "whatsapp",
          attributes: ["id", "name"]
        }
      ]
    });

    if (lastTicketFromMe) {
      logger.info(
        `[FindOrCreateTicketService] Mensagem fromMe sem ticket aberto - retornando último ticket sem criar novo | ticketId=${lastTicketFromMe.id} status=${lastTicketFromMe.status} contactId=${groupContact ? groupContact.id : contact.id}`
      );
      return lastTicketFromMe;
    }

    // Se não existir nenhum ticket anterior, criar sem ativar o bot
    logger.info(
      `[FindOrCreateTicketService] Mensagem fromMe sem ticket anterior - criando sem ativar bot | contactId=${groupContact ? groupContact.id : contact.id}`
    );
  }

  const DirectTicketsToWallets =
    (await ListSettingsService(tenantId))?.find(
      s => s.key === "DirectTicketsToWallets"
    )?.value === "enabled" || false;

  const ticketObj: any = {
    contactId: groupContact ? groupContact.id : contact.id,
    status: "pending",
    isGroup: !!groupContact,
    unreadMessages,
    whatsappId,
    tenantId,
    channel
  };

  if (DirectTicketsToWallets && contact.id) {
    const wallet: any = contact;
    const wallets = await wallet.getWallets();
    if (wallets && wallets[0]?.id) {
      ticketObj.status = "open";
      ticketObj.userId = wallets[0].id;
      ticketObj.startedAttendanceAt = new Date().getTime();
    }
  }

  try {
    const ticketCreated = await Ticket.create(ticketObj);
    logger.info(
      `[FindOrCreateTicketService] created new ticket | ticketId=${ticketCreated.id} contactId=${ticketObj.contactId} status=${ticketObj.status}`
    );

    await CreateLogTicketService({
      ticketId: ticketCreated.id,
      type: "create"
    });

    // CORREÇÃO: Só ativa o bot se houver mensagem REAL do contato (não fromMe)
    // Removido: || !ticketCreated.userId || isSync
    // Motivo: Essas condições faziam o bot ser ativado sem interação do contato
    if (msg && !msg.fromMe) {
      logger.info(
        `[FindOrCreateTicketService] Ativando bot para novo ticket | ticketId=${ticketCreated.id} contactId=${ticketObj.contactId}`
      );
      await CheckChatBotFlowWelcome(ticketCreated);
    } else {
      logger.info(
        `[FindOrCreateTicketService] Bot NÃO ativado para novo ticket | ticketId=${ticketCreated.id} | hasMsg=${!!msg} fromMe=${msg?.fromMe}`
      );
    }

    ticket = await ShowTicketService({ id: ticketCreated.id, tenantId });
    ticket.setDataValue("isCreated", true);

    socketEmit({
      tenantId,
      type: "ticket:update",
      payload: ticket
    });

    return ticket;
  } catch (error) {

    // CORREÇÃO: Log estruturado sem o objeto ticket completo
    logger.error(
      `[FindOrCreateTicketService] Erro ao criar ticket: ${error.message}`,
      {
        contactId: contact.id,
        whatsappId,
        tenantId,
        error: error.stack
      }
    );

    throw error;
  }
};

export default FindOrCreateTicketService;
