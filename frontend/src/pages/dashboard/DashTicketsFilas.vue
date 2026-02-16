<template>
  <div class="bg-grey-1" style="height: 100vh">
    <div class="row q-pa-md justify-between items-center">
      <div class="text-h4 text-weight-light">Painel de Atendimentos</div>
      <q-btn outline rounded color="primary" v-if="profile === 'admin' || profile === 'gerente'" icon="mdi-filter-variant" label="Filtros"
        @click="visualizarFiltros = true" />
    </div>

    <div class="q-px-md q-pb-md">
      <q-input v-model="searchParam" bg-color="white" outlined rounded dense debounce="300"
        placeholder="Pesquisar por nome do contato ou ID do ticket...">
        <template v-slot:prepend>
          <q-icon name="mdi-magnify" />
        </template>
        <template v-if="searchParam" v-slot:append>
          <q-icon name="mdi-close" @click="searchParam = ''" class="cursor-pointer" />
        </template>
      </q-input>
    </div>

    <div class="q-px-md">
      <q-dialog full-height position="right" v-model="visualizarFiltros">
        <q-card style="width: 300px">
          <q-card-section>
            <div class="text-h6">Filtros</div>
          </q-card-section>
          <q-card-section class="q-gutter-md">
            <DatePick dense class="row col" v-model="pesquisaTickets.dateStart" />
            <DatePick dense class="row col" v-model="pesquisaTickets.dateEnd" />
            <q-separator v-if="profile === 'admin' || profile === 'gerente'" />
            <q-toggle v-if="profile === 'admin' || profile === 'gerente'" class="q-ml-lg" v-model="pesquisaTickets.showAll"
              :label="`(${profile === 'admin' ? 'Admin' : 'Gerente'}) - Visualizar Todos`" />
            <q-separator class="q-mb-md" v-if="profile === 'admin' || profile === 'gerente'" />

            <q-select v-if="!pesquisaTickets.showAll" square dense outlined hide-bottom-space emit-value map-options
              multiple options-dense use-chips label="Departamentos" color="primary" v-model="pesquisaTickets.queuesIds"
              :options="filas" :input-debounce="700" option-value="id" option-label="queue"
              input-style="width: 280px; max-width: 280px;" />
            <!-- @input="debounce(BuscarTicketFiltro(), 700)" -->
          </q-card-section>
          <q-card-section>
            <q-separator />
            <div class="text-h6 q-mt-md">Tipo de visualização</div>
            <q-option-group :options="optionsVisao" label="Visão" type="radio" v-model="visao" />
          </q-card-section>
          <q-card-actions align="center">
            <q-btn outline label="Atualizar" color="primary" v-close-popup @click="consultarTickets" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <div class="row q-col-gutter-md">
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-item class="bg-white q-pa-none q-py-sm" style="border-radius: 8px;">
            <q-item-section side class="q-pa-md q-mr-none">
              <q-icon name="mdi-forum-outline" color="grey-8" size="md" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-h6 text-weight-bold">{{ ticketStats.total }}</q-item-label>
              <q-item-label caption>Total</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-item class="bg-white q-pa-none q-py-sm" style="border-radius: 8px;">
            <q-item-section side class="q-pa-md q-mr-none">
              <q-icon name="mdi-folder-open-outline" color="primary" size="md" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-h6 text-weight-bold text-primary">{{ ticketStats.open }}</q-item-label>
              <q-item-label caption>Abertos</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-item class="bg-white q-pa-none q-py-sm" style="border-radius: 8px;">
            <q-item-section side class="q-pa-md q-mr-none">
              <q-icon name="mdi-clock-fast" color="negative" size="md" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-h6 text-weight-bold text-negative">{{ ticketStats.pending }}</q-item-label>
              <q-item-label caption>Pendentes</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <div class="col-xs-12 col-sm-6 col-md-3">
          <q-item class="bg-white q-pa-none q-py-sm" style="border-radius: 8px;">
            <q-item-section side class="q-pa-md q-mr-none">
              <q-icon name="mdi-check-all" color="positive" size="md" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-h6 text-weight-bold text-positive">{{ ticketStats.closed }}</q-item-label>
              <q-item-label caption>Encerrados</q-item-label>
            </q-item-section>
          </q-item>
        </div>
      </div>
    </div>
    <q-separator class="q-my-md" />

    <div style="height: 75vh" class="scroll q-px-md">
      <div
        v-for="(items, key) in sets"
        :key="key"
        :style="{ height: 800 }"
        class="row q-col-gutter-md q-mb-sm">
        <div :class="contentClass" v-for="(item, index) in items" :key="index">
          <q-card style="border-radius: 12px;" flat bordered class="card-atendimento bg-white full-height">
            <q-item v-if="visao === 'U' || visao === 'US'" class="q-py-md" :class="{
              'bg-red-1 text-red-8': definirNomeUsuario(item[0]) === 'Pendente'
            }">
              <q-item-section avatar>
                <q-avatar :color="definirNomeUsuario(item[0]) === 'Pendente' ? 'negative' : 'primary'"
                  text-color="white"
                  :icon="definirNomeUsuario(item[0]) === 'Pendente' ? 'mdi-account-clock-outline' : 'mdi-account-circle-outline'" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ definirNomeUsuario(item[0]) }}</q-item-label>
                <q-item-label caption :class="{
                  'text-red-8': definirNomeUsuario(item[0]) === 'Pendente'
                }">
                  Atendimentos: {{ filteredTickets(item, index).length }}
                </q-item-label>
              </q-item-section>
              <q-item-section side v-if="index !== 'null'">
                <q-select borderless dense v-model="userTicketFilters[index]" :options="statusOptions" emit-value
                  map-options style="min-width: 120px;" />
              </q-item-section>
            </q-item>

            <q-item v-if="visao === 'F' || visao === 'FS'" class="q-py-md" :class="{
              'bg-red-1 text-red-8': definirNomeFila(item[0]) === 'Sem Departamento'
            }">
              <q-item-section avatar>
                <q-avatar :color="definirNomeFila(item[0]) === 'Sem Departamento' ? 'negative' : 'primary'"
                  text-color="white" icon="mdi-sitemap-outline" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ definirNomeFila(item[0]) }}</q-item-label>
                <q-item-label caption :class="{
                  'text-red-8': definirNomeFila(item[0]) === 'Sem Departamento'
                }">
                  Abertos: {{ counterStatus(item).open }} | Pendentes: {{ counterStatus(item).pending }} | Total: {{
                    item.length
                  }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-separator />
            <q-card-section :style="{ height: '320px' }" class="scroll" v-if="visao === 'U' || visao === 'F'">
              <ItemTicket v-for="(ticket, i) in filteredTickets(item, index)" :key="i" :ticket="ticket"
                :filas="filas" />
            </q-card-section>
          </q-card>
        </div>
        <q-resize-observer @resize="onResize"></q-resize-observer>
      </div>
    </div>

  </div>
</template>

<script>
const usuario = JSON.parse(localStorage.getItem('usuario'))
import { getSocket } from 'src/utils/socket' // ✅ IMPORT CORRETO

// ✅ USAR INSTÂNCIA ÚNICA
const socket = getSocket()

import ItemTicket from 'src/pages/atendimento/ItemTicket'
import { ConsultarTicketsQueuesService } from 'src/service/estatisticas.js'
import { ListarFilas } from 'src/service/filas'
const UserQueues = localStorage.getItem('queues')
import { groupBy } from 'lodash'
const profile = localStorage.getItem('profile')
import { format, sub } from 'date-fns'

export default {
  name: 'DashBoard',
  components: { ItemTicket },
  data () {
    return {
      profile: profile,
      visualizarFiltros: false,
      slide: 0,
      height: 400,
      searchParam: '',
      userTicketFilters: {},
      statusOptions: [
        { label: 'Todos', value: 'all' },
        { label: 'Pendentes', value: 'pending' },
        { label: 'Em Atendimento', value: 'open' },
        { label: 'Resolvidos', value: 'closed' }
      ],
      optionsVisao: [
        { label: 'Por Usuário', value: 'U' },
        { label: 'Por Usuário (Sintético)', value: 'US' },
        { label: 'Por Departamentos', value: 'F' },
        { label: 'Por Departamentos (Sintético)', value: 'FS' }
      ],
      visao: 'U',
      pesquisaTickets: {
        showAll: true,
        dateStart: format(sub(new Date(), { days: 30 }), 'yyyy-MM-dd'),
        dateEnd: format(new Date(), 'yyyy-MM-dd'),
        queuesIds: []
      },
      tickets: [],
      filas: [],
      sizes: { lg: 3, md: 3, sm: 2, xs: 1 },
      socketListeners: [] // ✅ NOVO: Controlar listeners
    }
  },

  computed: {
    contentClass () {
      let contentClass = 'col'
      const keysLenSize = Object.keys(this.cTicketsUser[0]).length
      for (const size of ['xl', 'lg', 'md', 'sm', 'xs']) {
        if (this.sizes[size]) {
          const sizeExpect = this.sizes[size] > keysLenSize ? keysLenSize : this.sizes[size]
          contentClass += ' col-' + size + '-' + (12 / sizeExpect)
        }
      }
      return contentClass
    },

    sets () {
      const sets = []
      const limit = Math.ceil(this.cTicketsUser.length / this.itemsPerSet)
      for (let index = 0; index < limit; index++) {
        const start = index * this.itemsPerSet
        const end = start + this.itemsPerSet
        sets.push(this.cTicketsUser.slice(start, end))
      }
      return sets[0]
    },

    itemsPerSet () {
      let cond = false
      for (const size of ['xl', 'lg', 'md', 'sm', 'xs']) {
        cond = cond || this.$q.screen[size]
        if (cond && this.sizes[size]) {
          return this.sizes[size]
        }
      }
      return 1
    },

    cUserQueues () {
      try {
        const filasUsuario = JSON.parse(UserQueues).map(q => {
          if (q.isActive) {
            return q.id
          }
        })
        return this.filas.filter(f => filasUsuario.includes(f.id)) || []
      } catch (error) {
        return []
      }
    },

    filteredTicketsBySearch () {
      if (!this.searchParam) {
        return this.tickets
      }
      return this.tickets.filter(ticket => {
        const search = this.searchParam.toLowerCase()
        const contactName = ticket.contact?.name?.toLowerCase() || ''
        const ticketId = String(ticket.id)
        return contactName.includes(search) || ticketId.includes(search)
      })
    },

    cTicketsUser () {
      const field = this.visao === 'U' || this.visao === 'US' ? 'userId' : 'queueId'
      const grouped = groupBy(this.filteredTicketsBySearch, field)

      // Ordenar chaves para trazer 'null' (pendentes) primeiro
      const keys = Object.keys(grouped)
      const orderedKeys = keys.sort((a, b) => {
        if (a === 'null' && b !== 'null') return -1
        if (b === 'null' && a !== 'null') return 1

        // Demais: ordena por nome (visão usuário) ou por id (visão fila)
        const aFirst = grouped[a]?.[0]
        const bFirst = grouped[b]?.[0]
        if (this.visao === 'U' || this.visao === 'US') {
          const aName = (aFirst?.user?.name || '').toLowerCase()
          const bName = (bFirst?.user?.name || '').toLowerCase()
          if (aName && bName && aName !== bName) return aName.localeCompare(bName)
        } else {
          const aNum = isNaN(Number(a)) ? Number.MAX_SAFE_INTEGER : Number(a)
          const bNum = isNaN(Number(b)) ? Number.MAX_SAFE_INTEGER : Number(b)
          if (aNum !== bNum) return aNum - bNum
        }
        return String(a).localeCompare(String(b))
      })

      // Evitar a regra de enumeração de objetos do JS que coloca chaves numéricas antes das string.
      // Transformamos as chaves não-nulas em strings com prefixo, preservando a ordem de inserção.
      const prefix = (this.visao === 'U' || this.visao === 'US') ? 'u_' : 'q_'
      const ordered = {}
      for (const k of orderedKeys) {
        const newKey = k === 'null' ? 'null' : `${prefix}${k}`
        ordered[newKey] = grouped[k]
      }
      return [ordered]
    },

    ticketStats () {
      const ticketsToCount = this.filteredTicketsBySearch
      const groupedByStatus = groupBy(ticketsToCount, 'status')
      return {
        total: ticketsToCount.length,
        open: groupedByStatus.open?.length || 0,
        pending: groupedByStatus.pending?.length || 0,
        closed: groupedByStatus.closed?.length || 0
      }
    }
  },

  methods: {
    initializeFilters () {
      if (!this.cTicketsUser || !this.cTicketsUser[0]) return
      const userIds = Object.keys(this.cTicketsUser[0])
      const newFilters = {}
      for (const userId of userIds) {
        if (!this.userTicketFilters[userId]) {
          newFilters[userId] = 'all'
        } else {
          newFilters[userId] = this.userTicketFilters[userId]
        }
      }
      this.userTicketFilters = { ...this.userTicketFilters, ...newFilters }
    },

    filteredTickets (tickets, userId) {
      if (userId === 'null') {
        return tickets.filter(ticket => ticket.status === 'pending')
      }
      const filter = this.userTicketFilters[userId]

      if (!filter || filter === 'all') {
        return tickets
      }

      return tickets.filter(ticket => ticket.status === filter)
    },

    deleteTicket (ticketId) {
      const newTickets = [...this.tickets]
      const ticketsFilter = newTickets.filter(t => t.id !== ticketId)
      this.tickets = [...ticketsFilter]
    },

    updateTicket (ticket) {
      const newTickets = [...this.tickets]
      const idx = newTickets.findIndex(t => ticket.id)
      if (idx) {
        newTickets[idx] = ticket
        this.tickets = [...newTickets]
      }
    },

    createTicket (ticket) {
      const newTickets = [...this.tickets]
      newTickets.unshift(ticket)
      this.tickets = [...newTickets]
    },

    verifyIsActionSocket (data) {
      if (!data.id) return false

      // mostrar todos para admin ou gerente
      if (this.pesquisaTickets.showAll && (this.profile === 'admin' || this.profile === 'gerente')) return true

      // não existir filas cadastradas
      if (!this.filas.length) return true

      // verificar se a fila do ticket está filtrada
      const isQueue = this.pesquisaTickets.queuesIds.indexOf(q => data.queueId === q)

      let isValid = false
      if (isQueue !== -1) {
        isValid = true
      }
      return isValid
    },

    conectSocketQueues (tenantId, queueId) {
      // ✅ COMENTADO: Código antigo mantido para referência
      // socket.on(`${tenantId}:${queueId}:ticket:queue`, data => {
      //   if (!this.verifyIsActionSocket(data.ticket)) return

      //   if (data.action === 'update') {
      //     this.updateTicket(data.ticket)
      //   }
      //   if (data.action === 'create') {
      //     this.createTicket(data.ticket)
      //   }
      //   if (data.action === 'delete') {
      //     this.deleteTicket(data.ticketId)
      //   }
      // })
    },

    socketTickets (tenantId) {
      console.log('🔌 Configurando socket listeners do Dashboard')

      // ✅ Limpar listeners antigos
      this.cleanupSocketListeners()

      // ✅ COMENTADO: Código antigo mantido para referência
      // socket.emit(`${tenantId}:joinTickets`, 'open')
      // socket.emit(`${tenantId}:joinTickets`, 'pending')

      // const ticketListener = (data) => {
      //   if (!this.verifyIsActionSocket(data.ticket)) return

      //   if (data.action === 'updateQueue' || data.action === 'create') {
      //     this.updateTicket(data.ticket)
      //   }

      //   if (data.action === 'updateUnread') {
      //     // this.$store.commit('RESET_UNREAD', data.ticketId)
      //   }

      //   if (
      //     (data.action === 'update' || data.action === 'create') &&
      //     (!data.ticket.userId || data.ticket.userId === userId /* || showAll */)
      //   ) {
      //     this.updateTicket(data.ticket)
      //   }

      //   if (data.action === 'delete') {
      //     this.deleteTicket(data.ticketId)
      //   }
      // }

      // socket.on(`${tenantId}:ticket`, ticketListener)
      // this.socketListeners.push({ event: `${tenantId}:ticket`, handler: ticketListener })
    },

    connectSocket () {
      this.socketTickets(usuario.tenantId)
      this.cUserQueues.forEach(el => {
        this.conectSocketQueues(usuario.tenantId, el.id)
      })
    },

    // ✅ NOVO MÉTODO: Limpeza de listeners
    cleanupSocketListeners () {
      console.log('🧹 Limpando listeners do Dashboard')

      if (this.socketListeners && this.socketListeners.length > 0) {
        this.socketListeners.forEach(({ event, handler }) => {
          socket.off(event, handler)
          console.log(`🗑️ Listener removido: ${event}`)
        })
        this.socketListeners = []
      }
    },

    definirNomeUsuario (item) {
      this.verifyIsActionSocket(item)
      return item?.user?.name || 'Pendente'
    },

    definirNomeFila (f) {
      const fila = this.filas.find(fila => fila.id === f.queueId)
      return fila?.queue || 'Sem Departamento'
    },

    counterStatus (tickets) {
      const status = {
        open: 0,
        pending: 0,
        closed: 0
      }
      const group = groupBy(tickets, 'status')
      status.open = group.open?.length || 0
      status.pending = group.pending?.length || 0
      status.closed = group.closed?.length || 0
      return status
    },

    consultarTickets () {
      ConsultarTicketsQueuesService(this.pesquisaTickets)
        .then(res => {
          if ((this.profile === 'admin' || this.profile === 'gerente') && this.pesquisaTickets.showAll) {
            // Admin ou gerente com showAll pode ver todos os tickets
            this.tickets = res.data
          } else {
            // Usuários normais ou admin/gerente sem showAll
            const allTicketsUser = res.data.filter(ticket => ticket.userId === usuario.userId)
            const pendingTickets = res.data.filter(ticket => ticket.userId === null && ticket.status === 'pending')
            this.tickets = allTicketsUser.concat(pendingTickets)

            console.log('Tickets pendentes:', pendingTickets)
          }
          this.connectSocket()
          this.initializeFilters()
        })
        .catch(error => {
          console.error(error)
          this.$notificarErro('Erro ao consultar atendimentos', error)
        })
    },

    onResize ({ height }) {
      this.height = height
    }
  },

  async mounted () {
    console.log('📊 Dashboard montado - Socket conectado:', socket.connected)
    await ListarFilas().then(res => {
      // Filtrar apenas departamentos ativos
      this.filas = res.data.filter(fila => fila.isActive === true)
    })
    await this.consultarTickets()
  },

  beforeDestroy () {
    // ✅ Limpar listeners ao destruir o componente
    this.cleanupSocketListeners()
    console.log('🔌 Dashboard destruído - listeners limpos')
  }

  // ❌ REMOVIDO: destroyed() com socket.disconnect()
  // Deixa o singleton gerenciar a conexão
}
</script>

<style lang="scss" scoped>
.card-atendimento {
  transition: box-shadow 0.3s ease-in-out;
}

.card-atendimento:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}
</style>
