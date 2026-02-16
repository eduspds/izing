<template>
  <q-dialog v-model="show" persistent>
    <q-card v-if="group" style="min-width: 500px; max-width: 600px">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <q-icon name="group" size="md" class="q-mr-sm" />
        <div class="text-h6">{{ group && group.name }}</div>
        <q-space />
        <q-btn icon="close" flat round dense color="white" @click="close" />
      </q-card-section>

      <!-- Descrição -->
      <q-card-section v-if="group && group.description">
        <div class="text-caption text-grey-7">Descrição:</div>
        <div>{{ group.description }}</div>
      </q-card-section>

      <q-separator />

      <!-- Tabs -->
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="members" icon="people" label="Membros" />
        <q-tab name="add" icon="person_add" label="Adicionar" />
        <q-tab v-if="canEditGroup" name="edit" icon="edit" label="Editar" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <!-- Tab: Membros -->
        <q-tab-panel name="members">
          <div class="text-caption text-grey-7 q-mb-sm">
            {{ group && group.members ? group.members.length : 0 }} membro(s)
          </div>

          <q-scroll-area style="height: 300px">
            <q-list>
              <q-item
                v-for="member in (group && group.members ? group.members : [])"
                :key="member.id"
              >
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white">
                    <q-icon name="person" />
                    <q-badge
                      v-if="member.isOnline"
                      floating
                      color="positive"
                      rounded
                    />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label>
                    {{ member.name }}
                    <q-chip
                      v-if="member.id === group.creator.id"
                      size="sm"
                      color="orange"
                      text-color="white"
                      dense
                      class="q-ml-xs"
                    >
                      Criador
                    </q-chip>
                  </q-item-label>
                  <q-item-label caption>{{ member.email }}</q-item-label>
                  <q-item-label caption v-if="!member.isOnline && member.lastOnline">
                    Visto {{ formatLastSeen(member.lastOnline) }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side v-if="canRemoveMember(member)">
                  <q-btn
                    icon="remove_circle"
                    flat
                    round
                    dense
                    color="negative"
                    @click="confirmRemoveMember(member)"
                  >
                    <q-tooltip>Remover membro</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-tab-panel>

        <!-- Tab: Adicionar Membros -->
        <q-tab-panel name="add">
          <q-input
            v-model="searchNewMember"
            label="Buscar usuários"
            outlined
            dense
            class="q-mb-sm"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-scroll-area style="height: 300px">
            <q-list>
              <q-item
                v-for="user in filteredAvailableUsers"
                :key="user.id"
                clickable
                @click="addMember(user)"
              >
                <q-item-section avatar>
                  <q-avatar color="grey-5" text-color="white">
                    <q-icon name="person" />
                    <q-badge
                      v-if="user.isOnline"
                      floating
                      color="positive"
                      rounded
                    />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label>{{ user.name }}</q-item-label>
                  <q-item-label caption>{{ user.email }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    icon="add"
                    flat
                    round
                    dense
                    color="primary"
                    :loading="loadingAdd[user.id]"
                  />
                </q-item-section>
              </q-item>

              <q-item v-if="filteredAvailableUsers.length === 0">
                <q-item-section class="text-center text-grey-6">
                  {{ availableUsers.length === 0 ? 'Todos os usuários já são membros' : 'Nenhum usuário encontrado' }}
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-tab-panel>

        <!-- Tab: Editar -->
        <q-tab-panel name="edit" v-if="canEditGroup">
          <q-form @submit="updateGroup">
            <!-- Nome -->
            <q-input
              v-model="editData.name"
              label="Nome do Grupo *"
              outlined
              dense
              class="q-mb-md"
              :rules="[val => !!val || 'Nome é obrigatório']"
            >
              <template v-slot:prepend>
                <q-icon name="group" />
              </template>
            </q-input>

            <!-- Descrição -->
            <q-input
              v-model="editData.description"
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
              v-model="editData.department"
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
              v-model="editData.allowedProfile"
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

            <!-- Botão Salvar -->
            <div class="row q-gutter-sm justify-end">
              <q-btn
                label="Cancelar"
                flat
                @click="cancelEdit"
              />
              <q-btn
                label="Salvar Alterações"
                type="submit"
                color="primary"
                :loading="loadingEdit"
              />
            </div>
          </q-form>
        </q-tab-panel>
      </q-tab-panels>

      <q-separator />

      <!-- Ações -->
      <q-card-section>
        <div class="row q-gutter-sm justify-end">
          <q-btn
            label="Sair do Grupo"
            flat
            color="negative"
            @click="confirmLeaveGroup"
          />
          <q-btn
            label="Fechar"
            color="primary"
            @click="close"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { adicionarMembros, removerMembro, sairDoGrupo, atualizarGrupo } from '../../service/internalGroups'
import { ListarFilas } from '../../service/filas'

export default {
  name: 'GroupDetailsDialog',

  props: {
    value: {
      type: Boolean,
      required: true
    },
    group: {
      type: Object,
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
      tab: 'members',
      searchNewMember: '',
      loadingAdd: {},
      loadingEdit: false,
      currentUserId: Number(localStorage.getItem('userId')),
      currentUserProfile: localStorage.getItem('profile'),
      editData: {
        name: '',
        description: '',
        department: null,
        allowedProfile: null
      },
      departments: [],
      profileOptions: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'User', value: 'user' }
      ]
    }
  },

  computed: {
    isCreator () {
      return this.group && this.group.creator && this.group.creator.id === this.currentUserId
    },

    canEditGroup () {
      return this.isCreator || this.currentUserProfile === 'admin'
    },

    availableUsersNotInGroup () {
      if (!this.group || !this.group.members) return []
      const memberIds = this.group.members.map(m => m.id)
      return this.availableUsers.filter(u => !memberIds.includes(u.id))
    },

    filteredAvailableUsers () {
      if (!this.searchNewMember) {
        return this.availableUsersNotInGroup
      }
      const search = this.searchNewMember.toLowerCase()
      return this.availableUsersNotInGroup.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      )
    }
  },

  methods: {
    formatLastSeen (date) {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR
      })
    },

    canRemoveMember (member) {
      // Criador pode remover qualquer um (exceto a si mesmo)
      // Não pode remover o criador
      if (!this.group || !this.group.creator) return false
      return this.isCreator && member.id !== this.group.creator.id
    },

    async addMember (user) {
      this.$set(this.loadingAdd, user.id, true)

      try {
        await adicionarMembros(this.group.id, [user.id])

        this.$q.notify({
          type: 'positive',
          message: `${user.name} foi adicionado ao grupo`,
          position: 'top'
        })

        this.$emit('member-added', { groupId: this.group.id, user })
        this.tab = 'members'
      } catch (error) {
        console.error('Erro ao adicionar membro:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.error || 'Erro ao adicionar membro',
          position: 'top'
        })
      } finally {
        this.$set(this.loadingAdd, user.id, false)
      }
    },

    confirmRemoveMember (member) {
      this.$q.dialog({
        title: 'Remover Membro',
        message: `Deseja remover ${member.name} do grupo?`,
        cancel: {
          label: 'Cancelar',
          flat: true
        },
        ok: {
          label: 'Remover',
          color: 'negative'
        },
        persistent: true
      }).onOk(() => {
        this.removeMember(member)
      })
    },

    async removeMember (member) {
      try {
        await removerMembro(this.group.id, member.id)

        this.$q.notify({
          type: 'positive',
          message: `${member.name} foi removido do grupo`,
          position: 'top'
        })

        this.$emit('member-removed', { groupId: this.group.id, memberId: member.id })
      } catch (error) {
        console.error('Erro ao remover membro:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.error || 'Erro ao remover membro',
          position: 'top'
        })
      }
    },

    confirmLeaveGroup () {
      this.$q.dialog({
        title: 'Sair do Grupo',
        message: this.isCreator
          ? 'Você é o criador deste grupo. Se sair, o grupo será deletado. Deseja continuar?'
          : 'Deseja realmente sair deste grupo?',
        cancel: {
          label: 'Cancelar',
          flat: true
        },
        ok: {
          label: 'Sair',
          color: 'negative'
        },
        persistent: true
      }).onOk(() => {
        this.leaveGroup()
      })
    },

    async leaveGroup () {
      try {
        await sairDoGrupo(this.group.id)

        this.$q.notify({
          type: 'positive',
          message: 'Você saiu do grupo',
          position: 'top'
        })

        this.$emit('left-group', this.group.id)
        this.close()
      } catch (error) {
        console.error('Erro ao sair do grupo:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.error || 'Erro ao sair do grupo',
          position: 'top'
        })
      }
    },

    async loadDepartments () {
      try {
        console.log('📋 ===== INICIANDO CARREGAMENTO DE DEPARTAMENTOS (EDIÇÃO) =====')
        console.log('📋 Perfil do usuário:', this.currentUserProfile)

        // Buscar todas as filas cadastradas usando o service
        const { data } = await ListarFilas()
        console.log('📋 DADOS BRUTOS DO BACKEND - Total de filas:', data?.length)
        console.log('📋 FILAS COMPLETAS:', JSON.stringify(data, null, 2))

        let availableQueues = data.filter(queue => queue.isActive)
        console.log('📋 FILAS ATIVAS (após filtro):', availableQueues.length)
        console.log('📋 FILAS ATIVAS:', availableQueues.map(q => ({ id: q.id, queue: q.queue, isActive: q.isActive })))

        // Filtrar departamentos conforme o perfil
        if (this.currentUserProfile === 'admin') {
          // Admin vê todos os departamentos ativos
          console.log('📋 ✅ ADMIN: exibindo todos os departamentos ativos')
        } else if (this.currentUserProfile === 'manager') {
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

        console.log('📋 ===== RESULTADO FINAL (EDIÇÃO) =====')
        console.log('📋 Departamentos mapeados:', this.departments)
        console.log('📋 Total de departamentos disponíveis:', this.departments.length)
      } catch (error) {
        console.error('❌ ERRO ao carregar departamentos:', error)
        console.error('❌ ERRO detalhes:', error.response?.data || error.message)
      }
    },

    initEditData () {
      if (!this.group) return

      console.log('📝 Inicializando dados de edição...')
      console.log('📝 Grupo recebido:', this.group)
      console.log('📝 Departamento do grupo:', this.group.department)
      console.log('📝 Departamentos disponíveis:', this.departments)

      this.editData = {
        name: this.group.name || '',
        description: this.group.description || '',
        department: this.group.department || null,
        allowedProfile: this.group.allowedProfile || null
      }

      console.log('📝 Dados de edição inicializados:', this.editData)
    },

    async updateGroup () {
      if (!this.editData.name.trim()) return

      this.loadingEdit = true

      try {
        const updateData = {
          name: this.editData.name,
          description: this.editData.description || null,
          department: this.editData.department || null,
          allowedProfile: this.editData.allowedProfile || null
        }

        console.log('📝 Dados sendo enviados para atualização:', updateData)
        console.log('📝 Departamento atual:', this.editData.department)
        console.log('📝 Departamento do grupo original:', this.group.department)

        const { data } = await atualizarGrupo(this.group.id, updateData)

        this.$q.notify({
          type: 'positive',
          message: 'Grupo atualizado com sucesso!',
          position: 'top'
        })

        // Atualizar o grupo localmente
        this.$emit('group-updated', data.group)

        // Manter no tab de edição para o usuário ver que foi salvo
        // this.tab = 'members' // Removido para evitar bugs
      } catch (error) {
        console.error('Erro ao atualizar grupo:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.error || 'Erro ao atualizar grupo',
          position: 'top'
        })
      } finally {
        this.loadingEdit = false
      }
    },

    cancelEdit () {
      this.initEditData()
      this.tab = 'members'
    },

    close () {
      this.show = false
    }
  },

  mounted () {
    console.log('🚀 GroupDetailsDialog mounted - value:', this.value, 'group:', this.group)
    this.$nextTick(() => {
      this.loadDepartments()
    })
  },

  watch: {
    value: {
      handler (val) {
        console.log('🔄 GroupDetailsDialog - value changed:', val)
        this.show = val
      },
      immediate: true
    },

    show (val) {
      console.log('🔄 GroupDetailsDialog - show changed:', val)
      this.$emit('input', val)
      if (val) {
        // Quando o diálogo é aberto, carregar departamentos
        console.log('🔄 Diálogo aberto, chamando loadDepartments...')
        this.$nextTick(() => {
          console.log('🔄 NextTick executado, chamando loadDepartments agora...')
          this.loadDepartments()
        })
      } else {
        this.tab = 'members'
        this.searchNewMember = ''
      }
    },

    group: {
      handler () {
        if (this.group && this.departments.length > 0) {
          this.initEditData()
        }
      },
      deep: true,
      immediate: true
    },

    departments () {
      if (this.group) {
        this.initEditData()
      }
    }
  }
}
</script>
