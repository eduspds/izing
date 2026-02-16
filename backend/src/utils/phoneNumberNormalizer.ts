/**
 * Utilitário para normalização de números de telefone brasileiros
 * Remove o dígito 9 e adiciona o código do país (55) quando necessário
 * Compatível com WhatsApp que não funciona com o 9
 * Agora detecta números internacionais e não os modifica
 */

import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

export interface NormalizedNumber {
  normalized: string;
  original: string;
  hasChanges: boolean;
}

/**
 * Normaliza um número de telefone brasileiro
 * Remove o dígito 9 e adiciona o 55 quando necessário
 * EXCEÇÃO: Para DDD 11, o dígito 9 é obrigatório e NÃO deve ser removido
 * Números internacionais não são modificados
 */
export const normalizePhoneNumber = (phoneNumber: string | number): NormalizedNumber => {
  if (!phoneNumber) {
    return {
      normalized: String(phoneNumber || ""),
      original: String(phoneNumber || ""),
      hasChanges: false
    };
  }

  // Converte para string se for número
  const phoneStr = String(phoneNumber);

  // Remove espaços e hífens, mas mantém + para números internacionais
  const cleaned = phoneStr.replace(/\s+/g, "").replace(/-/g, "");

  // Verifica se é número internacional (começa com + ou tem código diferente de 55)
  const isInternational = cleaned.startsWith("+") || 
    (cleaned.match(/^\d+/) && !cleaned.match(/^55\d{10,11}$/));

  // Se for número internacional, tenta normalizar com libphonenumber-js
  if (isInternational) {
    try {
      const parsed = parsePhoneNumberFromString(cleaned);
      if (parsed && parsed.country !== "BR") {
        // É número internacional válido, retorna sem modificar
        return {
          normalized: parsed.number, // Formato E.164 (+...)
          original: phoneStr,
          hasChanges: cleaned !== phoneStr
        };
      }
      // Se parseou mas é BR, continua com lógica brasileira abaixo
    } catch {
      // Se não conseguir fazer parse, continua com lógica brasileira
    }
  }

  // Remove todos os caracteres não numéricos para números brasileiros
  let cleanNumber = cleaned.replace(/\D/g, "");
  const originalNumber = cleanNumber;

  // Verifica se já é número internacional (não começa com 55 e tem mais de 10 dígitos)
  // ou se começa com código de país diferente de 55
  if (cleanNumber.length > 12 && !cleanNumber.startsWith("55")) {
    // Provavelmente é número internacional, retorna sem modificar
    return {
      normalized: cleaned.startsWith("+") ? cleaned : `+${cleanNumber}`,
      original: phoneStr,
      hasChanges: cleaned !== phoneStr
    };
  }

  // Se não tem código do país, adiciona (apenas para números brasileiros)
  if (!cleanNumber.startsWith("55")) {
    // Verifica se não é número internacional tentando fazer parse
    try {
      const parsed = parsePhoneNumberFromString(cleanNumber);
      if (parsed && parsed.country && parsed.country !== "BR") {
        // É número internacional, retorna sem modificar
        return {
          normalized: parsed.number,
          original: phoneStr,
          hasChanges: cleaned !== phoneStr
        };
      }
    } catch {
      // Continua com lógica brasileira
    }
    cleanNumber = "55" + cleanNumber;
  }

  // Se tem menos de 12 dígitos (55 + DDD + número), não é válido
  if (cleanNumber.length < 12) {
    return {
      normalized: originalNumber,
      original: phoneStr,
      hasChanges: false
    };
  }

  // Se tem 13 dígitos (55 + DDD + 9 + número)
  if (cleanNumber.length === 13) {
    const ddd = cleanNumber.substring(2, 4);
    
    // EXCEÇÃO: Para DDD 11, mantém o 9 (obrigatório)
    if (ddd === '11') {
      return {
        normalized: cleanNumber,
        original: phoneStr,
        hasChanges: cleanNumber !== originalNumber
      };
    }
    
    // Para outros DDDs, remove o 9
    const numberWithout9 = cleanNumber.substring(0, 4) + cleanNumber.substring(5);
    
    return {
      normalized: numberWithout9,
      original: phoneStr,
      hasChanges: true
    };
  }

  // Se tem 12 dígitos, verifica se precisa de correção para DDD 11
  if (cleanNumber.length === 12) {
    const ddd = cleanNumber.substring(2, 4);
    
    // CORREÇÃO AUTOMÁTICA: Se é DDD 11, adiciona o dígito 9
    if (ddd === '11') {
      const correctedNumber = `${cleanNumber.substring(0, 4)}9${cleanNumber.substring(4)}`;
      return {
        normalized: correctedNumber,
        original: phoneStr,
        hasChanges: true
      };
    }
    
    return {
      normalized: cleanNumber,
      original: phoneStr,
      hasChanges: cleanNumber !== originalNumber
    };
  }

  return {
    normalized: cleanNumber,
    original: phoneStr,
    hasChanges: cleanNumber !== originalNumber
  };
};

