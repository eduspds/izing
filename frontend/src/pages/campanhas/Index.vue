<template>
  <div>
    <q-table
      flat
      bordered
      square
      hide-bottom
      class="my-sticky-dynamic q-ma-lg"
      title="Campanhas"
      :data="campanhas"
      :columns="columns"
      :loading="loading"
      row-key="id"
      :pagination.sync="pagination"
      :rows-per-page-options="[0]"
    >
      <template v-slot:top-right>
        <q-btn
          class="q-mr-md"
          color="primary"
          icon="refresh"
          outline
          @click="listarCampanhas"
        >
          <q-tooltip>
            Atualizar Listagem
          </q-tooltip>
        </q-btn>
        <q-btn
          class="q-mr-md"
          color="blue"
          label="Baixar Modelo"
          icon="download"
          @click="baixarModeloCampanha"
        >
          <q-tooltip>
            Baixar modelo para importar contatos da campanha
          </q-tooltip>
        </q-btn>
        <q-btn
          color="primary"
          label="Adicionar"
          @click="campanhaEdicao = {}; modalCampanha = true"
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
            icon="mdi-account-details-outline"
            @click="contatosCampanha(props.row)"
          >
            <q-tooltip>
              Lista de Contatos da Campanha
            </q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="mdi-send-check"
            color="teal"
            @click="abrirEnvioTeste(props.row)"
          >
            <q-tooltip>
              Envio Teste
            </q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="mdi-calendar-clock"
            @click="iniciarCampanha(props.row)"
          >
            <q-tooltip>
              Programar Envio
            </q-tooltip>
          </q-btn>
          <q-btn
            v-if="props.row.status !== 'finished'"
            flat
            round
            icon="mdi-close-box-multiple"
            @click="cancelarCampanha(props.row)"
          >
            <q-tooltip>
              Cancelar Campanha
            </q-tooltip>
          </q-btn>
          <q-btn
            v-if="props.row.status === 'finished'"
            flat
            round
            icon="mdi-refresh"
            color="green"
            @click="reenviarCampanha(props.row)"
          >
            <q-tooltip>
              Reenviar Campanha
            </q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="edit"
            @click="editarCampanha(props.row)"
          >
            <q-tooltip>
              Editar Campanha
            </q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="mdi-delete"
            @click="deletarCampanha(props.row)"
          >
            <q-tooltip>
              Excluir Campanha
            </q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
    <ModalCampanha
      v-if="modalCampanha"
      :modalCampanha.sync="modalCampanha"
      :campanhaEdicao.sync="campanhaEdicao"
      @modal-campanha:criada="campanhaCriada"
      @modal-campanha:editada="campanhaEditada"
    />
    <ModalEnvioTeste
      v-if="modalEnvioTeste"
      :modalEnvioTeste.sync="modalEnvioTeste"
      :campanha="campanhaParaTeste"
    />
  </div>
</template>

<script>
import { CancelarCampanha, DeletarCampanha, IniciarCampanha, ListarCampanhas, ResetarCampanha } from 'src/service/campanhas'
import ModalCampanha from './ModalCampanha'
import ModalEnvioTeste from './ModalEnvioTeste'
import { format, parseISO, startOfDay } from 'date-fns'

