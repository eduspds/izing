import type { IBaileysMessageAdapter } from "../../../types/baileysAdapter";
import socketEmit from "../../../helpers/socketEmit";
// import SetTicketMessagesAsRead from "../../../helpers/SetTicketMessagesAsRead";
import Ticket from "../../../models/Ticket";
import Queue from "../../../models/Queue";
import User from "../../../models/User";
// import { sleepRandomTime } from "../../../utils/sleepRandomTime";
import CreateAutoReplyLogsService from "../../AutoReplyServices/CreateAutoReplyLogsService";
import ShowStepAutoReplyMessageService from "../../AutoReplyServices/ShowStepAutoReplyMessageService";
import VerifyActionStepAutoReplyService from "../../AutoReplyServices/VerifyActionStepAutoReplyService";
import CreateMessageSystemService from "../../MessageServices/CreateMessageSystemService";
import CreateLogTicketService from "../../TicketServices/CreateLogTicketService";
// import SendWhatsAppMessage from "../SendWhatsAppMessage";

const verifyAutoReplyActionTicket = async (
  msg: IBaileysMessageAdapter,
  ticket: Ticket
): Promise<void> => {
  const celularContato = ticket.contact.number;
  let celularTeste = "";

  if (
    ticket.autoReplyId &&
    ticket.status === "pending" &&
    !msg.fromMe &&
    !ticket.isGroup
  ) {
    if (ticket.autoReplyId) {
      const stepAutoReplyAtual = await ShowStepAutoReplyMessageService(
        0,
        ticket.autoReplyId,
        ticket.stepAutoReplyId,
        undefined,
        ticket.tenantId
      );
      const actionAutoReply = await VerifyActionStepAutoReplyService(
        ticket.stepAutoReplyId,
        msg.body,
        ticket.tenantId
      );
      if (actionAutoReply) {
        await CreateAutoReplyLogsService(stepAutoReplyAtual, ticket, msg.body);

        // action = 0: enviar para proximo step: nextStepId
        if (actionAutoReply.action === 0) {
          await ticket.update({
            stepAutoReplyId: actionAutoReply.nextStepId
          });
          const stepAutoReply = await ShowStepAutoReplyMessageService(
            0,
            ticket.autoReplyId,
            actionAutoReply.nextStepId,
            undefined,
            ticket.tenantId
          );

          // Verificar se rotina em teste
          celularTeste = stepAutoReply.autoReply.celularTeste;
          if (
            (celularTeste &&
              celularContato?.indexOf(celularTeste.substr(1)) === -1) ||
            !celularContato
          ) {
            if (ticket.channel !== "telegram") {
              return;
            }
            // return;
          }

          const messageData = {
            body: stepAutoReply.reply,
            fromMe: true,
            read: true,
            sendType: "bot"
          };
          await CreateMessageSystemService({
            msg: messageData,
            tenantId: ticket.tenantId,
            ticket,
            sendType: messageData.sendType,
            status: "pending"
          });
          // await SetTicketMessagesAsRead(ticket);
          return;
        }

        // action = 1: enviar para fila: queue
        if (actionAutoReply.action === 1) {
          ticket.update({
            queueId: actionAutoReply.queueId,
            autoReplyId: null,
            stepAutoReplyId: null
          });

          // Buscar informações da fila para incluir no log
          const queue = await Queue.findByPk(actionAutoReply.queueId);
          const queueName = queue?.queue || "Fila desconhecida";

          await CreateLogTicketService({
            ticketId: ticket.id,
            type: "queue",
            queueId: actionAutoReply.queueId,
            description: `Bot definiu a fila: ${queueName}`,
            metadata: {
              queueId: actionAutoReply.queueId,
              queueName,
              autoReplyId: stepAutoReplyAtual.idAutoReply
            }
          });
        }

        // action = 2: enviar para determinado usuário
        if (actionAutoReply.action === 2) {
          // Verificar se o usuário está inativo
          const targetUser = await User.findByPk(actionAutoReply.userIdDestination);
          
          if (targetUser) {
            const isInactive = targetUser.isInactive === true;
            let isInactiveByDate = false;
            if (targetUser.inactiveUntil) {
              isInactiveByDate = new Date(targetUser.inactiveUntil) > new Date();
            }

            if (isInactive && (targetUser.inactiveUntil === null || isInactiveByDate)) {
              // Usuário está inativo, não atribuir e registrar log
              await CreateLogTicketService({
                ticketId: ticket.id,
                type: "userDefine",
                description: `Tentativa de transferência para usuário inativo (ID: ${actionAutoReply.userIdDestination}) bloqueada`,
                metadata: {
                  userId: actionAutoReply.userIdDestination,
                  autoReplyId: stepAutoReplyAtual.idAutoReply
                }
              });
              return; // Não atribuir o ticket
            }
          }

          ticket.update({
            userId: actionAutoReply.userIdDestination,
            // status: "pending",
            autoReplyId: null,
            stepAutoReplyId: null
          });

          // Buscar informações do usuário para incluir no log
          const user = await User.findByPk(actionAutoReply.userIdDestination);
          const userName = user?.name || "Usuário desconhecido";

          await CreateLogTicketService({
            userId: actionAutoReply.userIdDestination,
            ticketId: ticket.id,
            type: "userDefine",
            description: `Bot definiu o usuário: ${userName}`,
            metadata: {
              userId: actionAutoReply.userIdDestination,
              userName,
              autoReplyId: stepAutoReplyAtual.idAutoReply
            }
          });
        }

        socketEmit({
          tenantId: ticket.tenantId,
          type: "ticket:update",
          payload: ticket
        });

        if (actionAutoReply.replyDefinition) {
          const messageData = {
            body: actionAutoReply.replyDefinition,
            fromMe: true,
            read: true,
            sendType: "bot"
          };
          await CreateMessageSystemService({
            msg: messageData,
            tenantId: ticket.tenantId,
            ticket,
            sendType: messageData.sendType,
            status: "pending"
          });
          // await SetTicketMessagesAsRead(ticket);
        }
      } else {
        // Verificar se rotina em teste
        celularTeste = stepAutoReplyAtual.autoReply.celularTeste;
        if (
          (celularTeste &&
            celularContato?.indexOf(celularTeste.substr(1)) === -1) ||
          !celularContato
        ) {
          if (ticket.channel !== "telegram") {
            return;
          }
          // return;
        }

        // se ticket tiver sido criado, ingnorar na primeria passagem
        if (!ticket.isCreated) {
          const messageData = {
            body: "Desculpe! Não entendi sua resposta. Vamos tentar novamente! Escolha uma opção válida.",
            fromMe: true,
            read: true,
            sendType: "bot"
          };
          await CreateMessageSystemService({
            msg: messageData,
            tenantId: ticket.tenantId,
            ticket,
            sendType: messageData.sendType,
            status: "pending"
          });
        }

        const messageData = {
          body: stepAutoReplyAtual.reply,
          fromMe: true,
          read: true,
          sendType: "bot"
        };
        await CreateMessageSystemService({
          msg: messageData,
          tenantId: ticket.tenantId,
          ticket,
          sendType: messageData.sendType,
          status: "pending"
        });
        // await SetTicketMessagesAsRead(ticket);
      }
    }
  }
};

export default verifyAutoReplyActionTicket;
