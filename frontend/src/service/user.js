import request from 'src/service/request'

export function ListarUsuarios (params) {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

export function CriarUsuario (data) {
  return request({
    url: '/users',
    method: 'post',
    data
  })
}

export function UpdateUsuarios (userId, data) {
  return request({
    url: `/users/${userId}`,
    method: 'put',
    data
  })
}

export function UpdateConfiguracoesUsuarios (userId, data) {
  return request({
    url: `/users/${userId}/configs`,
    method: 'put',
    data
  })
}

export function DadosUsuario (userId) {
  return request({
    url: `/users/${userId}`,
    method: 'get'
  })
}

export function DeleteUsuario (userId) {
  return request({
    url: `/users/${userId}`,
    method: 'delete'
  })
}

export function MarcarUsuarioInativo (userId, data) {
  return request({
    url: `/users/${userId}/inactive`,
    method: 'put',
    data
  })
}

export function ReativarUsuario (userId) {
  return request({
    url: `/users/${userId}/active`,
    method: 'put'
  })
}

export function VerificarPodeSerInativado (userId) {
  return request({
    url: `/users/${userId}/check-inactive`,
    method: 'get'
  })
}

/** Convite: validar token (rota pública). */
export function ValidarTokenConvite (token) {
  return request({
    url: '/auth/invite/validate',
    method: 'get',
    params: { token }
  })
}

/** Convite: aceitar e definir nome/senha (rota pública). */
export function AceitarConvite (data) {
  return request({
    url: '/auth/invite/accept',
    method: 'post',
    data
  })
}
