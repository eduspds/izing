import request from 'src/service/request'

/**
 * Gerar resumo de IA para um ticket
 */
export function generateAISummary (ticketId, messages) {
  return request({
    url: `/ai-summary/${ticketId}/generate`,
    method: 'post',
    data: {
      messages: messages.slice(0, 100) // Primeiras 100 mensagens
    }
  })
}

/**
 * Obter resumo existente de um ticket
 */
export function getAISummary (ticketId) {
  return request({
    url: `/ai-summary/${ticketId}`,
    method: 'get'
  })
}
