<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Criar Novo Grupo</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit">
          <!-- Nome do Grupo -->
          <q-input
            v-model="groupData.name"
            label="Nome do Grupo *"
            outlined
            dense
            :rules="[val => !!val || 'Nome é obrigatório']"
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="group" />
            </template>
          </q-input>

          <!-- Descrição -->
          <q-input
            v-model="groupData.description"
            label="Descrição (opcional)"
            outlined
            dense
            type="textarea"
            rows="2"
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="description" />
            </template>
          </q-input>

          <!-- Departamento -->
          <q-select
            v-model="groupData.department"
            :options="departments"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Departamento (opcional)"
            outlined
            dense
            clearable
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="business" />
            </template>
          </q-select>

          <!-- Perfil Permitido -->
          <q-select
            v-model="groupData.allowedProfile"
            :options="profileOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Perfil permitido (opcional)"
            outlined
            dense
            clearable
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="admin_panel_settings" />
            </template>
          </q-select>

          <!-- Buscar Membros -->
          <q-input
            v-model="searchMember"
            label="Buscar usuários"
            outlined
            dense
            class="q-mb-sm"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>

          <!-- Lista de Usuários Disponíveis -->
          <div class="text-caption text-grey-7 q-mb-xs">
            Selecione os membros ({{ selectedMembers.length }} selecionados)
          </div>

          <q-scroll-area style="height: 250px" class="q-mb-md border-grey">
            <q-list>
              <q-item
                v-for="user in filteredUsers"
                :key="user.id"
                clickable
                @click="toggleMember(user)"
              >
                <q-item-section avatar>
                  <q-avatar :color="isSelected(user) ? 'primary' : 'grey-5'" text-color="white">
                    <q-icon :name="isSelected(user) ? 'check' : 'person'" />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label>{{ user.name }}</q-item-label>
                  <q-item-label caption>{{ user.email }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-checkbox
                    :value="isSelected(user)"
                    @input="toggleMember(user)"
                    color="primary"
                  />
                </q-item-section>
              </q-item>

              <q-item v-if="filteredUsers.length === 0">
                <q-item-section class="text-center text-grey-6">
                  Nenhum usuário encontrado
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>

          <!-- Membros Selecionados -->
          <div v-if="selectedMembers.length > 0" class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-xs">Membros selecionados:</div>
            <div class="row q-gutter-xs">
              <q-chip
                v-for="member in selectedMembers"
                :key="member.id"
                removable
                @remove="toggleMember(member)"
                color="primary"
                text-color="white"
                size="sm"
              >
                {{ member.name }}
              </q-chip>
            </div>
          </div>

          <!-- Botões -->
          <div class="row q-gutter-sm justify-end">
            <q-btn
              label="Cancelar"
              flat
              @click="close"
            />
            <q-btn
              label="Criar Grupo"
              type="submit"
              color="primary"
              :loading="loading"
              :disable="!canCreate"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { criarGrupo } from '../../service/internalGroups'
import { ListarFilas } from '../../service/filas'

export default {
  name: 'CreateGroupDialog',

  props: {
    value: {
      type: Boolean,
      required: true
    },
    availableUsers: {
      type: Array,
      default: () => []
    }
  },

  data () {
    return {
      show: this.value,
      loading: false,
      searchMember: '',
      groupData: {
        name: '',
        description: '',
        department: null,
        allowedProfile: null
      },
      selectedMembers: [],
      departments: [],
      profileOptions: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'User', value: 'user' }
      ]
    }
  },

  computed: {
    filteredUsers () {
      if (!this.searchMember) {
        return this.availableUsers
      }
      const search = this.searchMember.toLowerCase()
      return this.availableUsers.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      )
    },

    canCreate () {
      return this.groupData.name.trim() && this.selectedMembers.length > 0
    }
  },

  watch: {
    value (val) {
      this.show = val
    },

    show (val) {
      this.$emit('input', val)
      if (val) {
        // Quando o diálogo é aberto, carregar departamentos
        console.log('🔄 CreateGroupDialog - Diálogo aberto, chamando loadDepartments...')
        this.$nextTick(() => {
          console.log('🔄 CreateGroupDialog - NextTick executado, chamando loadDepartments agora...')
          this.loadDepartments()
        })
      } else {
        this.reset()
      }
    }
  },

  mounted () {
    this.$nextTick(() => {
      this.loadDepartments()
    })
  },

  methods: {
    async loadDepartments () {
      try {
        console.log('📋 ===== INICIANDO CARREGAMENTO DE DEPARTAMENTOS =====')

        const currentUserProfile = localStorage.getItem('profile')

        console.log('📋 Perfil do usuário:', currentUserProfile)

        // Buscar todas as filas cadastradas usando o service
        const { data } = await ListarFilas()
        console.log('📋 DADOS BRUTOS DO BACKEND - Total de filas:', data?.length)
        console.log('📋 FILAS COMPLETAS:', JSON.stringify(data, null, 2))

        let availableQueues = data.filter(queue => queue.isActive)
        console.log('📋 FILAS ATIVAS (após filtro):', availableQueues.length)
        console.log('📋 FILAS ATIVAS:', availableQueues.map(q => ({ id: q.id, queue: q.queue, isActive: q.isActive })))

        // Filtrar departamentos conforme o perfil
        if (currentUserProfile === 'admin') {
          // Admin vê todos os departamentos ativos
          console.log('📋 ✅ ADMIN: exibindo todos os departamentos ativos')
        } else if (currentUserProfile === 'manager') {
          // Gerente vê apenas os departamentos que gerencia (do localStorage)
          const managerQueues = JSON.parse(localStorage.getItem('managerQueues') || '[]')
          const managedQueueIds = managerQueues.map(q => q.id)

          console.log('📋 MANAGER: departamentos gerenciados:', managedQueueIds)
          console.log('📋 MANAGER: dados completos:', managerQueues)

          availableQueues = availableQueues.filter(queue =>
            managedQueueIds.includes(queue.id)
          )
          console.log('📋 MANAGER: filas filtradas:', availableQueues.length)
        } else {
          // User vê apenas os departamentos que faz parte (do localStorage)
          const userQueues = JSON.parse(localStorage.getItem('queues') || '[]')
          const userQueueIds = userQueues.map(q => q.id)

          console.log('📋 USER: departamentos que faz parte:', userQueueIds)
          console.log('📋 USER: dados completos:', userQueues)

          availableQueues = availableQueues.filter(queue =>
            userQueueIds.includes(queue.id)
          )
          console.log('📋 USER: filas filtradas:', availableQueues.length)
        }

        this.departments = availableQueues.map(queue => ({
          label: queue.queue,
          value: queue.queue
        }))

        console.log('📋 ===== RESULTADO FINAL =====')
        console.log('📋 Departamentos mapeados:', this.departments)
        console.log('📋 Total de departamentos disponíveis:', this.departments.length)
      } catch (error) {
        console.error('❌ ERRO ao carregar departamentos:', error)
        console.error('❌ ERRO detalhes:', error.response?.data || error.message)
      }
    },

    isSelected (user) {
      return this.selectedMembers.some(m => m.id === user.id)
    },

    toggleMember (user) {
      const index = this.selectedMembers.findIndex(m => m.id === user.id)
      if (index !== -1) {
        this.selectedMembers.splice(index, 1)
      } else {
        this.selectedMembers.push(user)
      }
    },

    async onSubmit () {
      if (!this.canCreate) return

      this.loading = true

      try {
        const memberIds = this.selectedMembers.map(m => m.id)

        const { data } = await criarGrupo({
          name: this.groupData.name,
          description: this.groupData.description || null,
          memberIds,
          department: this.groupData.department || null,
          allowedProfile: this.groupData.allowedProfile || null
        })

        this.$q.notify({
          type: 'positive',
          message: 'Grupo criado com sucesso!',
          position: 'top'
        })

        this.$emit('group-created', data.group)
        this.close()
      } catch (error) {
        console.error('Erro ao criar grupo:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.error || 'Erro ao criar grupo',
          position: 'top'
        })
      } finally {
        this.loading = false
      }
    },

    reset () {
      this.groupData = {
        name: '',
        description: '',
        department: null,
        allowedProfile: null
      }
      this.selectedMembers = []
      this.searchMember = ''
    },

    close () {
      this.show = false
    }
  }
}
</script>

<style scoped>
.border-grey {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
</style>
