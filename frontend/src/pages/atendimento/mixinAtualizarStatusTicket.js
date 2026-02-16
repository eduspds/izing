import { AtualizarStatusTicket } from 'src/service/tickets'
const userId = +localStorage.getItem('userId')

export default {
  data () {
    return {
      modalEncerrarTicket: false
    }
  },
  methods: {
    iniciarAtendimento (ticket) {
      // VALIDAÇÃO: Não permitir iniciar atendimento de tickets fechados
      if (ticket.status === 'closed') {
        this.$q.notify({
          message: 'Não é possível iniciar atendimento de um ticket fechado.',
          type: 'negative',
          progress: true,
          position: 'top',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
        return
      }

      this.loading = true
      AtualizarStatusTicket(ticket.id, 'open', userId)
        .then(res => {
          this.loading = false
          this.$q.notify({
            message: `Atendimento Iniciado || ${ticket.name} - Ticket: ${ticket.id}`,
            type: 'positive',
            progress: true,
            position: 'top',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
          // Resetar modo espiar quando iniciar atendimento
          this.$store.commit('SET_MODO_ESPIAR', false)
          this.$store.commit('TICKET_FOCADO', {})
          this.$store.commit('SET_HAS_MORE', true)
          const payload = {
            ...ticket,
            accessSource: 'mixin_status_update',
            accessTab: 'pending_to_open',
            ticketStatusAtClick: ticket.status,
            queueIdAtClick: ticket.queueId,
            assignedUserId: ticket.userId || ticket.user?.id || null,
            assignedUserName: ticket.user?.name || null
          }
          this.$store.dispatch('AbrirChatMensagens', payload)

          // Emitir evento para mudar para a aba "Atendimento" quando um ticket pendente for atendido
          console.log('🔄 [FRONTEND] Emitindo evento para mudar para aba "Atendimento"')
          console.log('🔄 [FRONTEND] Dados do evento:', { ticketId: ticket.id, status: 'open' })
          this.$emit('ticket-atendido', { ticketId: ticket.id, status: 'open' })
          console.log('🔄 [FRONTEND] Evento emitido com sucesso')
        })
        .catch(error => {
          this.loading = false
          console.error(error)
          this.$notificarErro('Não foi possível atualizar o status', error)
        })
    },
    atualizarStatusTicket (status) {
      const contatoName = this.ticketFocado.contact.name || ''
      const ticketId = this.ticketFocado.id
      const title = {
        open: 'Atenidmento será iniciado, ok?',
        pending: 'Retornar à fila?',
        closed: 'Encerrar o atendimento?'
      }
      const toast = {
        open: 'Atenidmento iniciado!',
        pending: 'Retornado à fila!',
        closed: 'Atendimento encerrado!'
      }

      // Para encerramento, usar modal personalizado
      if (status === 'closed') {
        this.modalEncerrarTicket = true
        return
      }

      // Para outros status, usar dialog padrão
      this.$q.dialog({
        title: title[status],
        message: `Cliente: ${contatoName} || Ticket: ${ticketId}`,
        cancel: {
          label: 'Não',
          color: 'negative',
          push: true
        },
        ok: {
          label: 'Sim',
          color: 'primary',
          push: true
        },
        persistent: true
      }).onOk(() => {
        this.loading = true
        AtualizarStatusTicket(ticketId, status, userId)
          .then(res => {
            this.loading = false
            this.$q.notify({
              message: `${toast[status]} || ${contatoName} (Ticket ${ticketId})`,
              type: 'positive',
              progress: true,
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })
            this.$store.commit('TICKET_FOCADO', {})
            if (status !== 'open') this.$router.push({ name: 'chat-empty' })
          })
          .catch(error => {
            this.loading = false
            console.error(error)
            this.$notificarErro('Não foi possível atuaizar o status', error)
          })
      })
    },
    onTicketEncerrado (ticket) {
      console.log('🎫 [TICKET] Ticket encerrado, aguardando atualização via WebSocket...', ticket)

      // ✅ CORREÇÃO: Não limpar o ticketFocado imediatamente
      // Deixar o WebSocket atualizar o status primeiro
      // Apenas redirecionar para chat-empty
      this.$router.push({ name: 'chat-empty' })

      // ✅ NOVA ABORDAGEM: Aguardar o WebSocket atualizar o ticket antes de limpar
      // Verificar se o ticket foi atualizado via WebSocket
      const checkTicketUpdate = () => {
        const currentTicket = this.$store.getters.ticketFocado
        console.log('🔍 [TICKET] Verificando atualização do ticket:', currentTicket)

        if (currentTicket.id && currentTicket.status) {
          console.log('✅ [TICKET] Ticket atualizado via WebSocket, limpando agora')
          this.$store.commit('TICKET_FOCADO', {})
        } else {
          console.log('⏳ [TICKET] Aguardando atualização via WebSocket...')
          // Tentar novamente em 500ms
          setTimeout(checkTicketUpdate, 500)
        }
      }

      // Iniciar verificação após 1 segundo
      setTimeout(checkTicketUpdate, 1000)
    },
    espiarAtendimento (ticket) {
      // VALIDAÇÃO: Não permitir espiar tickets fechados
      if (ticket.status === 'closed') {
        this.$q.notify({
          message: 'Não é possível espiar um ticket fechado.',
          type: 'negative',
          progress: true,
          position: 'top',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
        return
      }

      this.loading = true
      AtualizarStatusTicket(ticket.id, 'pending')
        .then((res) => {
          this.loading = false
          this.$q.notify({
            message: `Espiando || ${ticket.name} - Ticket: ${ticket.id}`,
            type: 'positive',
            progress: true,
            position: 'top',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
          // Marcar como modo espiar no store
          this.$store.commit('SET_MODO_ESPIAR', true)
          this.$store.commit('TICKET_FOCADO', {})
          this.$store.commit('SET_HAS_MORE', true)
          const payload = {
            ...ticket,
            accessSource: 'modo_espiar',
            accessTab: 'spy_mode',
            ticketStatusAtClick: ticket.status,
            queueIdAtClick: ticket.queueId,
            assignedUserId: ticket.userId || ticket.user?.id || null,
            assignedUserName: ticket.user?.name || null
          }
          this.$store.dispatch('AbrirChatMensagens', payload)
        })
        .catch((error) => {
          this.loading = false
          console.error(error)
          this.$notificarErro('Não foi possível atualizar o status', error)
        })
    }
  }
}
