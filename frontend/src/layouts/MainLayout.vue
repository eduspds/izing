<template>
  <q-layout view="hHh Lpr lFf">

    <q-header class="bg-white text-grey-8 q-py-xs " height-hint="58" bordered>
      <q-toolbar>
        <q-btn flat dense round @click="leftDrawerOpen = !leftDrawerOpen" aria-label="Menu" icon="menu">
          <q-tooltip>Menu</q-tooltip>
        </q-btn>

        <q-btn flat no-caps no-wrap dense class="q-ml-sm" v-if="$q.screen.gt.xs">
          <q-img src="/logo horizontal.png" spinner-color="primary" style="height: 80px; width: 340px" />
          <!-- <q-toolbar-title
            shrink
            class="text-bold text-grey-7"
          >
            IZING
          </q-toolbar-title> -->
        </q-btn>

        <q-space />
        <!-- BOTAO DE SUPORTE -->
        <div class="q-gutter-sm row items-center no-wrap">
          <q-btn dense flat color="primary" icon="support_agent" @click="abrirSuporte">
            Suporte
            <q-tooltip>Suporte</q-tooltip>
          </q-btn>

          <div class="text-center row justify-end" :class="{ 'bg-grey-3': $q.dark.isActive }" style="height: 40px">
            <q-toggle size="xl" keep-color dense class="text-bold q-ml-xs"
              :icon-color="$q.dark.isActive ? 'black' : 'white'" :value="$q.dark.isActive"
              :color="$q.dark.isActive ? 'grey-3' : 'black'" checked-icon="mdi-white-balance-sunny"
              unchecked-icon="mdi-weather-sunny" @input="$setConfigsUsuario({ isDark: !$q.dark.isActive })">
              <q-tooltip content-class="text-body1 hide-scrollbar">
                {{ $q.dark.isActive ? 'Desativar' : 'Ativar' }} Modo Escuro
              </q-tooltip>
            </q-toggle>
          </div>
          <q-btn round dense flat color="grey-8" icon="chat" @click="abrirChatInterno">
            <q-badge v-if="chatInternoUnread > 0" color="red" text-color="white" floating>
              {{ chatInternoUnread }}
            </q-badge>
            <q-tooltip>Chat Interno</q-tooltip>
          </q-btn>
          <q-btn round dense flat color="grey-8" icon="notifications">
            <q-badge color="red" text-color="white" floating
              v-if="(parseInt(notifications.count) + parseInt(notifications_p.count)) > 0">
              {{ parseInt(notifications.count) + parseInt(notifications_p.count) }}
            </q-badge>
            <q-menu>
              <q-list style="min-width: 300px">
                <!--q-item>
                  <q-item-section
                    style="cursor: pointer;">
                    {{ parseInt(notifications.count) }} + {{ parseInt(notifications_p.count) }}
                  </q-item-section>
                </q-item-->
                <q-item v-if="(parseInt(notifications.count) + parseInt(notifications_p.count)) == 0">
                  <q-item-section style="cursor: pointer;">
                    Nada de novo por aqui!
                  </q-item-section>
                </q-item>
                <q-item v-if="parseInt(notifications_p.count) > 0">
                  <q-item-section avatar @click="() => $router.push({ name: 'atendimento' })" style="cursor: pointer;">
                    <q-avatar style="width: 60px; height: 60px" color="blue" text-color="white">
                      {{ notifications_p.count }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section @click="() => $router.push({ name: 'atendimento' })" style="cursor: pointer;">
                    Clientes pendentes na fila
                  </q-item-section>
                </q-item>
                <q-item v-for="ticket in notifications.tickets" :key="ticket.id"
                  style="border-bottom: 1px solid #ddd; margin: 5px;">
                  <q-item-section avatar @click="abrirAtendimentoExistente(ticket.name, ticket)"
                    style="cursor: pointer;">
                    <q-avatar style="width: 60px; height: 60px">
                      <img :src="ticket.profilePicUrl">
                    </q-avatar>
                  </q-item-section>
                  <q-item-section @click="abrirAtendimentoExistente(ticket.name, ticket)" style="cursor: pointer;">
                    <q-list>
                      <q-item style="text-align:center; font-size: 17px; font-weight: bold; min-height: 0">{{
                        ticket.name
                      }}</q-item>
                      <q-item style="min-height: 0; padding-top: 0"><b>Mensagem: </b> {{ ticket.lastMessage }}</q-item>
                    </q-list>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <q-tooltip>Notificações</q-tooltip>
          </q-btn>
          <!-- <q-avatar :color="usuario.status === 'offline' ? 'negative' : 'positive'"
            text-color="white"
            size="25px"
            :icon="usuario.status === 'offline' ? 'mdi-account-off' : 'mdi-account-check'"
            rounded
            class="q-ml-lg">
            <q-tooltip>
              {{ usuario.status === 'offline' ? 'Usuário Offiline' : 'Usuário Online' }}
            </q-tooltip>
          </q-avatar> -->
          <q-btn round flat class="bg-padrao text-bold q-mx-sm q-ml-lg">
            <q-avatar size="26px">
              {{ $iniciaisString(username) }}
            </q-avatar>
            <q-menu>
              <q-list style="min-width: 100px">
                <q-item-label header> Olá! <b> {{ username }} </b> </q-item-label>
                <!-- <q-item
                  clickable
                  v-close-popup
                >
                  <q-item-section>
                    <q-toggle
                      color="blue"
                      :value="$q.dark.isActive"
                      label="Modo escuro"
                      @input="$setConfigsUsuario({isDark: !$q.dark.isActive})"
                    />
                  </q-item-section>
                </q-item> -->
                <cStatusUsuario @update:usuario="atualizarUsuario" :usuario="usuario" />
                <q-item clickable v-close-popup @click="abrirModalUsuario">
                  <q-item-section>Perfil</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="efetuarLogout">
                  <q-item-section>Sair</q-item-section>
                </q-item>
                <q-separator />
                <q-item>
                  <q-item-section>
                    <cSystemVersion />
                  </q-item-section>
                </q-item>

              </q-list>
            </q-menu>

            <q-tooltip>Usuário</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered :mini="miniState" @mouseover="miniState = false"
      @mouseout="miniState = true" mini-to-overlay content-class="bg-white text-grey-9">
      <q-scroll-area class="fit">
        <q-list padding :key="userProfile">
          <!-- <q-item-label
            header
            class="text-grey-8"
          >
            Menu
          </q-item-label> -->
          <EssentialLink v-for="item in menuDataFiltered" v-if="exibirMenuBeta(item)" :key="item.title" v-bind="item" />

        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <q-page class="q-pa-xs">
        <router-view />
      </q-page>
    </q-page-container>

    <!-- Chat Interno -->
    <ChatModal
      v-model="chatInternoAberto"
      @minimize="fecharChatInterno"
      @close="fecharChatInterno"
      @chat-interno:contato-selecionado="handleChatInternoContatoSelecionado"
    />

    <audio ref="audioNotification">
      <source :src="alertSound" type="audio/mp3">
    </audio>

    <audio ref="audioChatInterno">
      <source :src="chatInternoSound" type="audio/mp3">
    </audio>
    <ModalUsuario :isProfile="true" :modalUsuario.sync="modalUsuario" :usuarioEdicao.sync="usuario" />

    <!-- Modal de Atualização -->
    <ModalAtualizacao
      :showModal="updateModalVisible"
      :release="latestRelease"
      @close="fecharModalAtualizacao"
    />
  </q-layout>
</template>

<script>
// const userId = +localStorage.getItem('userId')
import cSystemVersion from '../components/cSystemVersion.vue'
import { ListarWhatsapps } from 'src/service/sessoesWhatsapp'
import EssentialLink from 'components/EssentialLink.vue'
import socketInitial from './socketInitial'
import alertSound from 'src/assets/sound.mp3'
const chatInternoSound = '/sound-notific.mp3'
import { format } from 'date-fns'
const username = localStorage.getItem('username')
import ModalUsuario from 'src/pages/usuarios/ModalUsuario'
import { mapGetters } from 'vuex'
import { ListarConfiguracoes } from 'src/service/configuracoes'
import { RealizarLogout } from 'src/service/login'
import cStatusUsuario from '../components/cStatusUsuario.vue'
import { getSocket } from 'src/utils/socket' // ✅ IMPORT CORRETO
import { ConsultarTickets, CriarTicket, AtualizarStatusTicket } from 'src/service/tickets'
import { ListarContatos, CriarContato } from 'src/service/contatos'
import ChatModal from 'src/components/ChatInterno/ChatModal.vue'
import ModalAtualizacao from 'src/components/ModalAtualizacao.vue'
import versionCheckMixin from 'src/mixins/versionCheck'

// ✅ USAR INSTÂNCIA ÚNICA
const socket = getSocket()
const SUPPORT_NUMBER = '557196205926'
const SUPPORT_NAME = 'Suporte Cognos'
const SUPPORT_CHANNEL = 'whatsapp'

// Menu único na ordem definida (dashboard → atendimento → … → configurações)
const fullMenuOrder = [
  { title: 'Dashboard', caption: '', icon: 'mdi-home-analytics', routeName: 'home-dashboard', permission: 'dashboard-all-view' },
  { title: 'Atendimentos', caption: 'Lista de atendimentos', icon: 'mdi-chat', routeName: 'atendimento', permission: 'atendimento-access' },
  { title: 'Contatos', caption: 'Lista de contatos', icon: 'mdi-contacts', routeName: 'contatos', permission: 'contacts-access' },
  { title: 'Versões Publicadas', caption: 'Histórico de atualizações do sistema', icon: 'mdi-update', routeName: 'releases', permission: 'releases-access' },
  { title: 'Kanban', caption: 'Gerenciamento de atendimentos', icon: 'mdi-trello', routeName: 'kanban', permission: 'kanban-access' },
  { title: 'Painel de Atendimento', caption: 'Visão geral dos atendimentos', icon: 'mdi-view-dashboard-variant', routeName: 'painel-atendimentos', permission: 'dashboard-all-view' },
  { title: 'Relatórios', caption: 'Relatórios gerais', icon: 'mdi-file-chart', routeName: 'relatorios', permission: 'reports-access' },
  { title: 'Mensagens Rápidas', caption: 'Mensagens pré-definidas', icon: 'mdi-reply-all-outline', routeName: 'mensagens-rapidas', permission: 'quick-messages-access' },
  { title: 'Fluxo', caption: 'Robô de atendimento', icon: 'mdi-robot-happy', routeName: 'chat-flow', permission: 'chat-flow-access' },
  { title: 'Etiquetas', caption: 'Cadastro de etiquetas', icon: 'mdi-tag-text', routeName: 'etiquetas', permission: 'tags-access' },
  { title: 'Conexões', caption: 'Conexões WhatsApp', icon: 'mdi-remote-desktop', routeName: 'sessoes', permission: 'sessions-access' },
  { title: 'Usuários', caption: 'Admin de usuários', icon: 'mdi-account-group', routeName: 'usuarios', permission: 'users-access' },
  { title: 'Permissões', caption: 'Gestão de permissões por usuário', icon: 'mdi-shield-account', routeName: 'permissions', permission: 'permissions-access' },
  { title: 'Departamentos', caption: 'Gerenciamento de Departamentos', icon: 'mdi-arrow-decision-outline', routeName: 'filas', permission: 'queues-access' },
  { title: 'Campanha', caption: 'Campanhas de envio', icon: 'mdi-message-bookmark-outline', routeName: 'campanhas', permission: 'campaigns-access' },
  { title: 'Motivos de Encerramento', caption: 'Cadastro de motivos de encerramento', icon: 'mdi-close-circle-outline', routeName: 'motivos-encerramento', permission: 'closing-reasons-access' },
  { title: 'Horário de Atendimento', caption: 'Horário de funcionamento', icon: 'mdi-calendar-clock', routeName: 'horarioAtendimento', permission: 'schedule-access' },
  { title: 'Configurações', caption: 'Configurações gerais', icon: 'mdi-cog', routeName: 'configuracoes', permission: 'settings-access' },
  { title: 'API', caption: 'Integração sistemas externos', icon: 'mdi-call-split', routeName: 'api-service', permission: 'api-service-access', isBeta: true }
]

export default {
  name: 'MainLayout',
  mixins: [socketInitial, versionCheckMixin],
  components: { EssentialLink, ModalUsuario, cStatusUsuario, cSystemVersion, ChatModal, ModalAtualizacao },
  data () {
    return {
      chatInternoAberto: false,
      chatInternoUnread: 0,
      chatInternoContatoAtivo: null,
      username,
      domainExperimentalsMenus: ['@solicencas.com'],
      miniState: true,
      userProfile: 'user',
      modalUsuario: false,
      usuario: {},
      alertSound,
      chatInternoSound,
      leftDrawerOpen: false,
      menuData: fullMenuOrder,
      countTickets: 0,
      ticketsList: [],
      socketListeners: [], // ✅ NOVO: Controlar listeners
      loadingSuporte: false
    }
  },
  computed: {
    ...mapGetters(['notifications', 'notifications_p', 'whatsapps']),
    cProblemaConexao () {
      const idx = this.whatsapps.findIndex(w =>
        ['PAIRING', 'TIMEOUT', 'DISCONNECTED'].includes(w.status)
      )
      return idx !== -1
    },
    cQrCode () {
      const idx = this.whatsapps.findIndex(
        w => w.status === 'qrcode' || w.status === 'DESTROYED'
      )
      return idx !== -1
    },
    cOpening () {
      const idx = this.whatsapps.findIndex(w => w.status === 'OPENING')
      return idx !== -1
    },
    cUsersApp () {
      return this.$store.state.usersApp
    },
    cObjMenu () {
      if (this.cProblemaConexao) {
        return fullMenuOrder.map(menu => {
          if (menu.routeName === 'sessoes') {
            return { ...menu, color: 'negative' }
          }
          return menu
        })
      }
      return fullMenuOrder
    },
    menuDataFiltered () {
      return this.filterByPermission(this.menuData)
    }
  },

  async mounted () {
    console.log('🔌 MainLayout montado - Socket conectado:', socket.connected)

    // ✅ Escutar incremento do ChatModal
    this.$root.$on('chat-interno:incrementar-contador', (count) => {
      console.log('📈 MainLayout recebeu incremento:', count)
      this.chatInternoUnread += count
    })

    this.atualizarUsuario()
    // Restaurar estado do usuário no Vuex
    this.$store.dispatch('restoreUserState')
    await this.$store.dispatch('permissions/fetchPermissions')
    await this.listarWhatsapps()
    await this.listarConfiguracoes()
    await this.consultarTickets()
    await this.carregarChatInternoUnread()

    if (!('Notification' in window)) {
    } else {
      Notification.requestPermission()
    }

    this.usuario = JSON.parse(localStorage.getItem('usuario'))

    // Listener para atualizar dados do usuário em tempo real
    this.socketListenUserUpdate()
    this.userProfile = localStorage.getItem('profile')
    await this.conectarSocket(this.usuario)

    // Listener para decrementar contador quando mensagens forem lidas
    this.$root.$on('chat-interno:mensagens-lidas', (count) => {
      this.chatInternoUnread = Math.max(0, this.chatInternoUnread - count)
      console.log('📉 Decrementando contador de chat interno:', count, 'Novo valor:', this.chatInternoUnread)
    })

    // Listener para zerar contador quando chat for aberto
    this.$root.$on('chat-interno:aberto', () => {
      this.chatInternoUnread = 0
      console.log('🔄 Chat aberto, zerando contador')
    })
  },

  beforeDestroy () {
    console.log('🧹 MainLayout sendo destruído, limpando listeners...')

    // ✅ Limpar listeners globais
    this.$root.$off('chat-interno:incrementar-contador')
    this.$root.$off('chat-interno:mensagens-lidas')
    this.$root.$off('chat-interno:aberto')

    // ✅ Limpar listeners de socket específicos
    this.cleanupSocketListeners()

    // ❌ NÃO desconectar o socket global aqui!
    // Deixa o singleton gerenciar a conexão
  },

  methods: {
    filterByPermission (items) {
      if (!items || !items.length) return []
      if (!this.$store.getters.permissionsLoaded) return items
      return items.filter(item => {
        const perm = item.permission
        return !perm || this.$store.getters.can(perm)
      })
    },
    exibirMenuBeta (itemMenu) {
      if (!itemMenu?.isBeta) return true
      for (const domain of this.domainExperimentalsMenus) {
        if (this.usuario.email.indexOf(domain) !== -1) return true
      }
      return false
    },

    async listarWhatsapps () {
      const { data } = await ListarWhatsapps()
      this.$store.commit('LOAD_WHATSAPPS', data)
    },

    handlerNotifications (data) {
      const { message, contact, ticket } = data

      const options = {
        body: `${message.body} - ${format(new Date(), 'HH:mm')}`,
        icon: contact.profilePicUrl,
        tag: ticket.id,
        renotify: true
      }

      const notification = new Notification(
        `Mensagem de ${contact.name}`,
        options
      )

      notification.onclick = e => {
        e.preventDefault()
        window.focus()
        const payload = {
          ...ticket,
          accessSource: 'notification_click_layout',
          accessTab: 'notification',
          ticketStatusAtClick: ticket.status,
          queueIdAtClick: ticket.queueId,
          assignedUserId: ticket.userId || ticket.user?.id || null,
          assignedUserName: ticket.user?.name || null
        }
        this.$store.dispatch('AbrirChatMensagens', payload)
        this.$router.push({ name: 'atendimento' })
      }

      this.$nextTick(() => {
        if (this.$refs.audioNotification) {
          this.$refs.audioNotification.play()
        }
      })
    },

    async abrirModalUsuario () {
      this.modalUsuario = true
    },

    abrirChatInterno () {
      this.chatInternoAberto = true
    },

    fecharChatInterno () {
      this.chatInternoAberto = false
      this.chatInternoContatoAtivo = null
    },

    handleChatInternoContatoSelecionado (contatoId) {
      console.log('📌 Contato selecionado no chat interno:', contatoId)
      this.chatInternoContatoAtivo = contatoId
    },

    async efetuarLogout () {
      try {
        // ✅ Limpar listeners antes do logout
        this.cleanupSocketListeners()

        await RealizarLogout(this.usuario)
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        localStorage.removeItem('profile')
        localStorage.removeItem('userId')
        localStorage.removeItem('queues')
        localStorage.removeItem('usuario')
        localStorage.removeItem('filtrosAtendimento')

        this.$router.go({ name: 'login', replace: true })
      } catch (error) {
        this.$notificarErro('Não foi possível realizar logout', error)
      }
    },

    async listarConfiguracoes () {
      const { data } = await ListarConfiguracoes()
      localStorage.setItem('configuracoes', JSON.stringify(data))
    },

    conectarSocket (usuario) {
      console.log('🔌 Conectando socket no MainLayout')

      // ✅ Limpar listeners antigos primeiro
      this.cleanupSocketListeners()

      // Listener para atualização de bolhas online
      const updateBubblesListener = (data) => {
        this.$store.commit('SET_USERS_APP', data)
      }
      socket.on(`${usuario.tenantId}:chat:updateOnlineBubbles`, updateBubblesListener)
      this.socketListeners.push(`${usuario.tenantId}:chat:updateOnlineBubbles`)

      // Configurar listeners do chat interno
      this.setupChatInternoSocket(usuario)
    },

    setupChatInternoSocket (usuario) {
      const userId = Number(localStorage.getItem('userId'))

      console.log('📨 Configurando socket de chat interno no MainLayout')

      // Listener para chat interno
      const internalChatListener = (data) => {
        console.log('📬 Evento de chat interno recebido:', data)

        if (data.type === 'internalChat:message') {
          this.handleInternalChatMessage(data.payload, userId)
        } else if (data.type === 'internalChat:update') {
          this.handleInternalChatUpdate(data.payload)
        }
      }

      socket.on(`${usuario.tenantId}:internalChat`, internalChatListener)
      this.socketListeners.push(`${usuario.tenantId}:internalChat`)
    },

    handleInternalChatMessage (message, userId) {
      // ✅ VERIFICAR SE A MENSAGEM É PARA MIM
      const isMensagemParaMim =
        message.recipientId === userId || // Mensagem privada para mim
        message.groupId // Mensagem de grupo (todos os membros recebem)

      // Se não for mensagem para mim, ignorar
      if (!isMensagemParaMim) {
        console.log('ℹ️ Mensagem não é para mim, ignorando')
        return
      }

      // Se não for mensagem do próprio usuário
      if (message.senderId !== userId) {
        // Verificar se está dentro do chat do contato que enviou a mensagem
        const isDentroDoContatoQueEnviou =
          this.chatInternoContatoAtivo === message.senderId ||
          this.chatInternoContatoAtivo === `group-${message.groupId}`

        // ✅ Notificação visual e incremento: SOMENTE se o chat estiver FECHADO
        if (!this.chatInternoAberto) {
          console.log('➕ MainLayout: Chat fechado, incrementando contador')
          this.chatInternoUnread++

          // Notificação visual (apenas uma por vez)
          const senderName = message.sender?.name || 'Usuário'
          const groupName = message.group?.name || ''
          const notificationText = message.groupId
            ? `${senderName} (${groupName}): ${message.message.substring(0, 40)}`
            : `${senderName}: ${message.message.substring(0, 50)}`

          // Limpar notificações anteriores para evitar spam
          this.$q.notify({
            type: 'info',
            message: `💬 ${notificationText}${message.message.length > 40 ? '...' : ''}`,
            position: 'top-right',
            timeout: 4000,
            group: 'chat-interno',
            actions: [
              {
                label: 'Ver',
                color: 'white',
                handler: () => {
                  this.abrirChatInterno()
                }
              }
            ]
          })
        } else {
          console.log('ℹ️ MainLayout: Modal aberto, ChatModal gerencia incremento')
        }

        // ✅ SOM: Tocar se NÃO estiver dentro do chat daquele contato específico
        if (!isDentroDoContatoQueEnviou) {
          console.log('🔔 Tocando som de notificação (não está no chat do contato)')
          if (this.$refs.audioChatInterno && !this._lastNotificationSound) {
            this.$refs.audioChatInterno.play()
            this._lastNotificationSound = Date.now()

            // Resetar após 2 segundos para permitir som novamente
            setTimeout(() => {
              this._lastNotificationSound = null
            }, 2000)
          }
        } else {
          console.log('🔕 Não tocar som (está dentro do chat do contato)')
        }
      }
    },

    handleInternalChatUpdate (update) {
      if (update.action === 'markAsRead') {
        console.log('📖 Mensagens marcadas como lidas no backend:', update.count, 'mensagens')

        // Decrementar contador global se necessário
        if (update.count > 0) {
          this.chatInternoUnread = Math.max(0, this.chatInternoUnread - update.count)
          console.log('📉 Contador global atualizado para:', this.chatInternoUnread)
        }
      }
    },

    // ✅ NOVO MÉTODO: Limpeza de listeners de socket
    cleanupSocketListeners () {
      console.log('🧹 Limpando listeners de socket do MainLayout')

      if (this.socketListeners && this.socketListeners.length > 0) {
        this.socketListeners.forEach(event => {
          socket.off(event)
          console.log('🗑️ Removido listener:', event)
        })
        this.socketListeners = []
      }
    },

    async carregarChatInternoUnread () {
      try {
        if (!this.$axios) {
          console.error('❌ $axios não disponível')
          return
        }

        // ✅ Carregar contadores de chats privados E grupos
        const [chatsResponse, groupsResponse] = await Promise.all([
          this.$axios.get('/internal-chat/chats'),
          this.$axios.get('/internal-groups')
        ])

        // Somar mensagens não lidas de chats privados
        const chatsUnread = chatsResponse.data.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)

        // Somar mensagens não lidas de grupos
        const groupsUnread = groupsResponse.data.reduce((sum, group) => sum + (group.unreadCount || 0), 0)

        // Total
        this.chatInternoUnread = chatsUnread + groupsUnread

        console.log('📊 Contador de chat interno carregado:')
        console.log('   - Chats privados:', chatsUnread)
        console.log('   - Grupos:', groupsUnread)
        console.log('   - Total:', this.chatInternoUnread)
      } catch (error) {
        console.error('Erro ao carregar contador de chat interno:', error)
      }
    },

    socketListenUserUpdate () {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
      const userId = usuario.userId || usuario.id

      console.log('🎯 Configurando listener de atualização de usuário')

      // Entrar no room pessoal do usuário
      const room = `${usuario.tenantId}:${userId}`
      const event = `${usuario.tenantId}:user:update`

      socket.emit(`${usuario.tenantId}:joinUserRoom`, userId)
      console.log(`✅ Usuário ${userId} solicitou entrar no room ${room}`)

      // Listener para atualização de usuário
      const userUpdateListener = (data) => {
        console.log('🔔 Socket recebido:', event, data)

        // Verificar se a atualização é para o usuário logado
        if (data.user.id === userId) {
          console.log('✅ Dados do usuário atualizados, recarregando queues...', data.user)

          // Atualizar localStorage com novos dados
          const usuarioAtualizado = {
            ...usuario,
            queues: data.user.queues,
            managerQueues: data.user.managerQueues
          }

          localStorage.setItem('usuario', JSON.stringify(usuarioAtualizado))
          localStorage.setItem('queues', JSON.stringify(data.user.queues))
          localStorage.setItem('managerQueues', JSON.stringify(data.user.managerQueues || []))

          // Atualizar variável local
          this.usuario = usuarioAtualizado

          // Atualizar Vuex para reatividade
          this.$store.commit('SET_USER_QUEUES', data.user.queues)

          // Notificar o usuário
          this.$q.notify({
            type: 'positive',
            message: 'Seus departamentos foram atualizados!',
            position: 'top',
            timeout: 3000
          })

          // Emitir evento para atualizar componentes filhos
          this.$root.$emit('user-queues-updated', data.user.queues)
        }
      }

      socket.on(event, userUpdateListener)
      this.socketListeners.push(event)
    },

    atualizarUsuario () {
      this.usuario = JSON.parse(localStorage.getItem('usuario'))
      if (this.usuario.status === 'offline') {
        socket.emit(`${this.usuario.tenantId}:setUserIdle`)
      }
      if (this.usuario.status === 'online') {
        socket.emit(`${this.usuario.tenantId}:setUserActive`)
      }
    },

    async consultarTickets () {
      const params = {
        searchParam: '',
        pageNumber: 1,
        status: ['open'],
        showAll: false,
        count: null,
        queuesIds: [],
        withUnreadMessages: true,
        isNotAssignedUser: false,
        includeNotQueueDefined: true
      }
      try {
        const { data } = await ConsultarTickets(params)
        this.countTickets = data.count
        this.$store.commit('UPDATE_NOTIFICATIONS', data)
      } catch (err) {
        this.$notificarErro('Algum problema', err)
        console.error(err)
      }

      const params2 = {
        searchParam: '',
        pageNumber: 1,
        status: ['pending'],
        showAll: false,
        count: null,
        queuesIds: [],
        withUnreadMessages: false,
        isNotAssignedUser: false,
        includeNotQueueDefined: true
      }
      try {
        const { data } = await ConsultarTickets(params2)
        this.countTickets = data.count
        this.$store.commit('UPDATE_NOTIFICATIONS_P', data)
      } catch (err) {
        this.$notificarErro('Algum problema', err)
        console.error(err)
      }
    },

    abrirChatContato (ticket) {
      if (this.$q.screen.lt.md && ticket.status !== 'pending') {
        this.$root.$emit('infor-cabecalo-chat:acao-menu')
      }
      if (!(ticket.status !== 'pending' && (ticket.id !== this.$store.getters.ticketFocado.id || this.$route.name !== 'chat'))) return
      this.$store.commit('SET_HAS_MORE', true)
      const payload = {
        ...ticket,
        accessSource: 'menu_abrir_ticket',
        accessTab: this.selectedTab || 'menu',
        ticketStatusAtClick: ticket.status,
        queueIdAtClick: ticket.queueId,
        assignedUserId: ticket.userId || ticket.user?.id || null,
        assignedUserName: ticket.user?.name || null
      }
      this.$store.dispatch('AbrirChatMensagens', payload)
    },

    abrirAtendimentoExistente (contato, ticket) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `${contato} possui um atendimento em curso (Atendimento: ${ticket.id}). Deseja abrir o atendimento?`,
        cancel: {
          label: 'Não',
          color: 'primary',
          push: true
        },
        ok: {
          label: 'Sim',
          color: 'negative',
          push: true
        },
        persistent: true
      }).onOk(async () => {
        try {
          this.abrirChatContato(ticket)
        } catch (error) {
          this.$notificarErro('Não foi possível atualizar o token', error)
        }
      })
    },

    async abrirSuporte () {
      this.$q.dialog({
        title: 'Suporte CognosBot',
        message: 'Como deseja falar com nosso suporte?',
        options: {
          type: 'radio',
          model: 'internal',
          items: [
            {
              label: 'Abrir ticket com o suporte',
              value: 'internal',
              color: 'primary'
            },
            {
              label: 'Redirecionar para o whatsapp',
              value: 'whatsapp',
              color: 'green'
            }
          ]
        },
        cancel: {
          label: 'Cancelar',
          color: 'grey',
          push: true
        },
        ok: {
          label: 'Continuar',
          color: 'primary',
          push: true
        },
        persistent: true
      }).onOk(async opcao => {
        const escolha = opcao || 'internal'
        if (escolha === 'whatsapp') {
          this.abrirSuporteWhatsapp()
        } else {
          await this.abrirSuporteInterno()
        }
      })
    },
    async abrirSuporteInterno () {
      if (this.loadingSuporte) return
      this.loadingSuporte = true
      if (this.$q.loading && this.$q.loading.show) {
        this.$q.loading.show({ message: 'Abrindo chat de suporte...' })
      }
      try {
        let contato = await this.buscarContatoSuporte()
        if (!contato) {
          const { data } = await CriarContato({
            name: SUPPORT_NAME,
            number: SUPPORT_NUMBER,
            email: '',
            extraInfo: [],
            tags: [],
            wallets: []
          })
          contato = data
        }

        const userId = this.usuario?.userId || this.usuario?.id || +localStorage.getItem('userId')
        let ticket

        try {
          const { data } = await CriarTicket({
            contactId: contato.id,
            isActiveDemand: true,
            userId,
            channel: SUPPORT_CHANNEL,
            channelId: contato?.whatsappId || null,
            status: 'open',
            origin: 'support'
          })
          ticket = data
        } catch (error) {
          if (error?.status === 409 && error?.data?.error) {
            ticket = JSON.parse(error.data.error)
          } else {
            throw error
          }
        }

        if (ticket?.status === 'pending') {
          ticket = await this.atenderTicketSuporte(ticket, userId)
        }

        if (!ticket) {
          throw new Error('Não foi possível localizar o ticket de suporte.')
        }

        const payload = {
          ...ticket,
          accessSource: 'support_button',
          accessTab: 'support',
          ticketStatusAtClick: ticket.status,
          queueIdAtClick: ticket.queueId,
          assignedUserId: ticket.userId || ticket.user?.id || userId || null,
          assignedUserName: ticket.user?.name || this.usuario?.name || null
        }

        await this.$store.dispatch('AbrirChatMensagens', payload)
        this.$router.push({ name: 'chat', params: { ticketId: ticket.id } })

        this.$q.notify({
          type: 'positive',
          position: 'top',
          message: 'Chat de suporte aberto!',
          timeout: 3000
        })
      } catch (error) {
        console.error('Erro ao abrir suporte interno:', error)
        this.$notificarErro('Não foi possível abrir o chat de suporte', error)
      } finally {
        if (this.$q.loading && this.$q.loading.hide) {
          this.$q.loading.hide()
        }
        this.loadingSuporte = false
      }
    },
    abrirSuporteWhatsapp () {
      try {
        window.open(
          'https://wa.me/557196205926?text=Olá%2C%20preciso%20de%20ajuda%20com%20um%20suporte%20técnico.%20Poderia%20me%20ajudar%3F',
          '_blank'
        )
      } catch (error) {
        console.error('Erro ao abrir suporte no WhatsApp:', error)
        this.$notificarErro('Erro ao abrir suporte no WhatsApp', error)
      }
    },
    async buscarContatoSuporte () {
      try {
        const { data } = await ListarContatos({
          pageNumber: 1,
          searchParam: SUPPORT_NUMBER
        })
        const contatos = data?.contacts || []
        const normalizar = valor => (valor || '').toString().replace(/\D/g, '')
        return contatos.find(contato => normalizar(contato.number) === SUPPORT_NUMBER)
      } catch (error) {
        console.error('Erro ao buscar contato de suporte:', error)
        return null
      }
    },
    async atenderTicketSuporte (ticket, userId) {
      try {
        const response = await AtualizarStatusTicket(ticket.id, 'open', userId, {
          origin: 'support'
        })
        return response?.data || ticket
      } catch (error) {
        console.error('Erro ao iniciar atendimento de suporte:', error)
        throw error
      }
    }
  }

  // ❌ REMOVIDO: destroyed() com socket.disconnect()
  // Deixa o singleton gerenciar a conexão
}
</script>
<style scoped>
.q-img__image {
  background-size: contain;
}
</style>
