<template>
  <q-list separator
    class="q-px-sm q-py-none q-pt-sm">
    <!-- :clickable="ticket.status !== 'pending' && (ticket.id !== $store.getters['ticketFocado'].id || $route.name !== 'chat')" -->
    <q-item clickable
      style="height: 120px; max-width: 100%;"
      @click="abrirChatContato(ticket)"
      :style="`border-left: 5px solid ${borderColor[ticket.status]}; border-radius: 10px`"
      id="item-ticket-houve"
      class="ticketBorder q-px-sm"
      :class="{
        'ticketBorderGrey': !$q.dark.isActive,
        'ticket-active-item': ticket.id === $store.getters['ticketFocado'].id,
        'ticketNotAnswered': ticket.answered == false && ticket.isGroup == false && ticket.status == 'open'
      }">
      <q-item-section avatar
        class="q-px-none">
        <q-btn flat
          @click="iniciarAtendimento(ticket)"
          push
          color="primary"
          dense
          round
          v-if="ticket.status === 'pending' || (buscaTicket && ticket.status === 'pending')">
          <q-badge v-if="ticket.unreadMessages"
            style="border-radius: 10px;"
            class="text-center text-bold"
            floating
            dense
            text-color="black"
            color="blue-2"
            :label="ticket.unreadMessages" />
          <q-avatar>
            <q-icon size="45px"
              name="mdi-account-arrow-right" />
          </q-avatar>
          <q-tooltip>
            Atender
          </q-tooltip>
        </q-btn>
        <q-avatar size="45px"
          v-if="ticket.status !== 'pending'"
          class="relative-position">
          <q-badge v-if="ticket.unreadMessages"
            style="border-radius: 10px; z-index: 99"
            class="text-center text-bold"
            floating
            dense
            color="blue-2"
            text-color="black"
            :label="ticket.unreadMessages" />
          <img :src="getProfilePicUrl(ticket)"
            onerror="this.style.display='none'"
            v-show="getProfilePicUrl(ticket)">
          <q-icon size="45px"
            name="mdi-account-circle"
            color="grey-8" />
        </q-avatar>

      </q-item-section>
      <q-item-section id="ListItemsTicket">
        <q-item-label class="text-bold"
          lines="1">
          {{ truncateMessage(getTicketDisplayName(ticket), 20) }}
          <q-badge v-if="(ticket.contact && ticket.contact.isBlocked) || ticket.contactIsBlocked" color="negative" label="Bloqueado" class="q-ml-xs" dense />
          <q-icon size="20px"
            :name="`img:${ticket.channel}-logo.png`" />

          <!-- Etiquetas sobrepostas -->
          <div class="tags-container q-ml-xs" v-if="getTags(ticket) && getTags(ticket).length > 0">
            <div
              v-for="(tag, index) in getTags(ticket).slice(0, 3)"
              :key="tag.id"
              class="tag-icon"
              :style="{
                'background-color': tag.color,
                'z-index': 10 - index,
                'margin-left': index > 0 ? '-8px' : '0'
              }"
            >
              <q-icon name="mdi-pound" size="12px" color="white" />
            </div>
            <q-tooltip v-if="getTags(ticket).length > 0">
              <div class="text-center">
                <div class="text-bold q-mb-xs">Etiquetas:</div>
                <div v-for="tag in getTags(ticket)" :key="tag.id" class="q-mb-xs">
                  <q-icon name="mdi-pound" :style="`color: ${tag.color}`" class="q-mr-xs" />
                  {{ tag.tag }}
                </div>
              </div>
            </q-tooltip>
          </div>

          <q-chip size="sm" class="modern-chip-bot" color="primary" text-color="white" v-if="(ticket.stepAutoReplyId && ticket.autoReplyId && ticket.status === 'pending') || (ticket.chatFlowId && ticket.stepChatFlow && ticket.status === 'pending')">
            <q-icon name="mdi-robot" size="12px" />
            <q-tooltip>
              ChatBot atendendo
            </q-tooltip>
          </q-chip>
          <q-chip size="sm" class="modern-chip-bot" color="orange" text-color="white" v-if="ticket.status === 'pending_evaluation'">
            <q-icon name="mdi-star-check" size="12px" />
            <q-tooltip>
              Aguardando avaliação do cliente
            </q-tooltip>
          </q-chip>
          <span class="absolute-top-right q-pr-xs">
            <q-badge dense
              style="font-size: .7em;"
              transparent
              square
              text-color="grey-10"
              color="secondary"
              :label="dataInWords(ticket.lastMessageAt, ticket.updatedAt)"
              :key="recalcularHora" />
          </span>
          <span class="absolute-top-left q-pl-xs q-pt-xs">
            <q-badge dense
              style="font-size: .8em;"
              transparent
              square
              text-color="grey-8"
              color="grey-3"
              :label="`#${ticket.id}`" />
          </span>
        </q-item-label>
        <q-item-label lines="1"
          caption>
          <q-icon name="mdi-message-text-outline"
            size="14px"
            color="grey-6"
            class="q-mr-xs" />
          {{ truncateMessage(ticket.lastMessage, 40) }}
        </q-item-label>
        <q-item-label lines="1"
          caption>
          <span class="absolute-bottom-right">
            <q-icon v-if="ticket.status === 'closed'"
              name="mdi-check-circle-outline"
              color="positive"
              size="1.8em"
              class="q-mb-sm">
              <q-tooltip>
                Atendimento Resolvido
              </q-tooltip>
            </q-icon>
            <!-- Botão de espiar para tickets pendentes -->
            <q-btn v-if="ticket.status === 'pending'"
              @click="espiarAtendimento(ticket)"
              flat
              dense
              round
              size="sm"
              color="info"
              class="q-mb-xs q-mr-xs">
              <q-icon name="mdi-eye" size="16px" />
              <q-tooltip>
                Espiar
              </q-tooltip>
            </q-btn>
          </span>
        </q-item-label>
        <!-- Status do ChatBot - Posição melhorada -->
        <!--<div class="absolute-top-right q-pr-xs q-pt-xs" v-if="(ticket.stepAutoReplyId && ticket.autoReplyId && ticket.status === 'pending') || (ticket.chatFlowId && ticket.stepChatFlow && ticket.status === 'pending')">
          <q-chip size="sm" class="modern-chip-bot" color="primary" text-color="white">
            <q-icon name="mdi-robot" size="12px" class="q-mr-xs" />
            <span class="text-caption">BOT</span>
            <q-tooltip>
              ChatBot atendendo
            </q-tooltip>
          </q-chip>
        </div>-->

        <!-- Chips de informações - Layout melhorado -->
        <div class="row items-center q-gutter-xs q-mt-sm chips-container">

          <q-chip size="sm" class="modern-chip modern-chip-whatsapp" v-if="ticket.whatsapp && ticket.whatsapp.name">
            <q-icon name="mdi-whatsapp" size="12px" class="q-mr-xs" />
            <span class="chip-text">{{ truncateText(ticket.whatsapp.name, 8) }}</span>
            <q-tooltip>
              Conexão: {{ ticket.whatsapp.name}}
            </q-tooltip>
          </q-chip>

          <q-chip size="sm" class="modern-chip modern-chip-whatsapp" v-if="!ticket.whatsapp || !ticket.whatsapp.name">
            <q-icon name="mdi-whatsapp" size="12px" class="q-mr-xs" />
            <span class="chip-text">WhatsApp</span>
            <q-tooltip>
              Conexão: WhatsApp
            </q-tooltip>
          </q-chip>

          <q-chip size="sm" class="modern-chip modern-chip-user">
            <q-icon name="mdi-account-outline" size="12px" class="q-mr-xs" />
            <span class="chip-text">{{ truncateText(ticket.username || (ticket.user && ticket.user.name) || 'BOT', 8) }}</span>
            <q-tooltip>
              Usuário: {{ ticket.username || (ticket.user && ticket.user.name) || 'BOT' }}
            </q-tooltip>
          </q-chip>

          <q-chip size="sm" class="modern-chip modern-chip-queue" v-if="ticket.queue || obterNomeFila(ticket)">
            <q-icon name="mdi-account-group-outline" size="12px" class="q-mr-xs" />
            <span class="chip-text">{{ truncateText(ticket.queue || obterNomeFila(ticket), 8) }}</span>
            <q-tooltip>
              Departamento: {{ ticket.queue || obterNomeFila(ticket) }}
            </q-tooltip>
          </q-chip>
        </div>

        <!-- <span class="absolute-bottom-right" v-if="ticket.unreadMessages">
          <q-badge style="font-size: .8em; border-radius: 10px;" class="q-py-xs" dense text-color="white" color="green" :label="ticket.unreadMessages" />
        </span> -->
      </q-item-section>
    </q-item>
    <q-separator color="grey-2"
      inset="item" />
    <!-- <q-separator /> -->
  </q-list>
