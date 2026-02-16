import request from 'src/service/request'

export function enviarMensagem (data) {
  // Se data é FormData, configurar headers adequados
  const isFormData = data instanceof FormData

  return request({
    url: '/internal-chat/messages',
    method: 'post',
    data,
    headers: isFormData ? {
      'Content-Type': 'multipart/form-data'
    } : undefined
  })
}

export function listarMensagens (params) {
  return request({
    url: '/internal-chat/messages',
    method: 'get',
    params
  })
}

export function listarConversas () {
  return request({
    url: '/internal-chat/chats',
    method: 'get'
  })
}

export function marcarComoLida (data) {
  return request({
    url: '/internal-chat/messages/read',
    method: 'patch',
    data
  })
}

export function listarContatos () {
  return request({
    url: '/internal-chat/contacts',
    method: 'get'
  })
}
