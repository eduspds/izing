/**
 * Utilitário de similaridade para números de telefone brasileiros
 * Usa algoritmos de similaridade para encontrar contatos mesmo com pequenas diferenças
 * Compatível com WhatsApp que não funciona com o 9
 */

import { isPossiblePhoneNumber as libIsPossiblePhoneNumber } from './phoneValidator';

/**
 * Calcula similaridade específica para números de telefone brasileiros
 * Foca apenas na diferença do dígito 9 e código do país
 * EXCEÇÃO: Para DDD 11, o dígito 9 é obrigatório
 * @param number1 Primeiro número
 * @param number2 Segundo número
 * @returns Percentual de similaridade (0-100)
 */
export function calculatePhoneNumberSimilarity(
  number1: string,
  number2: string
): number {
  // Remove caracteres não numéricos
  const clean1 = number1.replace(/\D/g, "");
  const clean2 = number2.replace(/\D/g, "");

  // Se são idênticos após limpeza
  if (clean1 === clean2) return 100;

  // Para números brasileiros, considera o padrão DDD + número
  const isBrazilian1 = clean1.startsWith("55") && clean1.length >= 12;
  const isBrazilian2 = clean2.startsWith("55") && clean2.length >= 12;

  if (isBrazilian1 && isBrazilian2) {
    // Extrai DDD e número
    const ddd1 = clean1.substring(2, 4);
    const ddd2 = clean2.substring(2, 4);

    // Se DDDs são diferentes, não são similares
    if (ddd1 !== ddd2) {
      return 0;
    }

    // EXCEÇÃO: Para DDD 11, o dígito 9 é obrigatório
    if (ddd1 === "11" || ddd2 === "11") {
      // Para DDD 11, ambos devem ter o 9 para serem similares
      if (clean1.length === 13 && clean2.length === 13) {
        // Ambos com 13 dígitos (com 9) - verifica se são similares
        const without9First = clean1.substring(0, 4) + clean1.substring(5);
        const without9Second = clean2.substring(0, 4) + clean2.substring(5);
        if (without9First === without9Second) {
          return 95; // Alta similaridade para DDD 11 com 9
        }
      }
      // Se um tem 12 e outro 13 dígitos no DDD 11, não são similares
      return 0;
    }

    // Para outros DDDs, verifica se a diferença é apenas o dígito 9
    if (clean1.length === 12 && clean2.length === 13) {
      // Primeiro número sem 9, segundo com 9
      const without9 = clean2.substring(0, 4) + clean2.substring(5);
      if (clean1 === without9) {
        return 95; // Alta similaridade para números com/sem 9
      }
    } else if (clean1.length === 13 && clean2.length === 12) {
      // Primeiro número com 9, segundo sem 9
      const without9 = clean1.substring(0, 4) + clean1.substring(5);
      if (clean2 === without9) {
        return 95; // Alta similaridade para números com/sem 9
      }
    }

    // Se não é diferença de 9, não considera similar
    return 0;
  }

  // Para outros casos, não considera similar
  return 0;
}

/**
 * Verifica se dois números são suficientemente similares
 * @param number1 Primeiro número
 * @param number2 Segundo número
 * @param threshold Limiar de similaridade (padrão: 85%)
 * @returns true se são similares
 */
export function arePhoneNumbersSimilar(
  number1: string,
  number2: string,
  threshold = 85
): boolean {
  const similarity = calculatePhoneNumberSimilarity(number1, number2);
  return similarity >= threshold;
}

/**
 * Encontra o número mais similar em uma lista
 * @param targetNumber Número alvo
 * @param numberList Lista de números para comparar
 * @param threshold Limiar mínimo de similaridade (padrão: 70%)
 * @returns Objeto com o número mais similar e sua similaridade
 */
export function findMostSimilarNumber(
  targetNumber: string,
  numberList: string[],
  threshold = 70
): { number: string; similarity: number } | null {
  let bestMatch: { number: string; similarity: number } | null = null;

  numberList.forEach(number => {
    const similarity = calculatePhoneNumberSimilarity(targetNumber, number);

    if (
      similarity >= threshold &&
      (!bestMatch || similarity > bestMatch.similarity)
    ) {
      bestMatch = { number, similarity };
    }
  });

  return bestMatch;
}