</template>

<script>
import { formatDistance, parseJSON } from 'date-fns'
import pt from 'date-fns/locale/pt-BR'
import mixinAtualizarStatusTicket from './mixinAtualizarStatusTicket'
import { outlinedAccountCircle } from '@quasar/extras/material-icons-outlined'
import { formatPhoneDisplay } from 'src/utils/formatPhoneDisplay'

export default {
  name: 'ItemTicket',
  mixins: [mixinAtualizarStatusTicket],
  data () {
    return {
      outlinedAccountCircle,
      recalcularHora: 1,
      statusAbreviado: {
        open: 'A',
        pending: 'P',
        closed: 'R',
        pending_evaluation: 'AV'
      },
      status: {
        open: 'Aberto',
        pending: 'Pendente',
        closed: 'Resolvido',
        pending_evaluation: 'Aguardando Avaliação'
      },
      color: {
        open: 'primary',
        pending: 'negative',
        closed: 'positive',
        pending_evaluation: 'orange'
      },
      borderColor: {
        open: 'primary',
        pending: 'negative',
        closed: 'positive',
        pending_evaluation: 'orange'
      }
    }
  },
  props: {
    ticket: {
      type: Object,
      default: () => {
      }
    },
    buscaTicket: {
      type: Boolean,
      default: false
    },
    filas: {
      type: Array,
      default: () => []
    },
    origemAba: {
      type: String,
      default: 'open'
    }
  },
  methods: {
    getTicketDisplayName (ticket) {
      const name = ticket.name || (ticket.contact && ticket.contact.name) || ''
      if (name && /^\d{10,}$/.test(String(name).replace(/\s/g, ''))) {
        return formatPhoneDisplay(name)
      }
      return name
    },
    getProfilePicUrl (ticket) {
      // Verificar se está no nível raiz (ticket da lista)
      if (ticket.profilePicUrl) {
        return ticket.profilePicUrl
      }
      // Verificar se está dentro do contact (ticket focado)
      if (ticket.contact && ticket.contact.profilePicUrl) {
        return ticket.contact.profilePicUrl
      }
      return null
    },
    getTags (ticket) {
      // Verificar se está no nível raiz (ticket da lista)
      if (ticket.tags && Array.isArray(ticket.tags)) {
        return ticket.tags
      }
      // Verificar se está dentro do contact (ticket focado)
      if (ticket.contact && ticket.contact.tags && Array.isArray(ticket.contact.tags)) {
        return ticket.contact.tags
      }
      return []
    },
    truncateMessage (message, maxLength = 60) {
      if (message === null || message === undefined) return ''
      const value = typeof message === 'string' ? message : String(message)
      if (value.length <= maxLength) return value
      return value.substring(0, maxLength) + '...'
    },
    truncateText (text, maxLength = 15) {
      if (text === null || text === undefined) return ''
      const value = typeof text === 'string' ? text : String(text)
      if (value.length <= maxLength) return value
      return value.substring(0, maxLength) + '...'
    },
    obterNomeFila (ticket) {
      try {
        const fila = this.filas.find(f => f.id === ticket.queueId)
        if (fila) {
          return fila.queue
        }
        return ''
      } catch (error) {
        return ''
      }
    },
    dataInWords (timestamp, updated) {
      let data = parseJSON(updated)
      if (timestamp) {
        data = new Date(Number(timestamp))
      }
      return formatDistance(data, new Date(), { locale: pt })
    },
    abrirChatContato (ticket) {
      // caso esteja em um tamanho mobile, fechar a drawer dos contatos
      if (this.$q.screen.lt.md && ticket.status !== 'pending') {
        this.$root.$emit('infor-cabecalo-chat:acao-menu')
      }
      if (!(ticket.status !== 'pending' && (ticket.id !== this.$store.getters.ticketFocado.id || this.$route.name !== 'chat'))) return

      // Resetar modo espiar quando abrir um ticket normalmente (não espiar)
      this.$store.commit('SET_MODO_ESPIAR', false)
      this.$store.commit('SET_HAS_MORE', true)
      const origemMap = {
        open: 'aba_atendimento',
        pending: 'aba_em_fila',
        closed: 'aba_encerrados',
        group: 'aba_grupos'
      }
      const accessSource = origemMap[this.origemAba] || this.origemAba || 'item_ticket'
      const payload = {
        ...ticket,
        accessSource,
        accessTab: this.origemAba,
        ticketStatusAtClick: ticket.status,
        queueIdAtClick: ticket.queueId,
        assignedUserId: ticket.userId || ticket.user?.id || null,
        assignedUserName: ticket.user?.name || null
      }
      this.$store.dispatch('AbrirChatMensagens', payload)
    }
  },
  created () {
    setInterval(() => {
      this.recalcularHora++
    }, 50000)
  }
}
</script>