/**
 * Normaliza um número para busca no banco de dados
 * Tenta encontrar o contato com ou sem o dígito 9
 * EXCEÇÃO: Para DDD 11, só considera versão com 9
 */
export const normalizeForSearch = (phoneNumber: string): string[] => {
  const normalized = normalizePhoneNumber(phoneNumber);
  const variations: string[] = [normalized.normalized];

  const cleanOriginal = phoneNumber.replace(/\D/g, '');
  
  // Verifica se é DDD 11
  const ddd = cleanOriginal.length >= 4 ? cleanOriginal.substring(2, 4) : 
              (cleanOriginal.length >= 2 ? cleanOriginal.substring(0, 2) : '');
  
  if (ddd === '11') {
    // Para DDD 11, só considera versão com 9 (obrigatório)
    if (cleanOriginal.length === 12 && cleanOriginal.startsWith('55')) {
      const with9 = cleanOriginal.substring(0, 4) + '9' + cleanOriginal.substring(4);
      variations.push(with9);
    }
  } else {
    // Para outros DDDs, busca com e sem 9
    // Se o número original tem 13 dígitos (com 9), também busca a versão sem 9
    if (cleanOriginal.length === 13 && cleanOriginal.startsWith('55')) {
      const without9 = cleanOriginal.substring(0, 4) + cleanOriginal.substring(5);
      variations.push(without9);
    }

    // Se o número original tem 12 dígitos (sem 9), também busca a versão com 9
    if (cleanOriginal.length === 12 && cleanOriginal.startsWith('55')) {
      const with9 = cleanOriginal.substring(0, 4) + '9' + cleanOriginal.substring(4);
      variations.push(with9);
    }
  }

  return [...new Set(variations)]; // Remove duplicatas
};

/**
 * Verifica se dois números são equivalentes (mesmo número com/sem 9)
 * EXCEÇÃO: Para DDD 11, ambos devem ter o 9 para serem equivalentes
 */
export const areEquivalentNumbers = (number1: string, number2: string): boolean => {
  const normalized1 = normalizePhoneNumber(number1).normalized;
  const normalized2 = normalizePhoneNumber(number2).normalized;
  
  // Se são idênticos após normalização, são equivalentes
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Verifica se ambos são DDD 11
  const ddd1 = normalized1.length >= 4 ? normalized1.substring(2, 4) : '';
  const ddd2 = normalized2.length >= 4 ? normalized2.substring(2, 4) : '';
  
  if (ddd1 === '11' && ddd2 === '11') {
    // Para DDD 11, ambos devem ter 13 dígitos (com 9) para serem equivalentes
    return normalized1.length === 13 && normalized2.length === 13;
  }
  
  return false;
};

export default {
  normalizePhoneNumber,
  normalizeForSearch,
  areEquivalentNumbers
};
