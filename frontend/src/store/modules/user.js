import { RealizarLogin } from '../../service/login'
import { Notify, Dark } from 'quasar'
import Router from 'src/router/index'
// import { sessaolog } from 'src/service/sessaolog'
import socketManager from 'src/utils/socket' // ✅ IMPORT CORRETO

// ✅ USAR INSTÂNCIA ÚNICA
const socket = socketManager.getSocket()

const pesquisaTicketsFiltroPadrao = {
  searchParam: '',
  pageNumber: 1,
  status: ['open', 'pending'],
  showAll: false,
  count: null,
  queuesIds: [],
  withUnreadMessages: false,
  isNotAssignedUser: false,
  includeNotQueueDefined: true
  // date: new Date(),
}

const user = {
  state: {
    token: null,
    isAdmin: false,
    isManager: false,
    isSuporte: false,
    tenantId: null,
    userQueues: []
  },

  mutations: {
    SET_IS_SUPORTE (state, payload) {
      const domains = ['@izing.io']
      let authorized = false
      domains.forEach(domain => {
        if (payload?.email.toLocaleLowerCase().indexOf(domain.toLocaleLowerCase()) !== -1) {
          authorized = true
        }
      })
      state.isSuporte = authorized
    },

    SET_IS_ADMIN (state, payload) {
      state.isAdmin = !!(state.isSuporte || payload?.profile === 'admin')
    },

    SET_IS_MANAGER (state, payload) {
      state.isManager = !!(payload.profile === 'manager')
    },

    SET_TENANT_ID (state, tenantId) {
      state.tenantId = tenantId
    },

    SET_USER_QUEUES (state, queues) {
      state.userQueues = queues || []
    }
  },

  getters: {
    userQueues: state => state.userQueues.filter(q => q.isActive)
  },

  actions: {
    restoreUserState ({ commit }) {
      // Restaurar estado do usuário do localStorage
      const profile = localStorage.getItem('profile')
      const tenantId = localStorage.getItem('tenantId')
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
      const queues = JSON.parse(localStorage.getItem('queues') || '[]')

      if (profile) {
        commit('SET_IS_SUPORTE', usuario)
        commit('SET_IS_ADMIN', usuario)
        commit('SET_IS_MANAGER', usuario)
        commit('SET_USER_QUEUES', queues)
        if (tenantId) {
          commit('SET_TENANT_ID', tenantId)
        }

        // ✅ Verificar se o socket está conectado e emitir evento de usuário ativo
        const currentSocket = socketManager.getSocket()
        if (currentSocket.connected && tenantId) {
          console.log('🔌 Restaurando estado do usuário - emitindo setUserActive')
          currentSocket.emit(`${tenantId}:setUserActive`)
        }
      }
    },

    async UserLogin ({ commit, dispatch }, user) {
      user.email = user.email.trim()
      try {
        // await sessaolog()
        console.log('user: ', user)
        const response = await RealizarLogin(user)

        // Verificar se a resposta é válida
        if (!response || !response.data) {
          throw new Error('Resposta inválida do servidor')
        }

        const { data } = response

        // Salvar dados no localStorage
        localStorage.setItem('token', JSON.stringify(data.token))
        localStorage.setItem('username', data.username)
        localStorage.setItem('profile', data.profile)
        localStorage.setItem('userId', data.userId)
        localStorage.setItem('usuario', JSON.stringify(data))
        localStorage.setItem('queues', JSON.stringify(data.queues))
        localStorage.setItem('managerQueues', JSON.stringify(data.managerQueues || []))
        localStorage.setItem('filtrosAtendimento', JSON.stringify(pesquisaTicketsFiltroPadrao))

        if (data?.configs?.filtrosAtendimento) {
          localStorage.setItem('filtrosAtendimento', JSON.stringify(data.configs.filtrosAtendimento))
        }
        if (data?.configs?.isDark) {
          Dark.set(data.configs.isDark)
        }

        // Commit mutations
        commit('SET_IS_SUPORTE', data)
        commit('SET_IS_ADMIN', data)
        commit('SET_IS_MANAGER', data)
        commit('SET_TENANT_ID', data.tenantId)
        commit('SET_USER_QUEUES', data.queues)

        // ✅ Reinicializar socket com o novo token após login
        console.log('🔌 Login realizado - reinicializando socket com novo token')
        const newSocket = socketManager.reinitialize()

        // ✅ Usar socket singleton para emitir evento de usuário ativo
        console.log('🔌 Emitindo setUserActive para tenant:', data.tenantId)

        // Verificar se o socket está conectado antes de emitir
        if (newSocket.connected) {
          newSocket.emit(`${data.tenantId}:setUserActive`)
        } else {
          // Se não estiver conectado, esperar pela conexão e depois emitir
          newSocket.once('connect', () => {
            console.log('🔌 Socket conectado após login - emitindo setUserActive')
            newSocket.emit(`${data.tenantId}:setUserActive`)
          })
        }

        // Notificação de sucesso
        Notify.create({
          type: 'positive',
          message: 'Login realizado com sucesso!',
          position: 'top',
          progress: true
        })

        // Redirecionamento baseado no perfil
        if (data.profile === 'admin') {
          Router.push({
            name: 'home-dashboard'
          })
        } else {
          Router.push({
            name: 'atendimento'
          })
        }
      } catch (error) {
        console.error('Erro no login:', error)

        // Tratar diferentes tipos de erro
        const errorMessage = error?.response?.data?.error || error?.data?.error || error?.message || 'Erro ao realizar login'
        const errorData = error?.response?.data || error?.data || {}

        if (errorData.error === 'ERROR_NO_PERMISSION_API_ADMIN') {
          Notify.create({
            type: 'negative',
            message: 'Instalação não AUTORIZADA, entre em contato com Grupo Izing Pro - https://grupo.izing.app',
            caption: 'ERROR_NO_PERMISSION_API_ADMIN',
            position: 'top',
            progress: true
          })
        } else {
          // Mostrar mensagem de erro mais específica
          let message = 'Erro ao realizar login. Verifique suas credenciais.'

          if (errorMessage && errorMessage !== 'Erro ao realizar login') {
            message = errorMessage
          } else if (error?.response?.status === 401) {
            message = 'Credenciais inválidas. Verifique seu email e senha.'
          } else if (error?.response?.status === 403) {
            message = 'Acesso negado. Verifique suas permissões.'
          } else if (error?.response?.status === 500) {
            message = 'Erro no servidor. Tente novamente mais tarde.'
          } else if (error?.message?.indexOf('timeout') > -1 || error?.code === 'ECONNABORTED') {
            message = 'Tempo de conexão esgotado. Verifique sua internet e tente novamente.'
          } else if (error?.message?.indexOf('Network Error') > -1 || error?.message?.indexOf('ERR_NETWORK') > -1) {
            message = 'Erro de conexão. Verifique sua internet e tente novamente.'
          } else if (!error?.response && !error?.data) {
            message = 'Não foi possível conectar ao servidor. Verifique sua conexão.'
          }

          Notify.create({
            type: 'negative',
            message: message,
            position: 'top',
            progress: true,
            timeout: 5000
          })
        }
      }
    },

    // ✅ AÇÃO ADICIONAL: Para logout (se necessário)
    async UserLogout ({ commit, dispatch }) {
      const tenantId = localStorage.getItem('tenantId')
      dispatch('permissions/clearPermissions', null, { root: true })
      // ✅ Emitir evento de usuário idle antes de limpar
      if (socket.connected && tenantId) {
        console.log('🔌 Logout - emitindo setUserIdle')
        socket.emit(`${tenantId}:setUserIdle`)
      }

      // Limpar localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('profile')
      localStorage.removeItem('userId')
      localStorage.removeItem('usuario')
      localStorage.removeItem('queues')
      localStorage.removeItem('managerQueues')
      localStorage.removeItem('filtrosAtendimento')

      // Resetar estado no Vuex
      commit('SET_IS_SUPORTE', {})
      commit('SET_IS_ADMIN', {})
      commit('SET_IS_MANAGER', {})
      commit('SET_TENANT_ID', null)
      commit('SET_USER_QUEUES', [])

      // ❌ NÃO desconectar o socket global aqui!
      // Deixa o singleton gerenciar a conexão
    }
  }
}

export default user
