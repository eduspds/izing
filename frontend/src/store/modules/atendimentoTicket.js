import { ConsultarDadosTicket, LocalizarMensagens } from 'src/service/tickets'
import { Notify } from 'quasar'
import $router from 'src/router'
import { orderBy } from 'lodash'
import { parseISO } from 'date-fns'
import Vue from 'vue'
import backendErrors from 'src/service/erros'

// Helper para verificar se mensagem sigilosa pode ser exibida
const canViewConfidentialMessage = (message, ticketFocado = null) => {
  // Se mensagem não é sigilosa, sempre exibir
  if (!message.isConfidential) {
    return true
  }

  const userId = +localStorage.getItem('userId')

  // Se não há ticket focado, não exibir mensagens sigilosas
  if (!ticketFocado || !ticketFocado.id) {
    return false
  }

  // Verificar se o ticket está em modo sigiloso ativo OU se showConfidentialMessages está ativo
  // Se nenhum dos dois estiver ativo, não exibir mensagens sigilosas
  const isConfidentialActive = ticketFocado.isConfidential === true
  const isShowConfidentialActive = ticketFocado.showConfidentialMessages === true

  if (!isConfidentialActive && !isShowConfidentialActive) {
    return false
  }

  // Se o ticket está em modo sigiloso ativo OU showConfidentialMessages está ativo
  // Verificar se o usuário é o autor do sigilo
  if (ticketFocado.confidentialUserId === userId) {
    // Exibir apenas mensagens sigilosas do usuário autor
    return message.confidentialUserId === userId
  }

  // Caso contrário, não exibir
  return false
}

// Helper para filtrar mensagens sigilosas
const filterConfidentialMessages = (messages, ticketFocado = null) => {
  return messages.filter(msg => canViewConfidentialMessage(msg, ticketFocado))
}

// Retorna tempo em ms para ordenação; normaliza timestamp (s/ms, number/string) e createdAt
const getMessageTimeMs = (obj) => {
  if (obj.timestamp != null) {
    const raw = Number(obj.timestamp)
    if (!Number.isFinite(raw)) return 0
    return raw < 1e12 ? raw * 1000 : raw
  }
  if (obj.createdAt != null) {
    const d = typeof obj.createdAt === 'string' ? parseISO(obj.createdAt) : new Date(obj.createdAt)
    return d.getTime()
  }
  return 0
}

const orderMessages = (messages) => {
  const newMessages = orderBy(messages, (obj) => getMessageTimeMs(obj), ['asc'])
  return [...newMessages]
}

const orderTickets = (tickets) => {
  const newTickes = orderBy(tickets, (obj) => parseISO(obj.lastMessageAt || obj.updatedAt), ['asc'])
  return [...newTickes]
}

