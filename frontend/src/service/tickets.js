import request from 'src/service/request'

export function ConsultarTickets (params) {
  return request({
    url: '/tickets',
    method: 'get',
    params
  })
}

export function ConsultarDadosTicket (params) {
  return request({
    url: `/tickets/${params.id}`,
    method: 'get',
    params
  })
}

export function ConsultarLogsTicket (params) {
  return request({
    url: `/tickets/${params.ticketId}/logs`,
    method: 'get',
    params
  })
}

export function AtualizarStatusTicket (ticketId, status, userId, extra = {}) {
  const data = { status }

  if (typeof userId === 'object' && userId !== null) {
    Object.assign(data, userId)
  } else {
    if (userId !== undefined) {
      data.userId = userId
    }
    Object.assign(data, extra)
  }

  return request({
    url: `/tickets/${ticketId}`,
    method: 'put',
    data
  })
}

export function AtualizarTicket (ticketId, data) {
  return request({
    url: `/tickets/${ticketId}`,
    method: 'put',
    data
  })
}

export function LocalizarMensagens (params) {
  return request({
    url: `/messages/${params.ticketId}`,
    method: 'get',
    params
  })
}

export function AtivarSigilo (ticketId, password) {
  return request({
    url: `/tickets/${ticketId}/activate-confidential`,
    method: 'post',
    data: { password }
  })
}

export function DesativarSigilo (ticketId, password) {
  return request({
    url: `/tickets/${ticketId}/deactivate-confidential`,
    method: 'post',
    data: { password }
  })
}

export function ExibirMensagensSigilosas (ticketId, password) {
  return request({
    url: `/tickets/${ticketId}/show-confidential`,
    method: 'post',
    data: { password }
  })
}

export function EnviarMensagemTexto (ticketId, data) {
  return request({
    url: `/messages/${ticketId}`,
    method: 'post',
    data
  })
}

export function EncaminharMensagem (messages, contato) {
  const data = {
    messages,
    contact: contato
  }
  return request({
    url: '/forward-messages/',
    method: 'post',
    data
  })
}

export function EditarMensagem (mensagem) {
  return request({
    url: `/messages/${mensagem.messageId}`,
    method: 'put',
    data: mensagem
  })
}

export function DeletarMensagem (mensagem) {
  return request({
    url: `/messages/${mensagem.messageId}`,
    method: 'delete',
    data: mensagem
  })
}

export function CriarTicket (data) {
  return request({
    url: '/tickets',
    method: 'post',
    data
  })
}

export function ConsultarTicketsRelatorio (params) {
  const finalParams = {
    ...params,
    page: params.page || 1,
    pageSize: params.pageSize || 50
  }

  return request({
    url: '/tickets-report',
    method: 'get',
    params: finalParams
  })
}
