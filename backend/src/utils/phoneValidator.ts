/**
 * Utilitário de validação de números de telefone usando libphonenumber-js
 * Suporta números internacionais e brasileiros
 */

import {
  isValidPhoneNumber as libIsValidPhoneNumber,
  isPossiblePhoneNumber as libIsPossiblePhoneNumber,
  parsePhoneNumberFromString,
  CountryCode
} from "libphonenumber-js";

export interface PhoneValidationResult {
  isValid: boolean;
  isPossible: boolean;
  formatted?: string;
  country?: string;
  number?: string;
  error?: string;
}

/**
 * Valida um número de telefone (internacional ou nacional)
 * @param phoneNumber Número de telefone a ser validado
 * @param defaultCountry Código do país padrão (ex: 'BR', 'US'). Opcional.
 * @returns Resultado da validação
 */
export const validatePhoneNumber = (
  phoneNumber: string,
  defaultCountry?: CountryCode
): PhoneValidationResult => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return {
      isValid: false,
      isPossible: false,
      error: "Número de telefone inválido ou vazio"
    };
  }

  try {
    // Tenta fazer parse do número
    const parsed = parsePhoneNumberFromString(phoneNumber, defaultCountry);

    if (!parsed) {
      return {
        isValid: false,
        isPossible: false,
        error: "Não foi possível fazer parse do número de telefone"
      };
    }

    const isValid = parsed.isValid();
    const isPossible = parsed.isPossible();

    return {
      isValid,
      isPossible,
      formatted: parsed.formatInternational(),
      country: parsed.country,
      number: parsed.number
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erro ao validar número de telefone";
    return {
      isValid: false,
      isPossible: false,
      error: errorMessage
    };
  }
};

/**
 * Valida se um número de telefone é válido (validação estrita)
 * @param phoneNumber Número de telefone a ser validado
 * @param defaultCountry Código do país padrão. Opcional.
 * @returns true se o número é válido
 */
export const isValidPhoneNumber = (
  phoneNumber: string,
  defaultCountry?: CountryCode
): boolean => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return false;
  }

  try {
    return libIsValidPhoneNumber(phoneNumber, defaultCountry);
  } catch {
    return false;
  }
};

/**
 * Valida se um número de telefone é possível (validação de comprimento)
 * @param phoneNumber Número de telefone a ser validado
 * @param defaultCountry Código do país padrão. Opcional.
 * @returns true se o número é possível
 */
export const isPossiblePhoneNumber = (
  phoneNumber: string,
  defaultCountry?: CountryCode
): boolean => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return false;
  }

  try {
    return libIsPossiblePhoneNumber(phoneNumber, defaultCountry);
  } catch {
    return false;
  }
};

/**
 * Formata um número de telefone para formato internacional
 * @param phoneNumber Número de telefone a ser formatado
 * @param defaultCountry Código do país padrão. Opcional.
 * @returns Número formatado ou o número original se não puder ser formatado
 */
export const formatPhoneNumber = (
  phoneNumber: string,
  defaultCountry?: CountryCode
): string => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return phoneNumber;
  }

  try {
    const parsed = parsePhoneNumberFromString(phoneNumber, defaultCountry);
    if (parsed) {
      return parsed.formatInternational();
    }
  } catch {
    // Se não conseguir formatar, retorna o número original
  }

  return phoneNumber;
};

/**
 * Normaliza um número de telefone para formato E.164 (ex: +5511999999999)
 * @param phoneNumber Número de telefone a ser normalizado
 * @param defaultCountry Código do país padrão. Opcional.
 * @returns Número em formato E.164 ou null se não puder ser normalizado
 */
export const normalizePhoneNumberToE164 = (
  phoneNumber: string,
  defaultCountry?: CountryCode
): string | null => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return null;
  }

  try {
    const parsed = parsePhoneNumberFromString(phoneNumber, defaultCountry);
    if (parsed) {
      return parsed.number;
    }
  } catch {
    // Se não conseguir normalizar, retorna null
  }

  return null;
};

export default {
  validatePhoneNumber,
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  formatPhoneNumber,
  normalizePhoneNumberToE164
};