/**
 * Valida se um número de telefone tem o comprimento mínimo necessário
 * Agora usa libphonenumber-js para suportar números internacionais
 * @param number Número a ser validado
 * @returns true se o número é válido para processamento
 */
export function isValidPhoneNumber(number: string): boolean {
  if (!number || typeof number !== "string") {
    return false;
  }

  // Usa libphonenumber-js para validação internacional
  try {
    // Tenta validar sem país padrão (para números internacionais)
    // Se falhar, tenta com BR como padrão (para números brasileiros)
    return libIsPossiblePhoneNumber(number) || libIsPossiblePhoneNumber(number, "BR" as any);
  } catch (error) {
    // Fallback para validação básica se a biblioteca não estiver disponível
    const clean = number.replace(/\D/g, "");

    // Números brasileiros válidos devem ter pelo menos 10 dígitos (DDD + número)
    // ou 12 dígitos com código do país (55 + DDD + número)
    if (clean.length < 10) {
      return false;
    }

    // Se tem código do país (55), deve ter pelo menos 12 dígitos
    if (clean.startsWith("55") && clean.length < 12) {
      return false;
    }

    // Se não tem código do país, deve ter pelo menos 10 dígitos
    if (!clean.startsWith("55") && clean.length < 10) {
      return false;
    }

    return true;
  }
}

/**
 * Normaliza um número para comparação (remove formatação e 9)
 * EXCEÇÃO: Para DDD 11, o dígito 9 é obrigatório e NÃO deve ser removido
 * @param number Número a ser normalizado
 * @returns Número limpo sem o 9 (exceto DDD 11)
 */
export function normalizeForComparison(number: string): string {
  // Validação prévia: se o número não é válido, retorna como está
  if (!isValidPhoneNumber(number)) {
    return number;
  }

  const clean = number.replace(/\D/g, "");

  // Se não tem código do país, adiciona
  if (!clean.startsWith("55")) {
    const with55 = `55${clean}`;

    // EXCEÇÃO: Para DDD 11, mantém o 9
    if (with55.length === 13) {
      const ddd = with55.substring(2, 4);
      if (ddd === "11") {
        return with55; // Mantém o 9 para DDD 11
      }
      // Para outros DDDs, remove o 9
      return with55.substring(0, 4) + with55.substring(5);
    }

    return with55;
  }

  // Se tem 13 dígitos (55 + DDD + 9 + número)
  if (clean.length === 13) {
    const ddd = clean.substring(2, 4);
    // EXCEÇÃO: Para DDD 11, mantém o 9
    if (ddd === "11") {
      return clean; // Mantém o 9 para DDD 11
    }
    // Para outros DDDs, remove o 9
    return clean.substring(0, 4) + clean.substring(5);
  }

  // CORREÇÃO AUTOMÁTICA: Se é DDD 11 e tem 12 dígitos (sem 9), adiciona o 9
  if (clean.length === 12 && clean.startsWith("55")) {
    const ddd = clean.substring(2, 4);
    if (ddd === "11") {
      // Para DDD 11, adiciona o dígito 9 automaticamente
      return `${clean.substring(0, 4)}9${clean.substring(4)}`;
    }
  }

  return clean;
}

/**
 * Gera variações de um número para busca (com e sem 9)
 * EXCEÇÃO: Para DDD 11, só considera versão com 9
 * @param number Número base
 * @returns Array com variações
 */
export function generateNumberVariations(number: string): string[] {
  const clean = normalizeForComparison(number);
  const variations = [clean];

  // Verifica se é DDD 11
  const ddd = clean.length >= 4 ? clean.substring(2, 4) : "";

  if (ddd === "11") {
    // Para DDD 11, só considera versão com 9 (obrigatório)
    if (clean.length === 12 && clean.startsWith("55")) {
      const with9 = `${clean.substring(0, 4)}9${clean.substring(4)}`;
      variations.push(with9);
    }
  } else if (clean.length === 12 && clean.startsWith("55")) {
    // Para outros DDDs, se tem 12 dígitos (sem 9), adiciona versão com 9
    const with9 = `${clean.substring(0, 4)}9${clean.substring(4)}`;
    variations.push(with9);
  }

  return [...new Set(variations)]; // Remove duplicatas
}

export default {
  calculatePhoneNumberSimilarity,
  arePhoneNumbersSimilar,
  findMostSimilarNumber,
  normalizeForComparison,
  generateNumberVariations,
  isValidPhoneNumber
};
