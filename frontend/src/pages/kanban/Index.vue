<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5 text-weight-bold">
        Kanban
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="Criar"
        @click="abrirModalCriar"
      />
    </div>

    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <div v-if="!loading" class="row q-col-gutter-md kanban-board">
      <div
        v-for="col in colunas"
        :key="col.status"
        class="col-12 col-sm-6 col-md-3"
      >
        <q-card flat bordered class="column-card rounded-borders">
          <q-card-section class="column-header bg-grey-2">
            <div class="text-subtitle1 text-weight-medium">
              {{ col.label }}
            </div>
            <q-badge :color="col.badgeColor" rounded>
              {{ getColuna(col.status).length }}
            </q-badge>
          </q-card-section>
          <q-card-section class="column-body q-pa-sm">
            <draggable
              :list="getColuna(col.status)"
              group="kanban"
              class="min-height-drag"
              ghost-class="card-ghost"
              drag-class="card-drag"
              @add="onDragAdd($event, col.status)"
            >
              <q-card
                v-for="item in getColuna(col.status)"
                :key="item.id"
                flat
                bordered
                class="kanban-card q-mb-sm rounded-borders cursor-move"
                @click="abrirDetalhe(item)"
              >
                <q-card-section class="q-pa-sm">
                  <div class="row items-center justify-between">
                    <span class="text-weight-medium text-body2 ellipsis col-grow">
                      {{ item.title }}
                    </span>
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      icon="edit"
                      @click.stop="editarItem(item)"
                    />
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      icon="delete"
                      color="negative"
                      @click.stop="deletarItem(item)"
                    />
                  </div>
                  <q-badge
                    :color="prioridadeCor(item.priority)"
                    class="q-mt-xs"
                    rounded
                    :label="prioridadeLabel(item.priority)"
                  />
                  <div v-if="item.description" class="text-caption text-grey-7 q-mt-xs ellipsis-2-lines">
                    {{ item.description }}
                  </div>
                  <div v-if="item.users && item.users.length" class="text-caption text-grey-7 q-mt-xs ellipsis">
                    <span class="text-weight-medium">Responsáveis:</span> {{ nomesResponsaveis(item) }}
                  </div>
                  <div class="text-caption text-grey-6 q-mt-xs">
                    {{ formatarData(item.startDate) }} – {{ formatarData(item.endDate) }}
                  </div>
                </q-card-section>
              </q-card>
            </draggable>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal Criar/Editar (visual unificado) -->
    <q-dialog v-model="modalForm" persistent @show="aoAbrirModalForm" @hide="fecharModalForm">
      <q-card class="modal-form-card">
        <q-card-section class="modal-form-header">
          <div class="row items-center no-wrap q-gutter-sm">
            <q-icon
              :name="itemEdicao.id ? 'edit' : 'add_circle_outline'"
              size="28px"
              color="primary"
            />
            <div class="text-h6 text-weight-medium">
              {{ itemEdicao.id ? 'Editar' : 'Criar' }} item do Kanban
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section class="modal-form-body">
          <q-input
            v-model="form.title"
            outlined
            label="Título *"
            :rules="[val => !!val || 'Obrigatório']"
            dense
            class="modal-field"
          />
          <q-input
            v-model="form.description"
            outlined
            label="Descrição"
            type="textarea"
            autogrow
            dense
            class="modal-field"
            rows="3"
          />
          <div class="row q-col-gutter-md modal-row-priority-status">
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.priority"
                :options="opcoesPrioridade"
                outlined
                label="Prioridade *"
                emit-value
                map-options
                dense
                class="modal-field"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="form.status"
                :options="opcoesStatus"
                outlined
                label="Status *"
                emit-value
                map-options
                dense
                class="modal-field"
              />
            </div>
          </div>
          <div class="row q-col-gutter-md modal-row-dates">
            <div class="col-12 col-sm-6">
              <q-datetime-picker
                v-model="form.startDate"
                outlined
                dense
                hide-bottom-space
                stack-label
                bottom-slots
                label="Data início"
                mode="date"
                color="primary"
                format24h
                class="modal-field modal-date-picker"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-datetime-picker
                v-model="form.endDate"
                outlined
                dense
                hide-bottom-space
                stack-label
                bottom-slots
                label="Data fim"
                mode="date"
                color="primary"
                format24h
                class="modal-field modal-date-picker"
              />
            </div>
          </div>
          <q-select
            v-if="isAdmin"
            v-model="form.userId"
            :options="usuariosOptions"
            :loading="loadingUsuarios"
            outlined
            label="Usuários"
            option-label="label"
            option-value="value"
            multiple
            emit-value
            map-options
            use-chips
            use-input
            input-debounce="200"
            dense
            class="modal-field modal-select-usuarios"
            :hint="loadingUsuarios ? 'Carregando usuários...' : (usuariosOptions.length ? 'Selecione os responsáveis pelo item' : 'Nenhum usuário disponível')"
          />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="modal-form-actions">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated label="Salvar" color="primary" @click="salvarForm" :disable="!form.title || !form.priority" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Drawer Detalhe -->
    <q-drawer
      v-model="drawerDetalhe"
      side="right"
      bordered
      overlay
      :width="380"
    >
      <q-scroll-area class="fit">
        <div v-if="itemDetalhe" class="drawer-detalhe q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-h6 text-weight-medium drawer-detalhe-titulo col-grow">{{ itemDetalhe.title }}</div>
            <q-btn
              flat
              dense
              round
              icon="close"
              size="sm"
              color="grey"
              aria-label="Fechar"
              @click="drawerDetalhe = false"
            />
          </div>
          <q-separator class="q-mb-md" />
          <div class="drawer-detalhe-campo">
            <span class="drawer-detalhe-label">Descrição</span>
            <p class="drawer-detalhe-valor q-my-none">{{ itemDetalhe.description || '—' }}</p>
          </div>
          <div class="drawer-detalhe-campo">
            <span class="drawer-detalhe-label">Prioridade</span>
            <p class="drawer-detalhe-valor q-my-none">{{ prioridadeLabel(itemDetalhe.priority) }}</p>
          </div>
          <div class="drawer-detalhe-campo">
            <span class="drawer-detalhe-label">Status</span>
            <p class="drawer-detalhe-valor q-my-none">{{ statusLabel(itemDetalhe.status) }}</p>
          </div>
          <div class="drawer-detalhe-campo">
            <span class="drawer-detalhe-label">Data início</span>
            <p class="drawer-detalhe-valor q-my-none">{{ formatarData(itemDetalhe.startDate) }}</p>
          </div>
          <div class="drawer-detalhe-campo">
            <span class="drawer-detalhe-label">Data fim</span>
            <p class="drawer-detalhe-valor q-my-none">{{ formatarData(itemDetalhe.endDate) }}</p>
          </div>
          <div v-if="itemDetalhe.ticketId != null" class="drawer-detalhe-campo">
            <span class="drawer-detalhe-label">Ticket ID</span>
            <p class="drawer-detalhe-valor q-my-none">{{ itemDetalhe.ticketId }}</p>
          </div>
          <div class="drawer-detalhe-campo">
            <span class="drawer-detalhe-label">Responsáveis</span>
            <p class="drawer-detalhe-valor q-my-none">
              {{ nomesResponsaveis(itemDetalhe) }}
            </p>
          </div>
        </div>
      </q-scroll-area>
    </q-drawer>
  </q-page>