export default {
  name: 'Campanhas',
  components: {
    ModalCampanha,
    ModalEnvioTeste
  },
  data () {
    return {
      campanhaEdicao: {},
      modalCampanha: false,
      modalEnvioTeste: false,
      campanhaParaTeste: {},
      campanhas: [],
      pagination: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      },
      loading: false,
      columns: [
        { name: 'id', label: '#', field: 'id', align: 'left' },
        { name: 'name', label: 'Campanha', field: 'name', align: 'left' },
        { name: 'start', label: 'Início', field: 'start', align: 'center', format: (v) => format(parseISO(v), 'dd/MM/yyyy') },
        {
          name: 'status',
          label: 'Status',
          field: 'status',
          align: 'center',
          format: (v) => v ? this.status[v] : ''
        },
        { name: 'contactsCount', label: 'Qtd. Contatos', field: 'contactsCount', align: 'center' },
        { name: 'pendentesEnvio', label: 'À Enviar', field: 'pendentesEnvio', align: 'center' },
        { name: 'pendentesEntrega', label: 'À Entregar', field: 'pendentesEntrega', align: 'center' },
        { name: 'recebidas', label: 'Recebidas', field: 'recebidas', align: 'center' },
        { name: 'lidas', label: 'Lidas', field: 'lidas', align: 'center' },
        { name: 'acoes', label: 'Ações', field: 'acoes', align: 'center' }
      ],
      status: {
        pending: 'Pendente',
        scheduled: 'Programada',
        processing: 'Processando',
        canceled: 'Cancelada',
        finished: 'Finalizada'
      }
    }
  },
  methods: {
    baixarModeloCampanha () {
      try {
        // Cria um link para baixar o modelo que está na pasta public
        const link = document.createElement('a')
        link.href = '/Modelo de importação de campanha.xlsx'
        link.setAttribute('download', 'Modelo de importação de campanha.xlsx')
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        this.$q.notify({
          type: 'positive',
          message: 'Modelo baixado com sucesso!',
          caption: 'Use este arquivo como base para importar contatos da campanha',
          position: 'top',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      } catch (error) {
        console.error('Erro ao baixar modelo:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao baixar modelo',
          caption: 'Tente novamente ou verifique sua conexão',
          position: 'top',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      }
    },
    async listarCampanhas () {
      const { data } = await ListarCampanhas()
      this.campanhas = data
    },
    isValidDate (v) {
      return startOfDay(new Date(parseISO(v))).getTime() >= startOfDay(new Date()).getTime()
    },
    campanhaCriada (campanha) {
      // const newCampanhas = [...this.campanhas]
      // newCampanhas.push(campanha)
      // this.campanhas = [...newCampanhas]
      this.listarCampanhas()
    },
    campanhaEditada (campanha) {
      // const newCampanhas = [...this.campanhas]
      // const idx = newCampanhas.findIndex(f => f.id === campanha.id)
      // if (idx > -1) {
      //   newCampanhas[idx] = campanha
      // }
      // this.campanhas = [...newCampanhas]
      this.listarCampanhas()
    },
    editarCampanha (campanha) {
      if (campanha.status !== 'pending' && campanha.status !== 'canceled') {
        this.$notificarErro('Só é permitido editar campanhas que estejam pendentes ou canceladas.')
      }
      this.campanhaEdicao = {
        ...campanha,
        start: format(parseISO(campanha.start), 'yyyy-MM-dd'),
        end: format(parseISO(campanha.start), 'yyyy-MM-dd')
      }
      this.modalCampanha = true
    },
    deletarCampanha (campanha) {
      if (campanha.status !== 'pending' && campanha.status !== 'canceled' && campanha.contactsCount) {
        this.$notificarErro('Só é permitido deletar campanhas que estejam pendentes ou canceladas e não possuam contatos vinculados.')
      }
      this.$q.dialog({
        title: 'Atenção!!',
        message: `Deseja realmente deletar a Campanha "${campanha.tag}"?`,
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
        DeletarCampanha(campanha)
          .then(res => {
            let newCampanhas = [...this.campanhas]
            newCampanhas = newCampanhas.filter(f => f.id !== campanha.id)
            this.campanhas = [...newCampanhas]
            this.$notificarSucesso(`Campanha ${campanha.tag} deletada!`)
          })
        this.loading = false
      })
    },
    contatosCampanha (campanha) {
      this.$router.push({
        name: 'contatos-campanha',
        params: {
          campanhaId: campanha.id,
          campanha
        }
      })
    },
    cancelarCampanha (campanha) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `Deseja realmente deletar a Campanha "${campanha.name}"?`,
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
        CancelarCampanha(campanha.id)
          .then(res => {
            this.$notificarSucesso('Campanha cancelada.')
            this.listarCampanhas()
          }).catch(err => {
            this.$notificarErro('Não foi possível cancelar a campanha.', err)
          })
      })
    },
    iniciarCampanha (campanha) {
      if (!this.isValidDate(campanha.start)) {
        this.$notificarErro('Não é possível programar campanha com data menor que a atual')
        return
      }

      if (campanha.contactsCount == 0 || !campanha.contactsCount) {
        this.$notificarErro('Necessário ter contatos vinculados para programar a campanha.')
        return
      }

      if (campanha.status !== 'pending' && campanha.status !== 'canceled') {
        this.$notificarErro('Só é permitido programar campanhas que estejam pendentes ou canceladas.')
        return
      }

      IniciarCampanha(campanha.id).then(res => {
        this.$notificarSucesso('Campanha iniciada.')
        this.listarCampanhas()
      }).catch(err => {
        this.$notificarErro('Não foi possível iniciar a campanha.', err)
      })
    },
    abrirEnvioTeste (campanha) {
      this.campanhaParaTeste = campanha
      this.modalEnvioTeste = true
    },
    reenviarCampanha (campanha) {
      this.$q.dialog({
        title: 'Reenviar Campanha',
        message: `Deseja reenviar a campanha "${campanha.name}"? Isso irá resetar os envios e abrir o editor para você revisar antes de programar novamente. Os contatos vinculados serão mantidos.`,
        cancel: {
          label: 'Não',
          color: 'grey',
          push: true
        },
        ok: {
          label: 'Sim, Reenviar',
          color: 'positive',
          push: true
        },
        persistent: true
      }).onOk(async () => {
        this.loading = true
        try {
          const { data } = await ResetarCampanha(campanha.id)

          // data agora contém { campaign, contacts }
          const campanhaResetada = data.campaign || data
          const contatosVinculados = data.contacts || []

          this.$q.notify({
            type: 'positive',
            message: `Campanha resetada com sucesso! ${contatosVinculados.length} contato(s) mantido(s).`,
            position: 'top',
            progress: true,
            timeout: 3000,
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })

          // Atualizar lista
          await this.listarCampanhas()

          // Abrir modal de edição automaticamente com info dos contatos
          this.campanhaEdicao = {
            ...campanhaResetada,
            start: format(parseISO(campanhaResetada.start), 'yyyy-MM-dd'),
            end: format(parseISO(campanhaResetada.start), 'yyyy-MM-dd'),
            // Adicionar informação de contatos vinculados
            _existingContacts: contatosVinculados,
            _hasExistingContacts: contatosVinculados.length > 0
          }
          this.modalCampanha = true
        } catch (err) {
          this.$notificarErro('Não foi possível resetar a campanha.', err)
        } finally {
          this.loading = false
        }
      })
    }
  },
  mounted () {
    this.listarCampanhas()
  }
}

</script>

<style lang="scss" scoped>
</style>