<style lang="sass">
img:after
  content: ""
  vertical-align: middle
  display: inline-block
  border-radius: 50%
  font-size: 48px
  position: absolute
  top: 0
  left: 0
  width: inherit
  height: inherit
  z-index: 10
  background: #ebebeb url('http://via.placeholder.com/300?text=PlaceHolder') no-repeat center
  color: transparent

.ticket-active-item
  border-radius: 12px
  position: relative
  height: 100%
  background: linear-gradient(135deg, $blue-1 0%, $blue-2 100%)
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
  transform: translateY(-2px)

#ListItemsTicket
  .q-item__label + .q-item__label
    margin-top: 2px

#item-ticket-houve
  border-radius: 12px
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
  margin-bottom: 4px

  &:hover
    background: linear-gradient(135deg, $blue-1 0%, $blue-2 100%)
    transform: translateY(-1px)
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12)
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

.primary
  border-left: 4px solid $primary
  border-radius: 12px 0 0 12px

.negative
  border-left: 4px solid $negative
  border-radius: 12px 0 0 12px

.positive
  border-left: 4px solid $positive
  border-radius: 12px 0 0 12px

.ticketNotAnswered
  border-left: 4px solid $amber !important
  border-radius: 12px 0 0 12px

.ticketBorder
  border-left: 4px solid $grey-9
  border-radius: 12px 0 0 12px

