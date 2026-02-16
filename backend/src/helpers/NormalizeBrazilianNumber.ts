/**
 * Normaliza números brasileiros removendo o 9º dígito extra
 *
 * O Brasil adiciona um 9 extra após o DDD para celulares.
 * Este helper remove esse 9 para garantir compatibilidade.
 *
 * EXCEÇÃO: Para DDD 11 (São Paulo), o dígito 9 é OBRIGATÓRIO e NÃO deve ser removido.
 *
 * Formato de entrada esperado: 5575987878787 (13 dígitos)
 * - 55 (DDI Brasil)
 * - 75 (DDD)
 * - 9 (dígito extra a ser removido)
 * - 87878787 (número do celular)
 *
 * Formato de saída: 557587878787 (12 dígitos)
 *
 * EXCEÇÃO DDD 11: 5511999999999 → 5511999999999 (mantém o 9)
 *
 * @param number - Número de telefone (pode conter caracteres não numéricos)
 * @returns Número normalizado apenas com dígitos
 */
export function normalizeBrazilianNumber(number: string | number): string {
  // Remove todos os caracteres não numéricos
  let cleanNumber = String(number).replace(/\D/g, "");

  // Verifica se é um número brasileiro com 13 dígitos (55 + DDD + 9 + 8 dígitos)
  if (cleanNumber.length === 13 && cleanNumber.startsWith("55")) {
    // Extrai as partes
    const ddi = cleanNumber.substring(0, 2); // "55"
    const ddd = cleanNumber.substring(2, 4); // Ex: "75"
    const ninthDigit = cleanNumber.substring(4, 5); // O "9" extra
    const restOfNumber = cleanNumber.substring(5); // Os 8 dígitos finais

    // EXCEÇÃO: Para DDD 11, o dígito 9 é OBRIGATÓRIO - NÃO remove
    if (ddd === "11") {
      // Para DDD 11, mantém o número como está (com o 9)
      return cleanNumber;
    }

    // Para outros DDDs, se o 5º caractere (após 55 + DDD) é "9", remove ele
    if (ninthDigit === "9" && restOfNumber.length === 8) {
      cleanNumber = `${ddi}${ddd}${restOfNumber}`;
    }
  }

  // Se o número tem 11 dígitos e não tem DDI (ex: 75987878787)
  // Adiciona DDI 55 e remove o 9
  if (cleanNumber.length === 11 && !cleanNumber.startsWith("55")) {
    const ddd = cleanNumber.substring(0, 2);
    const ninthDigit = cleanNumber.substring(2, 3);
    const restOfNumber = cleanNumber.substring(3);

    // EXCEÇÃO: Para DDD 11, mantém o 9
    if (ddd === "11" && ninthDigit === "9" && restOfNumber.length === 8) {
      cleanNumber = `55${cleanNumber}`; // Adiciona DDI mas mantém o 9
    } else if (ninthDigit === "9" && restOfNumber.length === 8) {
      cleanNumber = `55${ddd}${restOfNumber}`; // Remove o 9 para outros DDDs
    } else {
      cleanNumber = `55${cleanNumber}`;
    }
  }

  // Se tem 10 dígitos sem DDI (ex: 7587878787 - já sem o 9)
  // Apenas adiciona DDI
  if (cleanNumber.length === 10 && !cleanNumber.startsWith("55")) {
    cleanNumber = `55${cleanNumber}`;
  }

  // CORREÇÃO AUTOMÁTICA: Se é DDD 11 e tem 12 dígitos (sem 9), adiciona o 9
  if (cleanNumber.length === 12 && cleanNumber.startsWith("55")) {
    const ddd = cleanNumber.substring(2, 4);
    if (ddd === "11") {
      // Para DDD 11, adiciona o dígito 9 automaticamente
      cleanNumber = `${cleanNumber.substring(0, 4)}9${cleanNumber.substring(
        4
      )}`;
    }
  }

  return cleanNumber;
}
