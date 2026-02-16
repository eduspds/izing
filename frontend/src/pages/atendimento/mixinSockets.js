const usuario = JSON.parse(localStorage.getItem('usuario'))
import Router from 'src/router/index'
import checkTicketFilter from 'src/utils/checkTicketFilter'
import { getSocket } from 'src/utils/socket' // ✅ IMPORT CORRETO

// ✅ USAR INSTÂNCIA ÚNICA
const socket = getSocket()

const userId = +localStorage.getItem('userId')

// localStorage.debug = '*'

socket.on(`tokenInvalid:${socket.id}`, () => {
  // ✅ NÃO desconectar o socket global aqui - apenas limpar localStorage e redirecionar
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('profile')
  localStorage.removeItem('userId')
  localStorage.removeItem('usuario')
  setTimeout(() => {
    Router.push({
      name: 'login'
    })
  }, 1000)
})

export default {
  data () {
    return {
      socketListeners: [] // ✅ NOVO: Controlar listeners
    }
  },

  methods: {
    scrollToBottom () {
      setTimeout(() => {
        this.$root.$emit('scrollToBottomMessageChat')
      }, 200)
    },

    socketMessagesList () {
      // Método vazio - pode ser implementado se necessário
    },

    socketTicket () {
      console.log('🔌 Configurando socketTicket listeners')

      // ✅ Limpar listeners antigos
      this.cleanupSocketListeners('ticket')

      const ticketListener = (data) => {
        if (data.action === 'update' && data.ticket.userId === userId) {
          if (data.ticket.status === 'open' && !data.ticket.isTransference) {
            // Atualizar ticket focado preservando showConfidentialMessages
            const currentTicket = this.$store.getters.ticketFocado
            const updatedTicket = {
              ...data.ticket,
              // Preservar showConfidentialMessages se já estiver setado
              showConfidentialMessages: currentTicket?.showConfidentialMessages !== undefined
                ? currentTicket.showConfidentialMessages
                : (data.ticket.isConfidential && data.ticket.confidentialUserId === userId)
            }
            this.$store.commit('TICKET_FOCADO', updatedTicket)
          }
        }
      }

      socket.on(`${usuario.tenantId}:ticket`, ticketListener)
      this.socketListeners.push({
        event: `${usuario.tenantId}:ticket`,
        handler: ticketListener,
        type: 'ticket'
      })
    },

    socketTicketList () {
      this.socketTicketListNew()
    },

    socketTicketListNew () {
      console.log('🔌 Configurando socketTicketListNew listeners')

      // ✅ Limpar listeners antigos
      this.cleanupSocketListeners('ticketList')

      const ticketListListener = async (data) => {
        if (data.type === 'chat:create') {
          // Para áudios/mídias, adicionar pequeno delay antes de atualizar
          const isMedia = data.payload.mediaType && data.payload.mediaType !== 'chat'

          if (isMedia) {
            console.log('Mensagem de mídia recebida, aguardando 300ms...', data.payload.mediaType)
            await new Promise(resolve => setTimeout(resolve, 300))
          }

          // Sempre atualizar mensagens do ticket focado, independente de quem enviou
          this.$store.commit('UPDATE_MESSAGES', data.payload)
          this.scrollToBottom()

          // ✅ NOVO: Atualizar ticket na paginação quando recebe nova mensagem
          // Criar objeto de ticket atualizado com lastMessage e lastMessageAt
          // Garantir que lastMessageAt seja sempre um timestamp válido (número)
          let lastMessageAtValue = new Date().getTime() // Valor padrão: agora
          if (data.payload.timestamp) {
            lastMessageAtValue = typeof data.payload.timestamp === 'number'
              ? data.payload.timestamp
              : new Date(data.payload.timestamp).getTime()
          } else if (data.payload.createdAt) {
            lastMessageAtValue = typeof data.payload.createdAt === 'number'
              ? data.payload.createdAt
              : new Date(data.payload.createdAt).getTime()
          }
          // Se ainda for NaN, usar timestamp atual
          if (isNaN(lastMessageAtValue)) {
            console.warn('⚠️ [SOCKET] lastMessageAt inválido, usando timestamp atual:', {
              timestamp: data.payload.timestamp,
              createdAt: data.payload.createdAt,
              ticketLastMessageAt: data.payload.ticket?.lastMessageAt
            })
            lastMessageAtValue = new Date().getTime()
          }

          console.log('📨 [SOCKET] Nova mensagem recebida:', {
            ticketId: data.payload.ticket?.id,
            lastMessageAt: lastMessageAtValue,
            hasLastMessage: !!(data.payload.mediaName || data.payload.body)
          })

          const updatedTicket = {
            ...data.payload.ticket,
            lastMessage: data.payload.mediaName || data.payload.body || data.payload.ticket.lastMessage,
            lastMessageAt: lastMessageAtValue,
            updatedAt: new Date() // Atualizar updatedAt para garantir que vai para o topo
          }

          // Atualizar ticket na paginação (isso também move para o topo se necessário)
          this.updateTicketInPagination(updatedTicket)

          // Verificar se o usuário tem permissão para ver este ticket
          const currentUserId = +localStorage.getItem('userId')
          const userProfile = localStorage.getItem('profile')
          const isAdmin = userProfile === 'admin'

          // Se não for admin, verificar se o ticket pertence ao usuário ou se é de suas filas (userId null)
          let canViewTicket = isAdmin
          if (!isAdmin) {
            const isUserTicket = data.payload.ticket.userId === currentUserId
            const isUnassignedTicket = data.payload.ticket.userId === null || data.payload.ticket.userId === undefined

            // Verificar se o ticket pertence às filas do usuário (apenas para tickets não atribuídos)
            let isFromUserQueue = false
            if (isUnassignedTicket && data.payload.ticket.queueId) {
              const queues = JSON.parse(localStorage.getItem('queues') || '[]')
              isFromUserQueue = queues.some(q => q.id === data.payload.ticket.queueId)
            }

            canViewTicket = isUserTicket || isFromUserQueue
          }

          // Notificar apenas se for mensagem não lida de outro usuário/ticket E o usuário pode ver o ticket
          if (
            canViewTicket &&
            !data.payload.read &&
            (data.payload.ticket.userId === userId || !data.payload.ticket.userId) &&
            data.payload.ticket.id !== this.$store.getters.ticketFocado.id
          ) {
            if (checkTicketFilter(data.payload.ticket)) {
              this.handlerNotifications(data.payload)
            }

            // ✅ OTIMIZAÇÃO: Incrementar contador localmente ao invés de buscar do backend
            if (data.payload.ticket.status === 'open') {
              this.$store.commit('INCREMENT_NOTIFICATION_COUNT')
              console.log('✅ Contador de notificações incrementado localmente')
            }
          }
        }

        if (data.type === 'chat:ack' || data.type === 'chat:delete') {
          this.$store.commit('UPDATE_MESSAGE_STATUS', data.payload)
        }

        if (data.type === 'chat:edit') {
          this.$store.commit('UPDATE_MESSAGE_EDIT', data.payload)
        }

        if (data.type === 'ticket:update') {
          console.log('🔄 [WEBSOCKET] Recebida atualização de ticket:', {
            ticketId: data.payload.id,
            status: data.payload.status,
            lastMessageAt: data.payload.lastMessageAt,
            ticketFocadoId: this.$store.getters.ticketFocado.id,
            isTicketFocado: this.$store.getters.ticketFocado.id === data.payload.id
          })

          this.$store.commit('UPDATE_TICKET', data.payload)
          // Atualizar ticket na estrutura de paginação
          this.updateTicketInPagination(data.payload)

          console.log('✅ [WEBSOCKET] Ticket atualizado no store:', this.$store.getters.ticketFocado)
        }
      }

      const notificationListener = async (data) => {
        if (data.type === 'notification:new') {
          // Verificar se o usuário tem permissão para ver este ticket
          const currentUserId = +localStorage.getItem('userId')
          const userProfile = localStorage.getItem('profile')
          const isAdmin = userProfile === 'admin'

          // Se não for admin, verificar se o ticket pertence ao usuário ou se é de suas filas (userId null)
          let canViewTicket = isAdmin
          if (!isAdmin) {
            const isUserTicket = data.payload.userId === currentUserId
            const isUnassignedTicket = data.payload.userId === null || data.payload.userId === undefined

            // Verificar se o ticket pertence às filas do usuário (apenas para tickets não atribuídos)
            let isFromUserQueue = false
            if (isUnassignedTicket && data.payload.queueId) {
              const queues = JSON.parse(localStorage.getItem('queues') || '[]')
              isFromUserQueue = queues.some(q => q.id === data.payload.queueId)
            }

            canViewTicket = isUserTicket || isFromUserQueue
          }

          if (!canViewTicket) {
            console.log('🚫 [SOCKET] Notificação de ticket não pertence ao usuário nem às suas filas, ignorando:', {
              ticketId: data.payload.id,
              ticketUserId: data.payload.userId,
              ticketQueueId: data.payload.queueId,
              currentUserId,
              userQueues: JSON.parse(localStorage.getItem('queues') || '[]')
            })
            return
          }

          // ✅ OTIMIZAÇÃO: Incrementar contador localmente ao invés de buscar do backend
          const queues = JSON.parse(localStorage.getItem('queues') || '[]')

          // Se tem filas configuradas, verificar se o ticket pertence a alguma fila do usuário
          let shouldNotify = true
          if (queues.length > 0 && data.payload.queueId) {
            shouldNotify = queues.some(q => q.id === data.payload.queueId)
          }

          if (shouldNotify) {
            // Incrementar contador localmente
            this.$store.commit('INCREMENT_NOTIFICATION_PENDING_COUNT')
            console.log('✅ Contador de notificações pendentes incrementado localmente')

            // Exibir notificação
            const message = new self.Notification('Novo cliente pendente', {
              body: 'Cliente: ' + data.payload.contact.name,
              tag: 'simple-push-demo-notification'
            })
            console.log('📢 Notificação de ticket pendente:', message)
          }
        }
      }

      const contactListener = (data) => {
        this.$store.commit('UPDATE_CONTACT', data.payload)
      }

      // ✅ Registrar todos os listeners
      socket.on(`${usuario.tenantId}:ticketList`, ticketListListener)
      socket.on(`${usuario.tenantId}:ticketList`, notificationListener)
      socket.on(`${usuario.tenantId}:contactList`, contactListener)

      // ✅ Armazenar para cleanup
      this.socketListeners.push(
        { event: `${usuario.tenantId}:ticketList`, handler: ticketListListener, type: 'ticketList' },
        { event: `${usuario.tenantId}:ticketList`, handler: notificationListener, type: 'ticketList' },
        { event: `${usuario.tenantId}:contactList`, handler: contactListener, type: 'ticketList' }
      )

      console.log('✅ Listeners do socketTicketListNew configurados')
    },

    // ✅ NOVO MÉTODO: Limpeza seletiva de listeners
    cleanupSocketListeners (type = null) {
      console.log('🧹 Limpando listeners do socketTicket', type ? `do tipo: ${type}` : '')

      if (this.socketListeners && this.socketListeners.length > 0) {
        const listenersToRemove = type
          ? this.socketListeners.filter(listener => listener.type === type)
          : this.socketListeners

        listenersToRemove.forEach(({ event, handler }) => {
          socket.off(event, handler)
          console.log(`🗑️ Listener removido: ${event}`)
        })

        // Atualizar a lista mantendo apenas os listeners que não foram removidos
        if (type) {
          this.socketListeners = this.socketListeners.filter(listener => listener.type !== type)
        } else {
          this.socketListeners = []
        }
      }
    },

    updateTicketInPagination (updatedTicket) {
      // Verificar se o usuário tem permissão para ver este ticket
      const currentUserId = +localStorage.getItem('userId')
      const userProfile = localStorage.getItem('profile')
      const isAdmin = userProfile === 'admin'

      // Se não for admin, verificar se o ticket pertence ao usuário ou se é de suas filas (userId null)
      if (!isAdmin) {
        const isUserTicket = updatedTicket.userId === currentUserId
        const isUnassignedTicket = updatedTicket.userId === null || updatedTicket.userId === undefined

        // Verificar se o ticket pertence às filas do usuário (apenas para tickets não atribuídos)
        let isFromUserQueue = false
        if (isUnassignedTicket && updatedTicket.queueId) {
          const queues = JSON.parse(localStorage.getItem('queues') || '[]')
          isFromUserQueue = queues.some(q => q.id === updatedTicket.queueId)
        }

        if (!isUserTicket && !isFromUserQueue) {
          console.log('🚫 [SOCKET] Ticket não pertence ao usuário nem às suas filas, ignorando:', {
            ticketId: updatedTicket.id,
            ticketUserId: updatedTicket.userId,
            ticketQueueId: updatedTicket.queueId,
            currentUserId,
            userQueues: JSON.parse(localStorage.getItem('queues') || '[]')
          })
          return
        }
      }

      console.log('🔄 [SOCKET] Atualizando ticket em tempo real:', {
        id: updatedTicket.id,
        status: updatedTicket.status,
        isGroup: updatedTicket.isGroup,
        profilePicUrl: updatedTicket.profilePicUrl,
        name: updatedTicket.name,
        tags: updatedTicket.tags,
        contact: updatedTicket.contact,
        lastMessageAt: updatedTicket.lastMessageAt,
        updatedAt: updatedTicket.updatedAt,
        isTransference: updatedTicket.isTransference,
        userId: updatedTicket.userId
      })

      // Encontrar onde o ticket está atualmente
      let currentStatus = null
      let currentIndex = -1

      Object.keys(this.ticketsPagination).forEach(statusKey => {
        const pagination = this.ticketsPagination[statusKey]
        const ticketIndex = pagination.tickets.findIndex(t => t.id === updatedTicket.id)

        if (ticketIndex !== -1) {
          currentStatus = statusKey
          currentIndex = ticketIndex
        }
      })

      // Determinar o status de destino
      const targetStatus = this.getTargetStatusForTicket(updatedTicket)

      // Normalizar estrutura do ticket para manter consistência
      const normalizedTicket = this.normalizeTicketStructure(updatedTicket)

      // Se o ticket não mudou de status, apenas atualizar na posição atual
      if (currentStatus === targetStatus && currentIndex !== -1) {
        console.log(`🔄 [SOCKET] Atualizando ticket na mesma posição: ${targetStatus}`)

        // ✅ Preservar lastMessage do ticket existente se o update não trouxer
        const existingTicket = this.ticketsPagination[targetStatus].tickets[currentIndex]
        if (existingTicket && !normalizedTicket.lastMessage && existingTicket.lastMessage) {
          normalizedTicket.lastMessage = existingTicket.lastMessage
        }
        if (existingTicket && !normalizedTicket.lastMessageAt && existingTicket.lastMessageAt) {
          normalizedTicket.lastMessageAt = existingTicket.lastMessageAt
        }

        // Verificar se o ticket deve ir para o topo
        if (this.shouldTicketGoToTop(updatedTicket, currentStatus, targetStatus, existingTicket) && currentIndex > 0) {
          console.log('⬆️ [SOCKET] Ticket deve ir para o topo - movendo')
          // Remover da posição atual
          this.ticketsPagination[targetStatus].tickets.splice(currentIndex, 1)
          // Adicionar no topo
          this.ticketsPagination[targetStatus].tickets.unshift(normalizedTicket)
        } else {
          // Atualizar na posição atual
          this.$set(this.ticketsPagination[targetStatus].tickets, currentIndex, normalizedTicket)
        }

        this.updateGroupTickets()
        return
      }

      // Se mudou de status, remover do status atual e adicionar ao novo
      if (currentStatus && currentIndex !== -1) {
        console.log(`🗑️ [SOCKET] Removendo ticket do status: ${currentStatus}`)
        this.ticketsPagination[currentStatus].tickets.splice(currentIndex, 1)
        this.ticketsPagination[currentStatus].count = Math.max(0, this.ticketsPagination[currentStatus].count - 1)
      }

      // Adicionar ticket ao status correto
      if (targetStatus) {
        console.log(`➕ [SOCKET] Adicionando ticket ao status: ${targetStatus}`)

        // Verificar se o ticket deve ir para o topo
        if (this.shouldTicketGoToTop(updatedTicket, currentStatus, targetStatus, null)) {
          console.log('⬆️ [SOCKET] Ticket deve ir para o topo - adicionando no topo da lista')
          this.ticketsPagination[targetStatus].tickets.unshift(normalizedTicket)
        } else {
          // Usar push() para manter a ordem cronológica normal
          this.ticketsPagination[targetStatus].tickets.push(normalizedTicket)
        }

        this.ticketsPagination[targetStatus].count++

        // Atualizar contadores de grupos se necessário
        this.updateGroupTickets()
      }
    },

    getTargetStatusForTicket (ticket) {
      // Determinar qual status o ticket deve ir baseado no status e isGroup
      if (ticket.isGroup === true) {
        return 'group'
      } else {
        return ticket.status
      }
    },

    async updateGroupTickets () {
      // Recarregar tickets de grupos do backend se a aba de grupos estiver ativa
      if (this.selectedTab === 'group') {
        console.log('🔄 [SOCKET] Atualizando tickets de grupos via backend')
        await this.consultarTicketsPorStatus('group')
      }
    },

    normalizeTicketStructure (ticket) {
      // Normalizar estrutura do ticket para manter consistência com a estrutura da API
      const normalized = { ...ticket }

      // Se o ticket tem contact, extrair profilePicUrl e tags para o nível raiz
      if (ticket.contact) {
        normalized.profilePicUrl = ticket.contact.profilePicUrl || ticket.profilePicUrl
        normalized.name = ticket.contact.name || ticket.name
        normalized.tags = ticket.contact.tags || ticket.tags || []
      }

      // ✅ GARANTIR: Preservar lastMessage e lastMessageAt se existirem
      if (ticket.lastMessage) {
        normalized.lastMessage = ticket.lastMessage
      }
      if (ticket.lastMessageAt) {
        // Garantir que lastMessageAt seja um número (timestamp) válido
        let lastMessageAtValue
        if (typeof ticket.lastMessageAt === 'number') {
          lastMessageAtValue = ticket.lastMessageAt
        } else if (ticket.lastMessageAt instanceof Date) {
          lastMessageAtValue = ticket.lastMessageAt.getTime()
        } else {
          lastMessageAtValue = new Date(ticket.lastMessageAt).getTime()
        }
        // Se ainda for NaN, não definir lastMessageAt
        if (!isNaN(lastMessageAtValue)) {
          normalized.lastMessageAt = lastMessageAtValue
        }
      }

      return normalized
    },

    shouldAddTicketToPagination (ticket, statusKey) {
      // Verificar se o ticket deve ser adicionado à paginação específica
      if (statusKey === 'group') {
        return ticket.isGroup === true
      } else {
        return ticket.status === statusKey && !ticket.isGroup
      }
    },

    shouldTicketGoToTop (updatedTicket, currentStatus, targetStatus, existingTicket) {
      console.log('🔍 [SOCKET] Verificando se ticket deve ir para o topo:', {
        ticketId: updatedTicket.id,
        isTransference: updatedTicket.isTransference,
        currentStatus,
        targetStatus,
        lastMessageAt: updatedTicket.lastMessageAt,
        existingLastMessageAt: existingTicket?.lastMessageAt,
        updatedAt: updatedTicket.updatedAt
      })

      // Tickets transferidos sempre vão para o topo
      if (updatedTicket.isTransference === true || updatedTicket.isTransference === 1) {
        console.log('✅ [SOCKET] Ticket transferido - vai para o topo')
        return true
      }

      // Se mudou de status, verificar se deve ir para o topo
      if (currentStatus !== targetStatus) {
        // Tickets que mudam de pending para open (sendo atendidos) vão para o topo
        if (currentStatus === 'pending' && targetStatus === 'open') {
          console.log('✅ [SOCKET] Ticket sendo atendido - vai para o topo')
          return true
        }

        // Novos tickets pendentes vão para o topo
        if (targetStatus === 'pending' && !currentStatus) {
          console.log('✅ [SOCKET] Novo ticket pendente - vai para o topo')
          return true
        }

        // Novos tickets abertos (criados diretamente) vão para o topo
        if (targetStatus === 'open' && !currentStatus) {
          console.log('✅ [SOCKET] Novo ticket aberto - vai para o topo')
          return true
        }

        // Tickets que mudam de qualquer status para pending vão para o topo
        if (targetStatus === 'pending' && currentStatus && currentStatus !== 'pending') {
          console.log('✅ [SOCKET] Ticket retornando para pending - vai para o topo')
          return true
        }

        // Tickets que são encerrados vão para o topo
        if (targetStatus === 'closed' && currentStatus && currentStatus !== 'closed') {
          console.log('✅ [SOCKET] Ticket sendo encerrado - vai para o topo')
          return true
        }
      }

      // Se não mudou de status, só deve subir se tiver nova mensagem
      if (currentStatus === targetStatus) {
        // Se temos o ticket existente, comparar lastMessageAt
        if (existingTicket && existingTicket.lastMessageAt && updatedTicket.lastMessageAt) {
          const existingTime = typeof existingTicket.lastMessageAt === 'number'
            ? existingTicket.lastMessageAt
            : new Date(existingTicket.lastMessageAt).getTime()

          const updatedTime = typeof updatedTicket.lastMessageAt === 'number'
            ? updatedTicket.lastMessageAt
            : new Date(updatedTicket.lastMessageAt).getTime()

          // Se lastMessageAt não mudou, não deve subir
          if (!isNaN(existingTime) && !isNaN(updatedTime) && existingTime === updatedTime) {
            console.log('❌ [SOCKET] lastMessageAt não mudou - não vai para o topo')
            return false
          }
        }

        // Verificar se há nova mensagem recente
        if (updatedTicket.lastMessageAt) {
          const now = new Date().getTime()
          let lastMessageTime
          if (typeof updatedTicket.lastMessageAt === 'number') {
            lastMessageTime = updatedTicket.lastMessageAt
          } else if (updatedTicket.lastMessageAt instanceof Date) {
            lastMessageTime = updatedTicket.lastMessageAt.getTime()
          } else {
            lastMessageTime = new Date(updatedTicket.lastMessageAt).getTime()
          }

          // Se ainda for NaN, não considerar como nova mensagem
          if (isNaN(lastMessageTime)) {
            console.log('❌ [SOCKET] lastMessageAt inválido - não vai para o topo')
            return false
          }

          const timeDiff = Math.abs(now - lastMessageTime)
          console.log('🔍 [SOCKET] Verificando nova mensagem:', {
            now,
            lastMessageAt: updatedTicket.lastMessageAt,
            lastMessageTime,
            timeDiff,
            isRecent: timeDiff < 10000,
            hasLastMessage: !!updatedTicket.lastMessage
          })
          // Só considerar nova mensagem se for recente (últimos 10 segundos)
          if (timeDiff < 10000) {
            console.log('✅ [SOCKET] Ticket com nova mensagem - vai para o topo')
            return true
          }
        }
      }

      console.log('❌ [SOCKET] Ticket não vai para o topo - mantém ordem cronológica')
      return false
    }

    // ❌ REMOVIDO: socketDisconnect() - não desconectar o socket global
  },

  beforeDestroy () {
    // ✅ Limpar todos os listeners ao destruir o componente
    this.cleanupSocketListeners()
    console.log('🔌 socketTicket mixin destruído - listeners limpos')
  }

  // ❌ REMOVIDO: destroyed() lifecycle hook
}