.ticketBorderGrey
  border-left: 4px solid $grey-4
  border-radius: 12px 0 0 12px

// Estilização moderna para badges e elementos
.q-badge
  border-radius: 8px !important
  font-weight: 500

// Melhor espaçamento e tipografia
.q-item__label
  line-height: 1.4

// Truncar texto da última mensagem
.q-item__label[lines="1"]
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

// Efeito de glassmorphism para o item ativo
.ticket-active-item::before
  content: ''
  position: absolute
  top: 0
  left: 0
  right: 0
  bottom: 0
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)
  border-radius: 12px
  pointer-events: none

// Estilos modernos para os chips
.modern-chip
  border-radius: 16px !important
  font-weight: 500
  font-size: 0.75rem
  height: 24px
  min-height: 24px
  max-height: 24px
  padding: 0 8px
  max-width: 120px
  min-width: 60px
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
  transition: all 0.2s ease
  flex-shrink: 0

.modern-chip-bot
  background: linear-gradient(135deg, $primary 0%, lighten($primary, 10%) 100%) !important
  color: white !important
  font-weight: 600
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15)

.modern-chip-user
  background: linear-gradient(135deg, $grey-2 0%, $grey-3 100%) !important
  color: $grey-8 !important

.modern-chip-whatsapp
  background: linear-gradient(135deg, #128C7E 0%, #075E54 100%) !important
  color: white !important

.modern-chip-queue
  background: linear-gradient(135deg, $grey-2 0%, $grey-3 100%) !important
  color: $grey-8 !important

// Texto dos chips com tamanho fixo
.chip-text
  max-width: 80px
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap
  display: inline-block
  font-size: 0.7rem

// Hover effects para chips
.modern-chip:hover
  transform: translateY(-1px)
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15)

// Estilos para etiquetas sobrepostas
.tags-container
  display: inline-flex
  align-items: center
  position: relative

.tag-icon
  width: 20px
  height: 20px
  border-radius: 50%
  display: flex
  align-items: center
  justify-content: center
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2)
  border: 2px solid white
  transition: all 0.2s ease
  position: relative

  &:hover
    transform: scale(1.1)
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3)

// Efeito de sobreposição para múltiplas etiquetas
.tag-icon:not(:first-child)
  position: relative

  &::before
    content: ''
    position: absolute
    left: -2px
    top: 50%
    transform: translateY(-50%)
    width: 2px
    height: 2px
    background: white
    border-radius: 50%
    z-index: 1

// Container dos chips com controle de overflow
.chips-container
  overflow: hidden
  flex-wrap: nowrap
  max-width: 100%
  min-height: 28px
</style>
