/**
 * Script de migração: limpa o campo number dos contatos que contêm JID bruto
 * (sufixos @s.whatsapp.net, @g.us, @lid ou sufixo de dispositivo :1, :2).
 * Deixa apenas dígitos (DDI + DDD + número) para permitir que o atendente use o número no discador.
 *
 * Uso: npx ts-node src/scripts/sanitizeContactNumbersFromJid.ts [--dry-run]
 * Com --dry-run apenas lista os contatos que seriam alterados, sem atualizar.
 */

// Carrega variáveis de ambiente antes dos imports que usam o DB
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("../app/config-env");

import Contact from "../models/Contact";
import { logger } from "../utils/logger";
import { Op } from "sequelize";
import { sanitizeJidToPhone } from "../types/baileysAdapter";

/** Indica se o número parece JID bruto ou contém não-dígitos. */
function needsSanitization(number: string | null): boolean {
  if (!number || typeof number !== "string") return false;
  return /[@:]/.test(number) || /\D/.test(number);
}

const run = async (): Promise<void> => {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    logger.info("[SANITIZE_JID] Modo dry-run: nenhuma alteração será persistida.");
  }

  const contacts = await Contact.findAll({
    where: {
      number: { [Op.ne]: null as any }
    },
    attributes: ["id", "tenantId", "number", "numberBackup", "name"]
  });

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const contact of contacts) {
    const current = (contact as any).number ?? "";
    if (!needsSanitization(current)) {
      skipped++;
      continue;
    }

    const sanitized = sanitizeJidToPhone(current);
    if (sanitized === current.replace(/\D/g, "")) {
      skipped++;
      continue;
    }

    try {
      if (dryRun) {
        logger.info(
          `[DRY-RUN] Contato id=${(contact as any).id} tenant=${(contact as any).tenantId}: "${current}" → "${sanitized}"`
        );
        updated++;
        continue;
      }

      const updatePayload: Record<string, string> = {
        number: sanitized
      };
      if (!(contact as any).numberBackup && current !== sanitized) {
        updatePayload.numberBackup = current;
      }
      await contact.update(updatePayload);
      updated++;
      logger.info(
        `[SANITIZE_JID] Contato id=${(contact as any).id}: "${current}" → "${sanitized}"`
      );
    } catch (err) {
      errors++;
      logger.error(`[SANITIZE_JID] Erro ao atualizar contato id=${(contact as any).id}:`, err);
    }
  }

  logger.info(
    `[SANITIZE_JID] Concluído. Atualizados: ${updated}, ignorados: ${skipped}, erros: ${errors}${dryRun ? " (dry-run)" : ""}`
  );
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("[SANITIZE_JID] Erro fatal:", err);
    process.exit(1);
  });
