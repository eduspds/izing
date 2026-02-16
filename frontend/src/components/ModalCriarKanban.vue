<template>
  <q-dialog
    v-model="show"
    persistent
    @show="aoAbrirModal"
    @hide="fecharModal"
  >
    <q-card class="modal-form-card">
      <q-card-section class="modal-form-header">
        <div class="row items-center no-wrap q-gutter-sm">
          <q-icon
            name="add_circle_outline"
            size="28px"
            color="primary"
          />
          <div class="text-h6 text-weight-medium">
            Criar item do Kanban
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
        <q-btn flat label="Cancelar" color="grey" @click="fecharModal" />
        <q-btn unelevated label="Salvar" color="primary" @click="salvarForm" :disable="!form.title || !form.priority" :loading="salvando" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { CriarTicketKanban } from 'src/service/kandan'
import { ListarUsuarios } from 'src/service/user'

export default {
  name: 'ModalCriarKanban',
  props: {
    value: {
      type: Boolean,
      default: false
    },
    ticketData: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      show: false,
      isAdmin: false,
      userId: null,
      loadingUsuarios: false,
      salvando: false,
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
      usuariosOptions: []
    }
  },
  watch: {
    value (newVal) {
      this.show = newVal
      if (newVal) {
        this.inicializarForm()
      }
    },
    show (newVal) {
      this.$emit('input', newVal)
    }
  },
  mounted () {
    const profile = localStorage.getItem('profile')
    const userIdStr = localStorage.getItem('userId')
    this.isAdmin = profile === 'admin'
    this.userId = userIdStr ? Number(userIdStr) : null
  },
  methods: {
    inicializarForm () {
      const ticketId = this.ticketData?.id
      const contactName = this.ticketData?.contact?.name || ''
      this.form = {
        title: ticketId ? `Ticket #${ticketId}${contactName ? ' - ' + contactName : ''}`.trim() : '',
        description: '',
        priority: 'medium',
        status: 'pending',
        startDate: '',
        endDate: '',
        userId: this.isAdmin ? [] : (this.userId ? [this.userId] : [])
      }
      if (ticketId) {
        this.form.ticketId = Number(ticketId)
      }
      if (this.isAdmin) {
        this.carregarUsuarios()
      }
    },
    aoAbrirModal () {
      this.inicializarForm()
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
      if (this.form.ticketId) payload.ticketId = this.form.ticketId

      this.salvando = true
      CriarTicketKanban(payload)
        .then(({ data }) => {
          this.$q.notify({
            type: 'positive',
            message: 'Item do Kanban criado com sucesso!',
            position: 'top'
          })
          this.$emit('kanban-criado', data)
          this.fecharModal()
        })
        .catch(err => {
          this.$notificarErro('Erro ao criar item do Kanban', err)
        })
        .finally(() => {
          this.salvando = false
        })
    },
    fecharModal () {
      this.show = false
      this.form = {
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        startDate: '',
        endDate: '',
        userId: []
      }
      this.$emit('modal-fechado')
    }
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
</style>