</template>

<script>
import draggable from 'vuedraggable'
import { format } from 'date-fns'
import {
  ListarTicketKanbans,
  CriarTicketKanban,
  AtualizarTicketKanban,
  AtualizarStatusTicketKanban,
  DeletarTicketKanban,
  BuscarUmTicketKanban
} from 'src/service/kandan'
import { ListarUsuarios } from 'src/service/user'

const COLUNAS = [
  { status: 'pending', label: 'Pendente', badgeColor: 'orange' },
  { status: 'in_progress', label: 'Em progresso', badgeColor: 'blue' },
  { status: 'completed', label: 'Concluído', badgeColor: 'green' },
  { status: 'cancelled', label: 'Cancelado', badgeColor: 'red' }
]

export default {
  name: 'KanbanIndex',
  components: {
    draggable
  },
  data () {
    return {
      loading: false,
      ticketKanbans: [],
      columns: {
        pending: [],
        in_progress: [],
        completed: [],
        cancelled: []
      },
      isAdmin: false,
      modalForm: false,
      loadingUsuarios: false,
      itemEdicao: {},
      form: {
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        startDate: '',
        endDate: '',
        userId: []
      },
      opcoesPrioridade: [
        { label: 'Baixa', value: 'low' },
        { label: 'Média', value: 'medium' },
        { label: 'Alta', value: 'high' }
      ],
      opcoesStatus: [
        { label: 'Pendente', value: 'pending' },
        { label: 'Em progresso', value: 'in_progress' },
        { label: 'Concluído', value: 'completed' },
        { label: 'Cancelado', value: 'cancelled' }
      ],
      usuariosOptions: [],
      drawerDetalhe: false,
      itemDetalhe: null
    }
  },
  computed: {
    colunas () {
      return COLUNAS
    }
  },
  methods: {
    getColuna (status) {
      return this.columns[status] || []
    },
    refreshColumns () {
      this.columns.pending = this.ticketKanbans.filter(t => t.status === 'pending')
      this.columns.in_progress = this.ticketKanbans.filter(t => t.status === 'in_progress')
      this.columns.completed = this.ticketKanbans.filter(t => t.status === 'completed')
      this.columns.cancelled = this.ticketKanbans.filter(t => t.status === 'cancelled')
    },
    async listar () {
      try {
        this.loading = true
        const { data } = await ListarTicketKanbans()
        this.ticketKanbans = Array.isArray(data) ? data : []
        this.refreshColumns()
      } catch (error) {
        console.error(error)
        this.$notificarErro('Ocorreu um erro ao listar o Kanban', error)
      } finally {
        this.loading = false
      }
    },
    aoAbrirModalForm () {
      if (this.isAdmin) {
        this.carregarUsuarios()
      }
    },
    async carregarUsuarios () {
      this.loadingUsuarios = true
      this.usuariosOptions = []
      try {
        let allUsers = []
        let pageNumber = 1
        let hasMore = true
        while (hasMore) {
          const { data } = await ListarUsuarios({ pageNumber, searchParam: '' })
          const users = data?.users || []
          allUsers = allUsers.concat(users)
          hasMore = data?.hasMore && users.length > 0
          pageNumber += 1
        }
        this.usuariosOptions = allUsers.map(u => ({
          label: [u.name, u.email].filter(Boolean).join(' — ') || `Usuário ${u.id}`,
          value: u.id
        }))
      } catch (e) {
        console.error('Erro ao carregar usuários:', e)
        this.$q.notify({
          type: 'negative',
          message: 'Não foi possível carregar a lista de usuários.',
          position: 'top'
        })
      } finally {
        this.loadingUsuarios = false
      }
    },
    onDragAdd (evt, newStatus) {
      if (!evt || evt.newIndex == null) return
      const coluna = this.getColuna(newStatus)
      const item = coluna && coluna[evt.newIndex]
      if (!item || !item.id) return
      if (item.status === newStatus) return
      AtualizarStatusTicketKanban(item.id, newStatus)
        .then(() => {
          item.status = newStatus
          const idx = this.ticketKanbans.findIndex(t => t.id === item.id)
          if (idx > -1) this.ticketKanbans.splice(idx, 1, { ...item })
          this.refreshColumns()
          this.$q.notify({
            type: 'positive',
            message: 'Status atualizado',
            position: 'top'
          })
        })
        .catch(err => {
          this.$notificarErro('Não foi possível atualizar o status', err)
          this.refreshColumns()
        })
    },
    formatarData (val) {
      if (!val) return '—'
      try {
        const d = new Date(val)
        return isNaN(d.getTime()) ? val : format(d, 'dd/MM/yyyy')
      } catch {
        return val
      }
    },
    prioridadeCor (p) {
      const map = { low: 'green', medium: 'orange', high: 'red' }
      return map[p] || 'grey'
    },
    prioridadeLabel (p) {
      const map = { low: 'Baixa', medium: 'Média', high: 'Alta' }
      return map[p] || p
    },
    statusLabel (s) {
      const c = COLUNAS.find(col => col.status === s)
      return c ? c.label : s
    },
    nomesResponsaveis (item) {
      if (!item || !item.users || !item.users.length) return '—'
      return item.users.map(u => u.name || u.email || `Usuário ${u.id}`).join(', ')
    },
    abrirModalCriar () {
      this.itemEdicao = {}
      this.form = {
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        startDate: '',
        endDate: '',
        userId: this.isAdmin ? [] : [this.userId]
      }
      this.modalForm = true
    },
    editarItem (item) {
      this.itemEdicao = { ...item }
      let userIds = []
      if (this.isAdmin) {
        userIds = Array.isArray(item.users)
          ? item.users.map(u => u.id)
          : (Array.isArray(item.userId) ? item.userId : [])
      } else {
        userIds = [this.userId]
      }
      this.form = {
        title: item.title,
        description: item.description || '',
        priority: item.priority || 'medium',
        status: item.status || 'pending',
        startDate: item.startDate ? format(new Date(item.startDate), 'yyyy-MM-dd') : '',
        endDate: item.endDate ? format(new Date(item.endDate), 'yyyy-MM-dd') : '',
        userId: userIds
      }
      this.modalForm = true
    },
    fecharModalForm () {
      this.itemEdicao = {}
      this.modalForm = false
    },
    salvarForm () {
      const userIds = this.isAdmin
        ? (Array.isArray(this.form.userId) ? this.form.userId : [])
        : (this.userId ? [this.userId] : [])
      const payload = {
        title: this.form.title,
        description: this.form.description || undefined,
        priority: this.form.priority,
        status: this.form.status,
        userId: userIds
      }
      if (this.form.startDate) payload.startDate = new Date(this.form.startDate)
      if (this.form.endDate) payload.endDate = new Date(this.form.endDate)

      if (this.itemEdicao.id) {
        AtualizarTicketKanban(this.itemEdicao.id, payload)
          .then(({ data }) => {
            const idx = this.ticketKanbans.findIndex(t => t.id === data.id)
            if (idx > -1) this.ticketKanbans.splice(idx, 1, data)
            else this.ticketKanbans.push(data)
            this.refreshColumns()
            this.$q.notify({ type: 'positive', message: 'Atualizado!', position: 'top' })
            this.fecharModalForm()
          })
          .catch(err => this.$notificarErro('Erro ao atualizar', err))
      } else {
        CriarTicketKanban(payload)
          .then(({ data }) => {
            this.ticketKanbans.push(data)
            this.refreshColumns()
            this.$q.notify({ type: 'positive', message: 'Criado!', position: 'top' })
            this.fecharModalForm()
          })
          .catch(err => this.$notificarErro('Erro ao criar', err))
      }
    },
    deletarItem (item) {
      this.$q.dialog({
        title: 'Atenção',
        message: `Deseja realmente excluir "${item.title}"?`,
        cancel: { label: 'Não', color: 'primary', flat: true },
        ok: { label: 'Sim', color: 'negative', flat: true },
        persistent: true
      }).onOk(() => {
        DeletarTicketKanban(item.id)
          .then(() => {
            this.ticketKanbans = this.ticketKanbans.filter(t => t.id !== item.id)
            this.refreshColumns()
            this.$q.notify({ type: 'positive', message: 'Excluído!', position: 'top' })
          })
          .catch(err => this.$notificarErro('Erro ao excluir', err))
      })
    },
    abrirDetalhe (item) {
      this.itemDetalhe = item
      this.drawerDetalhe = true
      BuscarUmTicketKanban(item.id)
        .then(({ data }) => {
          this.itemDetalhe = data
        })
        .catch(() => {})
    }
  },
  mounted () {
    const profile = localStorage.getItem('profile')
    const userIdStr = localStorage.getItem('userId')
    this.isAdmin = profile === 'admin'
    this.userId = userIdStr ? Number(userIdStr) : null
    this.listar()
  }
}
</script>

