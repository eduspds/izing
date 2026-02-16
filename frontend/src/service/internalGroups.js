import request from 'src/service/request'

/**
 * Criar novo grupo
 */
export function criarGrupo (data) {
  return request({
    url: '/internal-groups',
    method: 'post',
    data
  })
}

/**
 * Listar grupos do usuário
 */
export function listarGrupos () {
  return request({
    url: '/internal-groups',
    method: 'get'
  })
}

/**
 * Adicionar membros ao grupo
 */
export function adicionarMembros (groupId, memberIds) {
  return request({
    url: `/internal-groups/${groupId}/members`,
    method: 'post',
    data: { memberIds }
  })
}

/**
 * Remover membro do grupo
 */
export function removerMembro (groupId, memberId) {
  return request({
    url: `/internal-groups/${groupId}/members/${memberId}`,
    method: 'delete'
  })
}

/**
 * Sair do grupo
 */
export function sairDoGrupo (groupId) {
  return request({
    url: `/internal-groups/${groupId}/leave`,
    method: 'post'
  })
}

/**
 * Atualizar grupo
 */
export function atualizarGrupo (groupId, data) {
  return request({
    url: `/internal-groups/${groupId}`,
    method: 'put',
    data
  })
}
