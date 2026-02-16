import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import { normalizePhoneNumber } from "../utils/phoneNumberNormalizer";
import { logger } from "../utils/logger";

/**
 * Script de teste para verificar a lógica de criação de tickets com números que têm 9
 * Simula o comportamento do FindOrCreateTicketService
 */

interface TestContact {
  id: number;
  name: string;
  number: string;
  isGroup: boolean;
  tenantId: number;
}

const testTicketCreationWith9 = async () => {
  try {
    logger.info("=== TESTE DE CRIAÇÃO DE TICKETS COM NÚMEROS QUE TÊM 9 ===");
    
    // Busca contatos que podem ter o dígito 9
    const contactsWith9 = await Contact.findAll({
      where: {
        isGroup: false,
        tenantId: 1 // Ajuste conforme necessário
      },
      attributes: ["id", "name", "number", "isGroup", "tenantId"],
      limit: 10
    });

    logger.info(`Encontrados ${contactsWith9.length} contatos para testar`);

    for (const contact of contactsWith9) {
      if (!contact.number) continue;

      const normalized = normalizePhoneNumber(contact.number);
      
      // Só processa contatos que têm 9 para remover
      if (!normalized.hasChanges) {
        logger.info(`Contato ${contact.id} (${contact.number}) - não precisa normalização`);
        continue;
      }

      logger.info(`\n--- Testando contato ${contact.id} ---`);
      logger.info(`Número original: ${contact.number}`);
      logger.info(`Número normalizado: ${normalized.normalized}`);

      // Simula a lógica do checkAndFixContactWith9
      const allContacts = await Contact.findAll({
        where: { 
          tenantId: contact.tenantId,
          isGroup: false
        },
        attributes: ["id", "number", "name"]
      });

      const existingNumbers = allContacts.map(c => c.number);
      
      // Busca por contatos similares
      const { findMostSimilarNumber } = await import("../utils/phoneNumberSimilarity");
      const similarContact = findMostSimilarNumber(contact.number, existingNumbers, 90);

      if (similarContact) {
        const existingContact = allContacts.find(c => c.number === similarContact.number);
        
        if (existingContact && existingContact.id !== contact.id) {
          logger.info(`✅ CONTATO SIMILAR ENCONTRADO: ${existingContact.id} (${existingContact.number})`);
          logger.info(`📋 Ação: Deletaria contato ${contact.id} e usaria contato ${existingContact.id}`);
          
          // Conta tickets do contato atual
          const currentTickets = await Ticket.count({
            where: { contactId: contact.id, tenantId: contact.tenantId }
          });
          
          logger.info(`📊 Tickets do contato ${contact.id}: ${currentTickets}`);
          logger.info(`📊 Tickets do contato ${existingContact.id}: ${await Ticket.count({
            where: { contactId: existingContact.id, tenantId: contact.tenantId }
          })}`);
          
        } else {
          logger.info(`❌ Contato similar encontrado mas é o mesmo contato`);
        }
      } else {
        logger.info(`❌ NENHUM CONTATO SIMILAR ENCONTRADO`);
        logger.info(`📋 Ação: Corrigiria o número do contato ${contact.id} para ${normalized.normalized}`);
      }

      // Conta tickets existentes
      const ticketCount = await Ticket.count({
        where: { contactId: contact.id, tenantId: contact.tenantId }
      });
      
      logger.info(`📊 Tickets existentes para este contato: ${ticketCount}`);
    }

    logger.info("\n=== TESTE CONCLUÍDO ===");
  } catch (error) {
    logger.error("Erro durante o teste:", error);
  }
};

// Executa o teste se o arquivo for executado diretamente
if (require.main === module) {
  testTicketCreationWith9()
    .then(() => {
      logger.info("Teste de criação de tickets executado com sucesso");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Erro ao executar teste de criação de tickets:", error);
      process.exit(1);
    });
}

export default testTicketCreationWith9;
