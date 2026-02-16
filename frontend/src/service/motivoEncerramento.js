import request from 'src/service/request'

export function ListarMotivosEncerramento () {
  return request({
    url: '/end-conversations',
    method: 'get'
  })
}

export function CriarMotivoEncerramento (data) {
  return request({
    url: '/end-conversations',
    method: 'post',
    data
  })
}

export function AtualizarMotivoEncerramento (endConversationId, data) {
  return request({
    url: `/end-conversations/${endConversationId}`,
    method: 'put',
    data
  })
}

export function DeletarMotivoEncerramento (endConversationId) {
  return request({
    url: `/end-conversations/${endConversationId}`,
    method: 'delete'
  })
}

export function ListarUnicoMotivoEncerramento (endConversationId) {
  return request({
    url: `/end-conversations/${endConversationId}`,
    method: 'get'
  })
}
