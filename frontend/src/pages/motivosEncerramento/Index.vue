<template>
    <div>
      <q-table
        flat
        square
        hide-bottom
        class="my-sticky-dynamic q-ma-lg"
        title="Motivos de Encerramento"
        :data="motivos"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :pagination.sync="pagination"
        :rows-per-page-options="[0]"
      >
        <template v-slot:top-right>
          <q-btn
            color="primary"
            icon="add"
            label="Criar"
            @click="motivoEdicao = {}; modalMotivoEncerramento = true"
          />
        </template>
        <template v-slot:body-cell-message="props">
          <q-td class="text-left">
            {{ props.row.message }}
          </q-td>
        </template>
        <template v-slot:body-cell-canKanban="props">
          <q-td class="text-center">
            <q-icon
              :name="props.row.canKanban ? 'check_circle' : 'cancel'"
              :color="props.row.canKanban ? 'positive' : 'grey'"
              size="sm"
            />
          </q-td>
        </template>
        <template v-slot:body-cell-acoes="props">
          <q-td class="text-center">
            <q-btn
              flat
              round
              icon="edit"
              @click="editarMotivo(props.row)"
            />
            <q-btn
              flat
              round
              icon="mdi-delete"
              @click="deletarMotivo(props.row)"
            />
          </q-td>
        </template>
      </q-table>
      <ModalMotivoEncerramento
        :modalMotivoEncerramento.sync="modalMotivoEncerramento"
        :motivoEdicao.sync="motivoEdicao"
        @motivo-encerramento:criado="motivoCriado"
        @motivo-encerramento:editado="motivoEditado"
      />
    </div>
  </template>

<script>
import { DeletarMotivoEncerramento, ListarMotivosEncerramento } from 'src/service/motivoEncerramento'
import ModalMotivoEncerramento from './ModalMotivoEncerramento.vue'

export default {
  name: 'MotivosEncerramento',
  components: {
    ModalMotivoEncerramento
  },
  data () {
    return {
      motivoEdicao: {},
      modalMotivoEncerramento: false,
      motivos: [],
      pagination: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      },
      loading: false,
      columns: [
        { name: 'id', label: '#', field: 'id', align: 'left' },
        { name: 'message', label: 'Motivo', field: 'message', align: 'left' },
        { name: 'canKanban', label: 'Permitir Kanban', field: 'canKanban', align: 'center' },
        { name: 'acoes', label: 'Ações', field: 'acoes', align: 'center' }
      ]
    }
  },
  methods: {
    async listarMotivos () {
      try {
        this.loading = true
        const { data } = await ListarMotivosEncerramento()
        this.motivos = data
      } catch (error) {
        console.error(error)
        this.$notificarErro('Ocorreu um erro ao listar os motivos', error)
      } finally {
        this.loading = false
      }
    },
    motivoCriado (motivo) {
      const newMotivos = [...this.motivos]
      newMotivos.push(motivo)
      this.motivos = [...newMotivos]
    },
    motivoEditado (motivo) {
      const newMotivos = [...this.motivos]
      const idx = newMotivos.findIndex(f => f.id === motivo.id)
      if (idx > -1) {
        newMotivos[idx] = motivo
      }
      this.motivos = [...newMotivos]
    },
    editarMotivo (motivo) {
      this.motivoEdicao = { ...motivo }
      this.modalMotivoEncerramento = true
    },
    async deletarMotivo (motivo) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `Deseja realmente deletar o Motivo "${motivo.message}"?`,
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
          this.loading = true
          await DeletarMotivoEncerramento(motivo.id)

          let newMotivos = [...this.motivos]
          newMotivos = newMotivos.filter(f => f.id !== motivo.id)
          this.motivos = [...newMotivos]

          this.$q.notify({
            type: 'positive',
            progress: true,
            position: 'top',
            message: `Motivo "${motivo.message}" deletado!`,
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        } catch (error) {
          console.error(error)
          this.$notificarErro('Ocorreu um erro ao deletar o motivo', error)
        } finally {
          this.loading = false
        }
      })
    }
  },
  mounted () {
    this.listarMotivos()
  }
}
</script>

  <style lang="scss" scoped>
  </style>