<style lang="scss" scoped>
.modal-form-card {
  width: 100%;
  max-width: 440px;
  min-width: 320px;
}
.modal-form-header {
  padding: 16px 20px;
}
.modal-form-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}
.modal-row-priority-status {
  margin-bottom: 4px;
}
.modal-row-dates {
  margin-top: 8px;
}
.modal-form-actions {
  padding: 12px 20px;
}
.modal-field {
  min-width: 0;
}
.modal-date-picker {
  width: 100%;
  min-width: 0;
}
.modal-select-usuarios {
  min-height: 56px;
}
.modal-select-usuarios :deep(.q-field__control) {
  min-height: 56px;
}

/* Drawer detalhe */
.drawer-detalhe-titulo {
  word-break: break-word;
}
.drawer-detalhe-campo {
  margin-bottom: 14px;
}
.drawer-detalhe-campo:last-child {
  margin-bottom: 0;
}
.drawer-detalhe-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.drawer-detalhe-valor {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.4;
}

.kanban-board {
  min-height: 60vh;
}
.column-card {
  min-height: 400px;
}
.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.column-body {
  min-height: 320px;
}
.min-height-drag {
  min-height: 200px;
}
.kanban-card {
  transition: box-shadow 0.2s;
}
.kanban-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-ghost {
  opacity: 0.5;
  background: #e0e0e0;
}
.card-drag {
  opacity: 0.9;
  cursor: move;
}
</style>