const checkTicketFilter = (ticket) => {
  const filtroPadrao = {
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

  const NotViewTicketsChatBot = () => {
    const configuracoes = JSON.parse(localStorage.getItem('configuracoes'))
    const conf = configuracoes?.find(c => c.key === 'NotViewTicketsChatBot')
    return (conf?.value === 'enabled')
  }

  const DirectTicketsToWallets = () => {
    const configuracoes = JSON.parse(localStorage.getItem('configuracoes'))
    const conf = configuracoes?.find(c => c.key === 'DirectTicketsToWallets')
    return (conf?.value === 'enabled')
  }

  const isNotViewAssignedTickets = () => {
    const configuracoes = JSON.parse(localStorage.getItem('configuracoes'))
    const conf = configuracoes?.find(c => c.key === 'NotViewAssignedTickets')
    return (conf?.value === 'enabled')
  }
  const filtros = JSON.parse(localStorage.getItem('filtrosAtendimento')) || filtroPadrao
  const usuario = JSON.parse(localStorage.getItem('usuario'))
  const UserQueues = JSON.parse(localStorage.getItem('queues'))
  const UserManagerQueues = JSON.parse(localStorage.getItem('managerQueues') || '[]')
  const filasCadastradas = JSON.parse(localStorage.getItem('filasCadastradas') || '[]')
  const profile = localStorage.getItem('profile')
  const isAdminShowAll = profile === 'admin' && filtros.showAll
  const isQueuesTenantExists = filasCadastradas.length > 0

  const userId = usuario?.userId || +localStorage.getItem('userId')

  // Verificar se é admin e se está solicitando para mostrar todos
  if (isAdminShowAll) {
    console.log('isAdminShowAll', isAdminShowAll)
    return true
  }

  // se ticket for um grupo, todos podem verificar.
  if (ticket.isGroup) {
    console.log('ticket.isGroup', ticket.isGroup)
    return true
  }

  // se status do ticket diferente do staatus filtrado, retornar false
  if (filtros.status.length > 0 && !filtros.status.includes(ticket.status)) {
    console.log('Status ticket', filtros.status, ticket.status)
    return false
  }

  // verificar se já é um ticket do usuário
  if (ticket?.userId == userId) {
    console.log('Ticket do usuário', ticket?.userId, userId)
    return true
  }

  // Não visualizar tickets ainda com o Chatbot
  // desde que ainda não exista usuário ou fila definida
  if (NotViewTicketsChatBot() && ticket.autoReplyId) {
    if (!ticket?.userId && !ticket.queueId) {
      console.log('NotViewTicketsChatBot e o ticket está sem usuário e fila definida')
      return false
    }
  }

  // Se o ticket não possuir fila definida, checar o filtro
  // permite visualizar tickets sem filas definidas é falso.
  // if (isQueuesTenantExists && !ticket.queueId && !filtros.includeNotQueueDefined) {
  //   console.log('filtros.includeNotQueueDefined', ticket.queueId, !filtros.includeNotQueueDefined)
  //   return false
  // }

  let isValid = true

  // verificar se o usuário possui fila liberada
  if (isQueuesTenantExists) {
    const isQueueUser = UserQueues.findIndex(q => ticket.queueId === q.id)
    const isManagerQueue = UserManagerQueues.findIndex(q => ticket.queueId === q.id)

    if (isQueueUser !== -1) {
      console.log('Fila do ticket liberada para o Usuario', ticket.queueId)
      isValid = true
    } else if (isManagerQueue !== -1) {
      console.log('Fila do ticket liberada para o Gerente', ticket.queueId)
      isValid = true
    } else {
      console.log('Usuario não tem acesso a fila', ticket.queueId)
      return false
    }
  }

  // verificar se a fila do ticket está filtrada
  if (isQueuesTenantExists && filtros?.queuesIds.length) {
    const isQueue = filtros.queuesIds.findIndex(q => ticket.queueId === q)
    if (isQueue == -1) {
      console.log('filas filtradas e diferentes da do ticket', ticket.queueId)
      return false
    }
  }

  // se configuração para carteira ativa: verificar se já é um ticket da carteira do usuário
  if (DirectTicketsToWallets() && (ticket?.contact?.wallets?.length || 0) > 0) {
    const idx = ticket?.contact?.wallets.findIndex(w => w.id == userId)
    if (idx !== -1) {
      console.log('Ticket da carteira do usuário')
      return true
    }
    console.log('DirectTicketsToWallets: Ticket não pertence à carteira do usuário', ticket)
    return false
  }

  // verificar se o parametro para não permitir visualizar
  // tickets atribuidos à outros usuários está ativo
  if (isNotViewAssignedTickets() && (ticket?.userId || userId) !== userId) {
    console.log('isNotViewAssignedTickets e ticket não é do usuário', ticket?.userId, userId)
    // se usuário não estiver atribuido, permitir visualizar
    if (!ticket?.userId) {
      return true
    }
    return false
  }

  // verificar se filtro somente tickets não assinados (isNotAssingned) ativo
  if (filtros.isNotAssignedUser) {
    console.log('isNotAssignedUser ativo para exibir somente tickets não assinados', filtros.isNotAssignedUser, !ticket.userId)
    return filtros.isNotAssignedUser && !ticket.userId
  }

  return isValid
}

const atendimentoTicket = {
  state: {
    chatTicketDisponivel: false,
    tickets: [],
    ticketsLocalizadosBusca: [],
    ticketFocado: {
      contacts: {
        tags: [],
        wallets: [],
        extraInfo: []
      }
    },
    hasMore: false,
    contatos: [],
    mensagens: [],
    modoEspiar: false
  },
  mutations: {
    // OK
    SET_HAS_MORE (state, payload) {
      state.hasMore = payload
    },
    // OK
    LOAD_TICKETS (state, payload) {
      const newTickets = orderTickets(payload)
      newTickets.forEach(ticket => {
        const ticketIndex = state.tickets.findIndex(t => t.id === ticket.id)
        if (ticketIndex !== -1) {
          state.tickets[ticketIndex] = ticket
          if (ticket.unreadMessages > 0) {
            state.tickets.unshift(state.tickets.splice(ticketIndex, 1)[0])
          }
        } else {
          if (checkTicketFilter(ticket)) {
            state.tickets.push(ticket)
          }
        }
      })
    },
    RESET_TICKETS (state) {
      state.hasMore = true
      state.tickets = []
    },
    RESET_UNREAD (state, payload) {
      const tickets = [...state.tickets]
      const ticketId = payload.ticketId
      const ticketIndex = tickets.findIndex(t => t.id === ticketId)
      if (ticketIndex !== -1) {
        tickets[ticketIndex] = payload
        tickets[ticketIndex].unreadMessages = 0
      }
      state.ticket = tickets
    },
    // OK
    UPDATE_TICKET (state, payload) {
      const ticketIndex = state.tickets.findIndex(t => t.id === payload.id)
      if (ticketIndex !== -1) {
        // atualizar ticket se encontrado
        const tickets = [...state.tickets]
        tickets[ticketIndex] = {
          ...tickets[ticketIndex],
          ...payload,
          // ajustar informações por conta das mudanças no front
          username: payload?.user?.name || payload?.username || tickets[ticketIndex].username,
          profilePicUrl: payload?.contact?.profilePicUrl || payload?.profilePicUrl || tickets[ticketIndex].profilePicUrl,
          name: payload?.contact?.name || payload?.name || tickets[ticketIndex].name
        }
        state.tickets = tickets.filter(t => checkTicketFilter(t))

        // atualizar se ticket focado
        if (state.ticketFocado.id == payload.id) {
          state.ticketFocado = {
            ...state.ticketFocado,
            ...payload
            // conservar as informações do contato
            // contact: state.ticketFocado.contact
          }
        }
      } else {
        const tickets = [...state.tickets]
        tickets.unshift({
          ...payload,
          // ajustar informações por conta das mudanças no front
          username: payload?.user?.name || payload?.username,
          profilePicUrl: payload?.contact?.profilePicUrl || payload?.profilePicUrl,
          name: payload?.contact?.name || payload?.name
        })
        state.tickets = tickets.filter(t => checkTicketFilter(t))
      }

      // ✅ CORREÇÃO: Sempre atualizar ticketFocado se for o mesmo ticket, mesmo que não esteja na lista
      // Isso resolve o problema de status undefined após encerrar tickets
      if (state.ticketFocado.id == payload.id) {
        console.log('🔄 [STORE] Atualizando ticket focado via WebSocket:', {
          ticketId: payload.id,
          status: payload.status,
          isGroup: payload.isGroup,
          profilePicUrl: payload.profilePicUrl,
          name: payload.name,
          tags: payload.tags,
          contact: payload.contact,
          lastMessageAt: payload.lastMessageAt,
          updatedAt: payload.updatedAt,
          isTransference: payload.isTransference,
          userId: payload.userId,
          isConfidential: payload.isConfidential,
          confidentialUserId: payload.confidentialUserId
        })

        // ✅ CORREÇÃO: Garantir que o ticketFocado seja sempre atualizado com dados válidos
        // Preservar showConfidentialMessages se já estiver setado (não sobrescrever com undefined)
        const currentShowConfidential = state.ticketFocado.showConfidentialMessages

        state.ticketFocado = {
          ...state.ticketFocado,
          ...payload,
          // Preservar informações do contato se existirem
          contact: payload.contact || state.ticketFocado.contact,
          // Garantir que o status seja sempre definido
          status: payload.status || state.ticketFocado.status,
          // Preservar showConfidentialMessages se já estiver setado
          showConfidentialMessages: payload.showConfidentialMessages !== undefined
            ? payload.showConfidentialMessages
            : currentShowConfidential
        }

        console.log('✅ [STORE] Ticket focado atualizado:', state.ticketFocado)
      }
    },

    DELETE_TICKET (state, payload) {
      const ticketId = payload
      const ticketIndex = state.tickets.findIndex(t => t.id === ticketId)
      if (ticketIndex !== -1) {
        state.tickets.splice(ticketIndex, 1)
      }
      // return state.tickets
    },

    // UPDATE_TICKET_MESSAGES_COUNT (state, payload) {

    //   const { ticket, searchParam } = payload
    //   const ticketIndex = state.tickets.findIndex(t => t.id === ticket.id)
    //   if (ticketIndex !== -1) {
    //     state.tickets[ticketIndex] = ticket
    //     state.tickets.unshift(state.tickets.splice(ticketIndex, 1)[0])
    //   } else if (!searchParam) {
    //     state.tickets.unshift(ticket)
    //   }
    //   // return state.tickets
    // },

    UPDATE_TICKET_FOCADO_CONTACT (state, payload) {
      state.ticketFocado.contact = payload
    },
    UPDATE_CONTACT (state, payload) {
      if (state.ticketFocado.contactId == payload.id) {
        state.ticketFocado.contact = payload
      }
      const ticketIndex = state.tickets.findIndex(t => t.contactId === payload.id)
      if (ticketIndex !== -1) {
        const tickets = [...state.tickets]
        tickets[ticketIndex].contact = payload
        tickets[ticketIndex].name = payload.name
        tickets[ticketIndex].profilePicUrl = payload.profilePicUrl
        state.tickets = tickets
      }
    },
    // OK
    TICKET_FOCADO (state, payload) {
      const params = {
        ...payload,
        status: payload.status == 'pending' ? 'open' : payload.status
      }
      state.ticketFocado = params
      // return state.ticketFocado
    },
    SET_TICKET_CONFIDENTIAL (state, payload) {
      if (state.ticketFocado.id === payload.ticketId) {
        state.ticketFocado.isConfidential = payload.isConfidential
        if (payload.confidentialUserId !== undefined) {
          state.ticketFocado.confidentialUserId = payload.confidentialUserId
        }
        if (payload.showConfidentialMessages !== undefined) {
          state.ticketFocado.showConfidentialMessages = payload.showConfidentialMessages
        }
      }
      // Atualizar também na lista de tickets
      const ticketIndex = state.tickets.findIndex(t => t.id === payload.ticketId)
      if (ticketIndex !== -1) {
        state.tickets[ticketIndex].isConfidential = payload.isConfidential
        if (payload.confidentialUserId !== undefined) {
          state.tickets[ticketIndex].confidentialUserId = payload.confidentialUserId
        }
        if (payload.showConfidentialMessages !== undefined) {
          state.tickets[ticketIndex].showConfidentialMessages = payload.showConfidentialMessages
        }
      }
    },
    // OK - merge com mensagens já em tela para não perder as que chegaram via socket e ainda não vieram na API
    LOAD_INITIAL_MESSAGES (state, payload) {
      const { messages, messagesOffLine } = payload
      const fromApi = filterConfidentialMessages([...messages, ...messagesOffLine], state.ticketFocado)
      const apiIds = new Set(fromApi.map(m => m.id).filter(Boolean))
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000
      const onlyInState = (state.mensagens || []).filter(m => {
        if (!m.id) return false
        if (apiIds.has(m.id)) return false
        return getMessageTimeMs(m) >= twoMinutesAgo
      })
      const merged = [...fromApi, ...onlyInState]
      state.mensagens = orderMessages(merged)
    },
    // OK
    LOAD_MORE_MESSAGES (state, payload) {
      const { messages, messagesOffLine } = payload
      // Filtrar mensagens sigilosas
      const filteredMessages = filterConfidentialMessages([...messages, ...messagesOffLine], state.ticketFocado)
      const arrayMessages = [...filteredMessages]
      const newMessages = []
      arrayMessages.forEach((message, index) => {
        const messageIndex = state.mensagens.findIndex(m => m.id === message.id)
        if (messageIndex !== -1) {
          state.mensagens[messageIndex] = message
          arrayMessages.splice(index, 1)
        } else {
          newMessages.push(message)
        }
      })
      const merged = [...newMessages, ...state.mensagens]
      state.mensagens = orderMessages(merged)
    },
    // OK
    UPDATE_MESSAGES (state, payload) {
      // Garantir ticket com id (backend pode enviar ticket no payload ou ticketId na mensagem)
      const ticket = payload.ticket || (payload.ticketId != null && { id: payload.ticketId })
      if (!ticket || (ticket.id == null && payload.ticketId == null)) return
      const ticketId = Number(ticket.id || payload.ticketId)
      if (!ticketId) return
      const payloadNormalized = { ...payload, ticket: { ...ticket, id: ticketId } }
      // Comparação explícita em número para evitar falha quando backend envia id como string (ex.: Sequelize/JSON)
      const ticketFocadoId = state.ticketFocado && state.ticketFocado.id != null ? Number(state.ticketFocado.id) : null
      const isTicketFocado = ticketFocadoId !== null && ticketFocadoId === ticketId
      if (isTicketFocado) {
        // Verificar se mensagem sigilosa pode ser exibida
        const canView = canViewConfidentialMessage(payloadNormalized, state.ticketFocado)

        // Se mensagem é sigilosa e não pode ser exibida, remover ou não adicionar
        if (payloadNormalized.isConfidential && !canView) {
          // Remover mensagem sigilosa se usuário não tem permissão
          const mensagens = state.mensagens.filter(m =>
            m.id !== payloadNormalized.id && (payloadNormalized.idFront ? m.idFront !== payloadNormalized.idFront : true)
          )
          state.mensagens = mensagens
          return
        }

        // Priorizar id (UUID do backend): cada mensagem do servidor tem id único.
        // Só usar idFront para atualizar mensagem otimista (enviada pelo usuário ainda sem id),
        // senão várias mídias com o mesmo idFront sobrescreviam uma à outra no chat.
        let messageIndex = state.mensagens.findIndex(m => m.id === payloadNormalized.id)
        if (messageIndex === -1 && payloadNormalized.idFront) {
          messageIndex = state.mensagens.findIndex(m =>
            m.idFront === payloadNormalized.idFront && !m.id
          )
        }
        const mensagens = [...state.mensagens]
        if (messageIndex !== -1) {
          mensagens[messageIndex] = payloadNormalized
        } else {
          mensagens.push(payloadNormalized)
        }
        // Filtrar mensagens sigilosas após adicionar/atualizar
        const filteredMessages = filterConfidentialMessages(mensagens, state.ticketFocado)
        // Ordenar e atribuir novo array para garantir reatividade no Vue
        state.mensagens = orderMessages(filteredMessages)
        if (payloadNormalized.scheduleDate && payloadNormalized.status == 'pending' && state.ticketFocado.scheduledMessages) {
          const idxScheduledMessages = state.ticketFocado.scheduledMessages.findIndex(m => m.id === payloadNormalized.id)
          if (idxScheduledMessages === -1) {
            state.ticketFocado.scheduledMessages.push(payloadNormalized)
          }
        }
      }

      const TicketIndexUpdate = state.tickets.findIndex(t => t.id == ticketId)
      if (TicketIndexUpdate !== -1) {
        const tickets = [...state.tickets]
        const isFocado = state.ticketFocado && (state.ticketFocado.id == ticketId)
        const unreadMessages = isFocado ? 0 : (payloadNormalized.ticket && payloadNormalized.ticket.unreadMessages) || 0
        tickets[TicketIndexUpdate] = {
          ...state.tickets[TicketIndexUpdate],
          answered: payloadNormalized.ticket && payloadNormalized.ticket.answered,
          unreadMessages,
          lastMessage: payloadNormalized.mediaName || payloadNormalized.body
        }
        state.tickets = tickets
      }
    },
    // OK
    UPDATE_MESSAGE_STATUS (state, payload) {
      if (!state.ticketFocado || !payload.ticket) return
      if (state.ticketFocado.id != payload.ticket.id) return
      const messageIndex = state.mensagens.findIndex(m => m.id === payload.id)
      const mensagens = [...state.mensagens]
      if (messageIndex !== -1) {
        mensagens[messageIndex] = payload
        state.mensagens = mensagens
      }

      // Se existir mensagens agendadas no ticket focado,
      // tratar a atualização das mensagens deletadas.
      if (state.ticketFocado?.scheduledMessages) {
        const scheduledMessages = [...state.ticketFocado.scheduledMessages]
        const scheduled = scheduledMessages.filter(m => m.id != payload.id)
        state.ticketFocado.scheduledMessages = scheduled
      }
    },
    // Atualizar mensagem editada
    UPDATE_MESSAGE_EDIT (state, payload) {
      if (!state.ticketFocado || !payload.ticket) return
      if (state.ticketFocado.id != payload.ticket.id) return

      // Tentar encontrar por ID ou por idFront
      const messageIndex = state.mensagens.findIndex(m =>
        m.id === payload.id || (payload.idFront && m.idFront === payload.idFront)
      )

      if (messageIndex !== -1) {
        // Criar objeto atualizado com _renderKey para forçar re-render do Vue
        const mensagemAtualizada = {
          ...state.mensagens[messageIndex],
          body: payload.body,
          isEdited: payload.isEdited,
          updatedAt: payload.updatedAt,
          _renderKey: Date.now(), // Timestamp único para forçar re-render
          ...payload
        }

        // Usar Vue.set para garantir reatividade profunda
        Vue.set(state.mensagens, messageIndex, mensagemAtualizada)

        // Forçar reatividade do array
        state.mensagens = [...state.mensagens]
      }

      if (state.ticketFocado?.scheduledMessages) {
        const scheduledMessages = [...state.ticketFocado.scheduledMessages]
        const scheduledIndex = scheduledMessages.findIndex(m => m.id === payload.id)
        if (scheduledIndex !== -1) {
          const mensagemAtualizada = {
            ...scheduledMessages[scheduledIndex],
            ...payload
          }
          scheduledMessages[scheduledIndex] = mensagemAtualizada
          scheduledMessages.sort((a, b) => {
            const aTime = new Date(a.scheduleDate || 0).getTime()
            const bTime = new Date(b.scheduleDate || 0).getTime()
            return aTime - bTime
          })
          state.ticketFocado.scheduledMessages = scheduledMessages
        }
      }
    },
    UPDATE_SCHEDULED_MESSAGE (state, payload) {
      if (!state.ticketFocado?.scheduledMessages) return
      const scheduledMessages = [...state.ticketFocado.scheduledMessages]
      const index = scheduledMessages.findIndex(m => m.id === payload.id)
      if (index !== -1) {
        scheduledMessages[index] = {
          ...scheduledMessages[index],
          ...payload
        }
      } else {
        scheduledMessages.push(payload)
      }
      scheduledMessages.sort((a, b) => {
        const aTime = new Date(a.scheduleDate || 0).getTime()
        const bTime = new Date(b.scheduleDate || 0).getTime()
        return aTime - bTime
      })
      state.ticketFocado.scheduledMessages = scheduledMessages
    },
    // OK
    RESET_MESSAGE (state) {
      state.mensagens = []
      // return state.mensagens
    },
    // Controle do modo espiar
    SET_MODO_ESPIAR (state, payload) {
      state.modoEspiar = payload
    }
  },
  actions: {
    async LocalizarMensagensTicket ({ commit, dispatch }, params) {
      const mensagens = await LocalizarMensagens(params)
      // commit('TICKET_FOCADO', mensagens.data.ticket)
      commit('SET_HAS_MORE', mensagens.data.hasMore)
      // commit('UPDATE_TICKET_CONTACT', mensagens.data.ticket.contact)
      if (params.pageNumber === 1) {
        commit('LOAD_INITIAL_MESSAGES', mensagens.data)
      } else {
        commit('LOAD_MORE_MESSAGES', mensagens.data)
      }
    },
    async AbrirChatMensagens ({ commit, dispatch }, data) {
      try {
        if (!data || !data.id) return
        await commit('TICKET_FOCADO', {})
        await commit('RESET_MESSAGE')
        const statusMap = {
          pending: 'aba_em_fila',
          open: 'aba_atendimento',
          closed: 'aba_encerrados'
        }
        const accessSource =
          data.accessSource ||
          statusMap[data.status] ||
          (data.isGroup ? 'aba_grupos' : 'unknown')

        const queryParams = {
          id: data.id,
          accessSource,
          accessTab: data.accessTab || data.origemAba || null,
          ticketStatusAtClick: data.ticketStatusAtClick || data.status || null,
          queueIdAtClick: data.queueIdAtClick || data.queueId || null,
          assignedUserId: data.assignedUserId || data.userId || null,
          assignedUserName:
            data.assignedUserName || (data.user && data.user.name) || null
        }

        const ticket = await ConsultarDadosTicket(queryParams)
        await commit('TICKET_FOCADO', ticket.data)
        // commit('SET_HAS_MORE', true)
        const params = {
          ticketId: data.id,
          pageNumber: 1
        }
        await dispatch('LocalizarMensagensTicket', params)

        await $router.push({ name: 'chat', params, query: { t: new Date().getTime() } })
      } catch (error) {
        // posteriormente é necessário investigar o motivo de está caindo em erro
        if (!error) return
        const errorMsg = error?.response?.data?.error || error?.data?.error
        const errorCode = error?.response?.status || error?.status

        // Se for erro de sigilo, mostrar mensagem amigável
        if (errorMsg === 'ERR_TICKET_CONFIDENTIAL_IN_USE') {
          Notify.create({
            type: 'warning',
            message: 'Este ticket está sendo usado por outro usuário.',
            progress: true,
            position: 'top',
            timeout: 5000,
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })
          return
        }

        // Se for erro 403 (permissão), mostrar mensagem amigável sem fazer logout
        if (errorCode === 403) {
          const errorMessage = backendErrors[errorMsg] || 'Você não tem permissão para acessar este recurso.'
          Notify.create({
            type: 'warning',
            message: errorMessage,
            progress: true,
            position: 'top',
            timeout: 5000,
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })
          return
        }

        if (errorMsg) {
          Notify.create({
            type: 'negative',
            message: errorMsg,
            progress: true,
            position: 'top',
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })
        } else {
          Notify.create({
            type: 'negative',
            message: 'Ops... Ocorreu um problema não identificado.',
            progress: true,
            position: 'top',
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })
        }
      }
    }
  }
}

export default atendimentoTicket
