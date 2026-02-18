/**
 * Formata número de telefone para exibição na interface.
 * Mantém o valor no banco como dígitos (para API/WhatsApp); aqui só a apresentação.
 * Brasil: +55 (XX) 9XXXX-XXXX | EUA/Canadá: +1 XXX XXX XXXX | Outros: +XXX...
 * @param {string} raw - Número (só dígitos ou com +)
 * @returns {string} Número formatado para exibir, ou o próprio valor se não parecer telefone
 */
export function formatPhoneDisplay (raw) {
  if (raw == null || typeof raw !== 'string') return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return raw

  // Brasil: 55 + DDD (2) + 9 + 8 dígitos = 13, ou 55 + DDD + 8 = 12
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4)
    const rest = digits.slice(4)
    if (rest.length === 9 && rest.charAt(0) === '9') {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`
    }
    if (rest.length === 8) {
      return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`
    }
    return `+55 (${ddd}) ${rest}`
  }

  // EUA/Canadá ou LID que começa com 1: 1 + N dígitos (10–14)
  if (digits.startsWith('1') && digits.length >= 11) {
    const after = digits.slice(1)
    if (after.length === 10) {
      return `+1 ${after.slice(0, 3)} ${after.slice(3, 6)} ${after.slice(6, 10)}`
    }
    // 11–14 dígitos após 1: agrupar de 3 em 3 para legibilidade
    const parts = after.match(/.{1,3}/g) || []
    return `+1 ${parts.join(' ')}`
  }

  // Outros países: + e grupos de 3 dígitos
  if (digits.length >= 10) {
    const hasPlus = raw.trim().startsWith('+')
    const grouped = digits.replace(/(\d{3})(?=\d)/g, '$1 ')
    return (hasPlus ? '' : '+') + grouped
  }

  return raw
}

export default formatPhoneDisplay
