import request from 'src/service/request'

/** Permissões do usuário logado (para menu e v-can). */
export function getMyPermissions () {
  return request({
    url: '/permissions/me',
    method: 'get'
  })
}

/** Lista todas as permissões do sistema (tela de gestão). */
export function listPermissions () {
  return request({
    url: '/permissions',
    method: 'get'
  })
}

/** Lista usuários do tenant (para tela de permissões). */
export function listUsers (params = {}) {
  return request({
    url: '/permissions/users',
    method: 'get',
    params: { searchParam: params.searchParam || '', pageNumber: params.pageNumber || '1' }
  })
}

/** Retorna um usuário com suas permissões. */
export function getUserPermissions (userId) {
  return request({
    url: `/permissions/users/${userId}`,
    method: 'get'
  })
}

/** Atualiza as permissões de um usuário. permissionIds: number[] */
export function updateUserPermissions (userId, permissionIds) {
  return request({
    url: `/permissions/users/${userId}`,
    method: 'put',
    data: { permissionIds }
  })
}
