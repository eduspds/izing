<template>
  <div>
    <q-table
      flat
      bordered
      square
      hide-bottom
      class="my-sticky-dynamic q-ma-lg"
      title="Etiquetas"
      :data="etiquetasFiltradas"
      :columns="columns"
      :loading="loading"
      row-key="id"
      :pagination.sync="pagination"
      :rows-per-page-options="[0]"
    >
      <template v-slot:top-right>
        <q-btn
          color="primary"
          label="Adicionar"
          @click="etiquetaEdicao = {}; modalEtiqueta = true"
        />
      </template>
      <template v-slot:body-cell-color="props">
        <q-td class="text-center">
          <div
            class="q-pa-sm rounded-borders"
            :style="`background: ${props.row.color}`"
          >
            {{ props.row.color }}
          </div>
        </q-td>
      </template>
      <template v-slot:body-cell-departamentos="props">
        <q-td>
          <div v-if="props.row.queues && props.row.queues.length > 0">
            <q-chip
              v-for="queue in props.row.queues"
              :key="queue.id"
              size="sm"
              color="primary"
              text-color="white"
              class="q-mr-xs q-mb-xs"
            >
              {{ queue.queue }}
            </q-chip>
          </div>
          <div v-else class="text-grey-6">
            <q-icon name="public" size="sm" class="q-mr-xs" />
            Global
          </div>
        </q-td>
      </template>
      <template v-slot:body-cell-isActive="props">
        <q-td class="text-center">
          <q-icon
            size="24px"
            :name="props.value ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'"
            :color="props.value ? 'positive' : 'negative'"
          />
        </q-td>
      </template>
      <template v-slot:body-cell-acoes="props">
        <q-td class="text-center">
          <q-btn
            flat
            round
            icon="edit"
            @click="editarEtiqueta(props.row)"
          />
          <q-btn
            flat
            round
            icon="mdi-delete"
            @click="deletarEtiqueta(props.row)"
          >
            <q-tooltip v-if="isManager && temOutrosDepartamentos(props.row)" class="bg-orange">
              Esta etiqueta tem departamentos de outros gerentes. Você pode apenas remover os departamentos que administra.
            </q-tooltip>
            <q-tooltip v-else-if="isManager">
              Remover etiqueta
            </q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
    <ModalEtiqueta
      :modalEtiqueta.sync="modalEtiqueta"
      :etiquetaEdicao.sync="etiquetaEdicao"
      @modal-etiqueta:criada="etiquetaCriada"
      @modal-etiqueta:editada="etiquetaEditada"
    />
  </div>
</template>

<script>
import { DeletarEtiqueta, ListarEtiquetas } from 'src/service/etiquetas'
import ModalEtiqueta from './ModalEtiqueta'
export default {
  name: 'Etiquetas',
  components: {
    ModalEtiqueta
  },
  data () {
    return {
      etiquetaEdicao: {},
      modalEtiqueta: false,
      etiquetas: [],
      pagination: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      },
      loading: false,
      columns: [
        { name: 'id', label: '#', field: 'id', align: 'left' },
        { name: 'tag', label: 'Etiqueta', field: 'tag', align: 'left' },
        { name: 'color', label: 'Cor', field: 'color', align: 'center' },
        { name: 'departamentos', label: 'Departamentos', field: 'departamentos', align: 'left' },
        { name: 'isActive', label: 'Ativo', field: 'isActive', align: 'center' },
        { name: 'acoes', label: 'Ações', field: 'acoes', align: 'center' }
      ]
    }
  },
  computed: {
    isManager () {
      // Verificar diretamente do localStorage ou token
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          return payload.profile === 'manager'
        }
      } catch (error) {
        console.error('Erro ao decodificar token:', error)
      }
      return false
    },
    etiquetasFiltradas () {
      // Gerentes não devem ver etiquetas globais na lista de gerenciamento
      if (this.isManager) {
        return this.etiquetas.filter(etiqueta =>
          etiqueta.queues && etiqueta.queues.length > 0
        )
      }
      return this.etiquetas
    }
  },
  methods: {
    temOutrosDepartamentos (etiqueta) {
      if (!this.isManager || !etiqueta.queues) return false

      // Buscar departamentos que o gerente gerencia
      const managerQueues = JSON.parse(localStorage.getItem('managerQueues') || '[]')
      const managerQueueIds = managerQueues.map(q => q.id)

      // Verificar se todos os departamentos da etiqueta pertencem ao gerente
      return !etiqueta.queues.every(queue => managerQueueIds.includes(queue.id))
    },
    async listarEtiquetas () {
      const { data } = await ListarEtiquetas()
      this.etiquetas = data
    },
    etiquetaCriada (etiqueta) {
      const newEtiquetas = [...this.etiquetas]
      newEtiquetas.push(etiqueta)
      this.etiquetas = [...newEtiquetas]
    },
    etiquetaEditada (etiqueta) {
      const newEtiquetas = [...this.etiquetas]
      const idx = newEtiquetas.findIndex(f => f.id === etiqueta.id)
      if (idx > -1) {
        newEtiquetas[idx] = etiqueta
      }
      this.etiquetas = [...newEtiquetas]
    },
    editarEtiqueta (etiqueta) {
      this.etiquetaEdicao = { ...etiqueta }
      this.modalEtiqueta = true
    },
    deletarEtiqueta (etiqueta) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `Deseja realmente deletar a Etiqueta "${etiqueta.tag}"?`,
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
      }).onOk(() => {
        this.loading = true
        DeletarEtiqueta(etiqueta)
          .then(res => {
            let newEtiquetas = [...this.etiquetas]
            newEtiquetas = newEtiquetas.filter(f => f.id !== etiqueta.id)

            this.etiquetas = [...newEtiquetas]
            this.$q.notify({
              type: 'positive',
              progress: true,
              position: 'top',
              message: `Etiqueta ${etiqueta.tag} deletada!`,
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })
          })
          .catch(error => {
            console.error('Erro ao deletar etiqueta:', error)

            let errorMessage = 'Erro ao deletar etiqueta'
            if (error.response?.data?.error?.includes('ERR_MANAGER_CANNOT_DELETE_SHARED_TAG')) {
              errorMessage = 'Esta etiqueta está associada a departamentos que você não gerencia. Você pode apenas remover os departamentos que administra.'
            } else if (error.response?.data?.error?.includes('ERR_TAG_CONTACTS_EXISTS')) {
              errorMessage = 'Esta etiqueta está sendo usada por contatos/tickets e não pode ser removida.'
            }

            this.$q.notify({
              type: 'negative',
              progress: true,
              position: 'top',
              message: errorMessage,
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })
          })
          .finally(() => {
            this.loading = false
          })
      })
    }

  },
  mounted () {
    this.listarEtiquetas()
  }
}
</script>

<style lang="scss" scoped>
</style>
