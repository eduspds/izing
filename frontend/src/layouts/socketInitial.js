const usuario = JSON.parse(localStorage.getItem('usuario'))
import Router from 'src/router/index'
import { getSocket } from '../utils/socket' // ✅ IMPORT CORRETO

// ✅ USAR INSTÂNCIA ÚNICA
const socket = getSocket()

const userId = +localStorage.getItem('userId')

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
    socketInitial () {
      console.log('🔌 Inicializando socketInitial mixin')

      // ✅ Limpar listeners antigos antes de adicionar novos
      this.cleanupSocketListeners()

      // Entrar na sala de notificações
      socket.emit(`${usuario.tenantId}:joinNotification`)

      // ✅ Armazenar listeners para cleanup
      const listeners = [
        // Listener para atualizações de WhatsApp
        {
          event: `${usuario.tenantId}:whatsapp`,
          handler: (data) => {
            if (data.action === 'update') {
              this.$store.commit('UPDATE_WHATSAPPS', data.whatsapp)
            }
          }
        },
        // Listener para criação de tickets
        {
          event: `${usuario.tenantId}:ticketList`,
          handler: async (data) => {
            console.log('📨 Evento ticketList recebido:', data.type)

            if (data.type === 'chat:create') {
              console.log('💬 Nova mensagem recebida')
              if (data.payload.ticket.userId !== userId) return
              if (data.payload.fromMe) return

              // Criar notificação do navegador
              const message = new self.Notification('Contato: ' + data.payload.ticket.contact.name, {
                body: 'Mensagem: ' + data.payload.body,
                tag: 'simple-push-demo-notification',
                image: data.payload.ticket.contact.profilePicUrl,
                icon: data.payload.ticket.contact.profilePicUrl
              })
              console.log('📢 Notificação enviada:', message)

              // ✅ OTIMIZAÇÃO: Incrementar contador localmente
              if (!data.payload.read && data.payload.ticket.status === 'open') {
                this.$store.commit('INCREMENT_NOTIFICATION_COUNT')
                console.log('✅ Contador de notificações incrementado localmente')
              }
            }
          }
        },
        // Listener para exclusão de WhatsApp
        {
          event: `${usuario.tenantId}:whatsapp`,
          handler: (data) => {
            if (data.action === 'delete') {
              this.$store.commit('DELETE_WHATSAPPS', data.whatsappId)
            }
          }
        },
        // Listener para sessões WhatsApp
        {
          event: `${usuario.tenantId}:whatsappSession`,
          handler: (data) => {
            if (data.action === 'update') {
              this.$store.commit('UPDATE_SESSION', data.session)
              this.$root.$emit('UPDATE_SESSION', data.session)
            }

            if (data.action === 'readySession') {
              this.$q.notify({
                position: 'top',
                icon: 'mdi-wifi-arrow-up-down',
                message: `A conexão com o WhatsApp está pronta e o mesmo está habilitado para enviar e receber mensagens. Conexão: ${data.session.name}. Número: ${data.session.number}.`,
                type: 'positive',
                color: 'primary',
                html: true,
                progress: true,
                timeout: 7000,
                actions: [{
                  icon: 'close',
                  round: true,
                  color: 'white'
                }],
                classes: 'text-body2 text-weight-medium'
              })
            }
          }
        },
        // Listener para bateria
        {
          event: `${usuario.tenantId}:change_battery`,
          handler: (data) => {
            this.$q.notify({
              message: `Bateria do celular do whatsapp ${data.batteryInfo.sessionName} está com bateria em ${data.batteryInfo.battery}%. Necessário iniciar carregamento.`,
              type: 'negative',
              progress: true,
              position: 'top',
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })
          }
        },
        // Listener para notificações de novos tickets
        {
          event: `${usuario.tenantId}:ticketList`,
          handler: async (data) => {
            if (data.type === 'notification:new') {
              console.log('🎯 Nova notificação de ticket pendente')

              // ✅ OTIMIZAÇÃO: Incrementar contador localmente
              const queues = JSON.parse(localStorage.getItem('queues') || '[]')

              // Verificar se o ticket pertence às filas do usuário
              let shouldNotify = true
              if (queues.length > 0 && data.payload.queueId) {
                shouldNotify = queues.some(q => q.id === data.payload.queueId)
              }

              if (shouldNotify) {
                // Incrementar contador localmente
                this.$store.commit('INCREMENT_NOTIFICATION_PENDING_COUNT')
                console.log('✅ Contador de notificações pendentes incrementado localmente')

                // Exibir notificação do navegador
                const message = new self.Notification('Novo cliente pendente', {
                  body: 'Cliente: ' + data.payload.contact.name,
                  tag: 'simple-push-demo-notification'
                })
                console.log('📢 Notificação de ticket pendente:', message)
              }
            }
          }
        }
      ]

      // ✅ Registrar todos os listeners e armazenar para cleanup
      listeners.forEach(({ event, handler }) => {
        socket.on(event, handler)
        this.socketListeners.push({ event, handler })
        console.log(`👂 Listener registrado: ${event}`)
      })

      console.log('✅ Todos os listeners do socketInitial configurados')
    },

    // ✅ NOVO MÉTODO: Limpeza de listeners
    cleanupSocketListeners () {
      console.log('🧹 Limpando listeners do socketInitial')

      if (this.socketListeners && this.socketListeners.length > 0) {
        this.socketListeners.forEach(({ event, handler }) => {
          socket.off(event, handler)
          console.log(`🗑️ Listener removido: ${event}`)
        })
        this.socketListeners = []
      }
    }
  },

  mounted () {
    this.socketInitial()
  },

  beforeDestroy () {
    // ✅ Limpar apenas os listeners específicos, NÃO desconectar o socket global
    this.cleanupSocketListeners()
    console.log('🔌 socketInitial mixin destruído - listeners limpos')
  }

  // ❌ REMOVIDO: destroyed() com socket.disconnect()
  // Deixa o singleton gerenciar a conexão
}
