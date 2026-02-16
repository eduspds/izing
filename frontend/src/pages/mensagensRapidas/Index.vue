<template>
  <div>
    <q-table
      flat
      bordered
      square
      hide-bottom
      class="my-sticky-dynamic q-ma-lg"
      title="Mensagens Rápidas"
      :data="mensagensRapidasFiltradas"
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
          @click="mensagemRapidaEmEdicao = {}; modalMensagemRapida = true"
        />
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
      <template v-slot:body-cell-acoes="props">
        <q-td class="text-center">
          <q-btn
            flat
            round
            icon="edit"
            @click="editarMensagem(props.row)"
          />
          <q-btn
            flat
            round
            icon="mdi-delete"
            @click="deletarMensagem(props.row)"
          >
            <q-tooltip v-if="isManager && temOutrosDepartamentos(props.row)" class="bg-orange">
              Esta mensagem rápida tem departamentos de outros gerentes. Você pode apenas remover os departamentos que administra.
            </q-tooltip>
            <q-tooltip v-else-if="isManager">
              Remover mensagem rápida
            </q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
    <ModalMensagemRapida
      :modalMensagemRapida.sync="modalMensagemRapida"
      :mensagemRapidaEmEdicao.sync="mensagemRapidaEmEdicao"
      @mensagemRapida:criada="mensagemCriada"
      @mensagemRapida:editada="mensagemEditada"
    />
  </div>
</template>

<script>
import ModalMensagemRapida from './ModalMensagemRapida'
import { ListarMensagensRapidas, DeletarMensagemRapida } from 'src/service/mensagensRapidas'
export default {
  name: 'MensagensRapidas',
  components: { ModalMensagemRapida },
  data () {
    return {
      loading: false,
      mensagensRapidas: [],
      modalMensagemRapida: false,
      mensagemRapidaEmEdicao: {},
      columns: [
        { name: 'id', label: '#', field: 'id', align: 'left' },
        { name: 'key', label: 'Chave', field: 'key', align: 'left' },
        { name: 'message', label: 'Mensagem', field: 'message', align: 'left' },
        { name: 'departamentos', label: 'Departamentos', field: 'departamentos', align: 'left' },
        { name: 'acoes', label: 'Ações', field: 'acoes', align: 'center' }
      ],
      pagination: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      }
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
    mensagensRapidasFiltradas () {
      // Gerentes não devem ver mensagens globais na lista de gerenciamento
      if (this.isManager) {
        return this.mensagensRapidas.filter(mensagem =>
          mensagem.queues && mensagem.queues.length > 0
        )
      }
      return this.mensagensRapidas
    }
  },
  methods: {
    temOutrosDepartamentos (mensagem) {
      if (!this.isManager || !mensagem.queues) return false

      // Buscar departamentos que o gerente gerencia
      const managerQueues = JSON.parse(localStorage.getItem('managerQueues') || '[]')
      const managerQueueIds = managerQueues.map(q => q.id)

      // Verificar se todos os departamentos da mensagem pertencem ao gerente
      return !mensagem.queues.every(queue => managerQueueIds.includes(queue.id))
    },
    async listarMensagensRapidas () {
      const { data } = await ListarMensagensRapidas()
      this.mensagensRapidas = data
    },
    mensagemCriada (mensagem) {
      this.mensagensRapidas.unshift(mensagem)
    },
    mensagemEditada (mensagem) {
      const newMensagens = [...this.mensagensRapidas]
      const idx = newMensagens.findIndex(m => m.id === mensagem.id)
      if (idx > -1) {
        newMensagens[idx] = mensagem
      }
      this.mensagensRapidas = [...newMensagens]
    },
    editarMensagem (mensagem) {
      this.mensagemRapidaEmEdicao = { ...mensagem }
      this.modalMensagemRapida = true
    },
    deletarMensagem (mensagem) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `Deseja realmente deletar a mensagem de chave "${mensagem.key}"?`,
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
        DeletarMensagemRapida(mensagem)
          .then(res => {
            let newMensagens = [...this.mensagensRapidas]
            newMensagens = newMensagens.filter(m => m.id !== mensagem.id)

            this.mensagensRapidas = [...newMensagens]
            this.$q.notify({
              type: 'positive',
              progress: true,
              position: 'top',
              message: 'Mensagem deletada!',
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })
          })
          .catch(error => {
            console.error('Erro ao deletar mensagem rápida:', error)

            let errorMessage = 'Erro ao deletar mensagem rápida'
            if (error.response?.data?.error?.includes('ERR_MANAGER_CANNOT_DELETE_SHARED_FAST_REPLY')) {
              errorMessage = 'Esta mensagem rápida está associada a departamentos que você não gerencia. Você pode apenas remover os departamentos que administra.'
            } else if (error.response?.data?.error?.includes('ERR_FAST_REPLY_EXISTS')) {
              errorMessage = 'Esta mensagem rápida está sendo usada e não pode ser removida.'
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
    this.listarMensagensRapidas()
  }
}
</script>

<style lang="scss" scoped>
</style>
