/**
 * Validação de dados capturados pelo ChatFlow (etapas "Aguardar Entrada de Dados").
 * Usado para validar e normalizar valores antes de persistir no contato.
 */

export type ValidationType = "date" | "email" | "number" | "text";

export interface ValidationResult {
  valid: boolean;
  value?: string;
  error?: string;
}

const DD_MM_YYYY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const DD_MM = /^(\d{1,2})\/(\d{1,2})$/;

/**
 * Valida e normaliza data no formato DD/MM ou DD/MM/AAAA.
 * Retorna valor no formato ISO (YYYY-MM-DD) para persistência.
 * Ano opcional: se só DD/MM, usa ano atual para o banco (útil para aniversário).
 */
export function validateDate(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Data não informada." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Data não informada." };
  }
  // Rejeitar respostas que claramente não são datas
  const lower = trimmed.toLowerCase();
  if (
    lower.length < 5 ||
    /^(não|nao|não quero|nao quero|não sei|nao sei|prefiro não|prefiro nao|recuso|skip|pular)/.test(
      lower
    )
  ) {
    return { valid: false, error: "Por favor, informe uma data no formato DD/MM ou DD/MM/AAAA (ex: 20/10/1995)." };
  }

  let day: number;
  let month: number;
  let year: number;

  const fullMatch = trimmed.match(DD_MM_YYYY);
  const shortMatch = trimmed.match(DD_MM);

  if (fullMatch) {
    day = parseInt(fullMatch[1], 10);
    month = parseInt(fullMatch[2], 10);
    year = parseInt(fullMatch[3], 10);
  } else if (shortMatch) {
    day = parseInt(shortMatch[1], 10);
    month = parseInt(shortMatch[2], 10);
    year = new Date().getFullYear();
  } else {
    return { valid: false, error: "Formato inválido. Use DD/MM ou DD/MM/AAAA (ex: 20/10/1995)." };
  }

  if (month < 1 || month > 12) {
    return { valid: false, error: "Mês inválido. Use um valor entre 01 e 12." };
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { valid: false, error: `Dia inválido para o mês. Use um valor entre 01 e ${daysInMonth}.` };
  }
  if (year < 1900 || year > 2100) {
    return { valid: false, error: "Ano inválido. Use um valor entre 1900 e 2100." };
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const value = `${year}-${pad(month)}-${pad(day)}`;
  return { valid: true, value };
}

/**
 * Valida e-mail.
 */
export function validateEmail(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "E-mail não informado." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "E-mail não informado." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "E-mail inválido. Exemplo: nome@email.com" };
  }
  return { valid: true, value: trimmed };
}

/**
 * Valida número (inteiro ou decimal).
 */
export function validateNumber(input: string): ValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Número não informado." };
  }
  const trimmed = input.trim().replace(/,/g, ".");
  if (trimmed.length === 0) {
    return { valid: false, error: "Número não informado." };
  }
  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    return { valid: false, error: "Valor inválido. Informe um número." };
  }
  return { valid: true, value: trimmed };
}

/** Limites de segurança para entrada de dados */
export const MAX_LENGTH_NAME = 200;
export const MAX_LENGTH_EMAIL = 254;
export const MAX_LENGTH_TEXT = 500;
export const MAX_LENGTH_CUSTOM_FIELD = 500;

/**
 * Sanitiza texto: trim, colapsa espaços múltiplos, limita tamanho.
 */
function sanitizeText(value: string, maxLength: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Texto livre: aceita qualquer string não vazia (após trim), com limite de tamanho e sanitização.
 */
export function validateText(
  input: string,
  options?: { maxLength?: number }
): ValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Texto não informado." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Texto não informado." };
  }
  const maxLen = options?.maxLength ?? MAX_LENGTH_TEXT;
  if (trimmed.length > maxLen) {
    return {
      valid: false,
      error: `Texto muito longo. Use no máximo ${maxLen} caracteres.`
    };
  }
  const value = sanitizeText(input, maxLen);
  return { valid: true, value };
}

/**
 * Opções para validateInput (segurança e campo alvo).
 */
export interface ValidateInputOptions {
  /** Campo alvo: name, email ou custom – define limite e mensagens */
  targetField?: "name" | "email" | string;
  /** Limite máximo de caracteres para texto (sobrescreve o do targetField) */
  maxLength?: number;
}

/**
 * Dispara a validação conforme o tipo e retorna resultado padronizado.
 * Aplica limites de segurança quando targetField ou maxLength são informados.
 */
export function validateInput(
  input: string,
  type: ValidationType,
  options?: ValidateInputOptions
): ValidationResult {
  const targetField = options?.targetField;
  const maxLength =
    options?.maxLength ??
    (targetField === "name"
      ? MAX_LENGTH_NAME
      : targetField === "email"
        ? MAX_LENGTH_EMAIL
        : type === "text"
          ? MAX_LENGTH_TEXT
          : undefined);

  switch (type) {
    case "date":
      return validateDate(input);
    case "email":
      return validateEmail(input);
    case "number":
      return validateNumber(input);
    case "text":
    default:
      return validateText(input, { maxLength: maxLength ?? MAX_LENGTH_TEXT });
  }
}
