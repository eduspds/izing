import { getMyPermissions } from 'src/service/permissions'

/** Permissões concedidas por padrão a todos (dashboard, contatos, atendimento). */
const DEFAULT_PERMISSIONS = ['dashboard-all-view', 'contacts-access', 'atendimento-access']

const state = {
  list: [], // nomes das permissões do usuário logado
  loaded: false // true após primeira carga (para não esconder menu antes de carregar)
}

const mutations = {
  SET_PERMISSIONS (state, permissions) {
    state.list = Array.isArray(permissions) ? permissions : []
    state.loaded = true
  },
  CLEAR_PERMISSIONS (state) {
    state.list = []
    state.loaded = false
  }
}

const getters = {
  permissions: state => state.list,
  /** Retorna true se o usuário tem a permissão (ou é admin; backend já retorna todas para admin). */
  can: state => (permissionName) => {
    if (!permissionName) return false
    if (DEFAULT_PERMISSIONS.includes(permissionName)) return true
    return state.list.includes(permissionName)
  }
}

const actions = {
  async fetchPermissions ({ commit }) {
    try {
      const res = await getMyPermissions()
      const list = res?.data?.permissions || []
      commit('SET_PERMISSIONS', list)
      return list
    } catch (e) {
      commit('SET_PERMISSIONS', [])
      return []
    }
  },
  clearPermissions ({ commit }) {
    commit('CLEAR_PERMISSIONS')
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  getters,
  actions
}
