<template>
  <div>
    <div class="row">
      <div class="col">
        <q-table
          square
          flat
          bordered
          class="my-sticky-dynamic q-ma-lg"
          title="Fluxos"
          hide-bottom
          :data="listachatFlow"
          :columns="columns"
          :loading="loading"
          row-key="id"
          :pagination.sync="pagination"
          :rows-per-page-options="[0]"
        >
          <template v-slot:top-right>
            <q-btn
              color="primary"
              icon="mdi-upload"
              label="Importar"
              @click="abrirModalImportar"
              class="q-mr-sm"
            >
              <q-tooltip>Importar fluxo</q-tooltip>
            </q-btn>
            <q-btn
              color="primary"
              label="Adicionar"
              @click="chatFlowSelecionado = {}; modalChatFlow = true"
            />
          </template>
          <template v-slot:body-cell-isActive="props">
            <q-td class="text-center">
              <q-icon
                size="16px"
                :name="props.value ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'"
                :color="props.value ? 'positive' : 'negative'"
                class=""
              />
              <span class="q-mx-xs text-bold"> {{ props.value ? 'Ativo' : 'Inativo' }} </span>
            </q-td>
          </template>
          <template v-slot:body-cell-acoes="props">
            <q-td class="text-center">
              <q-btn
                color="blue-3"
                icon="edit"
                flat
                round
                class="bg-padrao"
                @click="editFlow(props.row)"
              >
                <q-tooltip>
                  Editar informações
                </q-tooltip>
              </q-btn>
              <q-btn
                color="blue-3"
                icon="mdi-content-duplicate"
                flat
                round
                class="bg-padrao q-mx-sm"
                @click="duplicarFluxo(props.row)"
              >
                <q-tooltip>
                  Duplicar Fluxo
                </q-tooltip>
              </q-btn>
              <q-btn
                color="blue-3"
                icon="mdi-sitemap"
                flat
                round
                class="bg-padrao"
                @click="abrirFluxo(props.row)"
              >
                <q-tooltip>
                  Abrir Fluxo
                </q-tooltip>
              </q-btn>
              <q-btn
                color="blue-3"
                icon="mdi-download"
                flat
                round
                class="bg-padrao"
                @click="exportarFluxo(props.row)"
              >
                <q-tooltip>
                  Exportar Fluxo
                </q-tooltip>
              </q-btn>
              <q-btn
                color="blue-3"
                icon="delete"
                flat
                round
                class="bg-padrao"
                @click="deletarFluxo(props.row)"
              >
                <q-tooltip>
                  Excluir
                </q-tooltip>
              </q-btn>
            </q-td>
          </template>

        </q-table>
      </div>
    </div>
    <ModalChatFlow
      :modalChatFlow.sync="modalChatFlow"
      :chatFlowEdicao.sync="chatFlowSelecionado"
      @chatFlow:criada="novoFluxoCriado"
      @chatFlow:editado="fluxoEditado"
    />

    <!-- Modal de Importação -->
    <q-dialog v-model="modalImportar" persistent>
      <q-card style="min-width: 500px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Importar Fluxo</div>
        </q-card-section>

        <q-card-section>
          <q-file
            v-model="arquivoImportar"
            label="Selecione o arquivo JSON"
            accept=".json"
            outlined
            clearable
            @input="lerArquivoJSON"
          >
            <template v-slot:prepend>
              <q-icon name="mdi-file-upload" />
            </template>
          </q-file>

          <div v-if="fluxoImportado" class="q-mt-md">
            <q-banner class="bg-positive text-white q-mb-md" rounded>
              <template v-slot:avatar>
                <q-icon name="mdi-check-circle" />
              </template>
              Arquivo carregado com sucesso!
            </q-banner>

            <div class="q-mb-sm text-bold">Informações do Fluxo:</div>
            <div><strong>Nome:</strong> {{ fluxoImportado.name }}</div>
            <div v-if="fluxoImportado.celularTeste">
              <strong>Celular Teste:</strong> {{ fluxoImportado.celularTeste }}
            </div>
            <div><strong>Ativo:</strong> {{ fluxoImportado.isActive ? 'Sim' : 'Não' }}</div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancelar"
            color="primary"
            @click="fecharModalImportar"
          />
          <q-btn
            label="Importar"
            color="positive"
            :disable="!fluxoImportado"
            @click="confirmarImportacao"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDelete" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Você tem certeza que dessa escluir esse fluxo?</div>
          <div>{{ chatFlowSelecionado.name }}</div>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn
            flat
            label="Cancelar"
            v-close-popup
            class="q-mr-md"
          />
          <q-btn flat label="Excluir" color="negative" v-close-popup @click="confirmDeleteFoo()" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ListarFilas } from 'src/service/filas'
import { ListarChatFlow, DeletarChatFlow } from 'src/service/chatFlow'
import { ListarUsuarios } from 'src/service/user'
import ModalChatFlow from './ModalChatFlow.vue'

export default {
  name: 'ChatFlowIndex',
  components: { ModalChatFlow },
  data () {
    return {
      confirmDelete: false,
      listachatFlow: [],
      modalChatFlow: false,
      chatFlowSelecionado: {},
      pagination: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      },
      params: {
        pageNumber: 1,
        searchParam: null,
        hasMore: true
      },
      loading: false,
      columns: [
        { name: 'name', label: 'Nome', field: 'name', align: 'left' },
        { name: 'isActive', label: 'Status', field: 'isActive', align: 'center' },
        { name: 'celularTeste', label: 'Celular Teste', field: 'celularTeste', align: 'center' },
        { name: 'acoes', label: '', field: 'acoes', align: 'center' }
      ],
      filas: [],
      usuarios: [],
      modalImportar: false,
      arquivoImportar: null,
      fluxoImportado: null
    }
  },
  methods: {
    async listarChatFlow () {
      const { data } = await ListarChatFlow()
      this.listachatFlow = data.chatFlow
    },
    async listarFilas () {
      const { data } = await ListarFilas({ isActive: true })
      this.filas = data.filter(q => q.isActive)
    },
    async listarUsuarios () {
      const { data } = await ListarUsuarios(this.params)
      this.usuarios = data.users
    },
    novoFluxoCriado (flow) {
      const lista = [...this.listachatFlow]
      lista.push(flow)
      this.listachatFlow = lista
    },
    duplicarFluxo (flow) {
      this.chatFlowSelecionado = { ...flow, isDuplicate: true }
      this.modalChatFlow = true
    },
    fluxoEditado (flow) {
      const lista = [...this.listachatFlow.filter(f => f.id !== flow.id)]
      lista.push(flow)
      this.listachatFlow = lista
    },
    editFlow (flow) {
      this.chatFlowSelecionado = flow
      this.modalChatFlow = true
    },
    async abrirFluxo (flow) {
      await this.$store.commit('SET_FLOW_DATA', {
        usuarios: this.usuarios,
        filas: this.filas,
        flow
      })
      this.$router.push({ name: 'chat-flow-builder' })
    },
    deletarFluxo (flow) {
      this.chatFlowSelecionado = flow
      this.confirmDelete = true
    },
    async confirmDeleteFoo (flow) {
      await DeletarChatFlow(this.chatFlowSelecionado)
      await this.listarChatFlow()
    },
    exportarFluxo (flow) {
      try {
        // Criar objeto do fluxo para exportar
        const fluxoParaExportar = {
          name: flow.name,
          isActive: flow.isActive,
          celularTeste: flow.celularTeste,
          flow: flow.flow, // O JSON do fluxo
          userId: flow.userId
        }

        // Converter para JSON
        const json = JSON.stringify(fluxoParaExportar, null, 2)

        // Criar blob
        const blob = new Blob([json], { type: 'application/json' })

        // Criar link de download
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `fluxo-${flow.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        this.$q.notify({
          type: 'positive',
          message: 'Fluxo exportado com sucesso!',
          position: 'top',
          timeout: 2000
        })
      } catch (error) {
        console.error('Erro ao exportar fluxo:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao exportar fluxo',
          position: 'top'
        })
      }
    },
    abrirModalImportar () {
      this.modalImportar = true
      this.arquivoImportar = null
      this.fluxoImportado = null
    },
    fecharModalImportar () {
      this.modalImportar = false
      this.arquivoImportar = null
      this.fluxoImportado = null
    },
    lerArquivoJSON () {
      if (!this.arquivoImportar) {
        this.fluxoImportado = null
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result)

          // Validar estrutura básica - aceita tanto formato com flow aninhado quanto sem
          if (!json.name) {
            throw new Error('Estrutura de arquivo inválida: nome não encontrado')
          }

          // Normalizar estrutura: se não tem flow aninhado, criar um
          let fluxoNormalizado = { ...json }

          if (!json.flow) {
            // Se não tem flow aninhado, assume que nodeList e lineList estão no nível raiz
            if (!json.nodeList) {
              throw new Error('Estrutura de arquivo inválida: nodeList não encontrado')
            }

            // Criar estrutura com flow aninhado
            fluxoNormalizado = {
              name: json.name,
              isActive: json.isActive !== undefined ? json.isActive : true,
              celularTeste: json.celularTeste || null,
              userId: json.userId || null,
              flow: {
                name: json.name,
                nodeList: json.nodeList || [],
                lineList: json.lineList || [],
                action: json.action !== undefined ? json.action : 0,
                userId: json.userId || null,
                celularTeste: json.celularTeste || null,
                isActive: json.isActive !== undefined ? json.isActive : true,
                id: null
              }
            }
          } else {
            // Se já tem flow aninhado, garantir que as propriedades do nível raiz estejam corretas
            fluxoNormalizado = {
              name: json.name,
              isActive: json.isActive !== undefined ? json.isActive : (json.flow.isActive !== undefined ? json.flow.isActive : true),
              celularTeste: json.celularTeste !== undefined ? json.celularTeste : (json.flow.celularTeste || null),
              userId: json.userId || json.flow.userId || null,
              flow: {
                ...json.flow,
                id: null // Sempre remover id ao importar
              }
            }
          }

          this.fluxoImportado = fluxoNormalizado
        } catch (error) {
          console.error('Erro ao ler arquivo:', error)
          this.$q.notify({
            type: 'negative',
            message: `Arquivo JSON inválido: ${error.message}`,
            position: 'top'
          })
          this.arquivoImportar = null
          this.fluxoImportado = null
        }
      }

      reader.readAsText(this.arquivoImportar)
    },
    async confirmarImportacao () {
      if (!this.fluxoImportado) return

      try {
        // Garantir que o fluxo importado tenha a estrutura correta com flow aninhado
        // O fluxoImportado já foi normalizado em lerArquivoJSON, então sempre terá flow
        const fluxoParaImportar = {
          name: `${this.fluxoImportado.name} (Importado)`,
          isActive: this.fluxoImportado.isActive !== undefined ? this.fluxoImportado.isActive : true,
          celularTeste: this.fluxoImportado.celularTeste || null,
          userId: this.fluxoImportado.userId || null,
          flow: {
            ...this.fluxoImportado.flow,
            name: `${this.fluxoImportado.name} (Importado)`,
            id: null // Sempre remover id ao importar
            // Preservar todas as outras propriedades do flow (nodeList, lineList, action, etc.)
          },
          isDuplicate: true
        }

        // Criar uma cópia do fluxo importado para edição/duplicação
        this.chatFlowSelecionado = fluxoParaImportar

        // Fechar modal de importação e abrir modal de criação
        this.fecharModalImportar()
        this.modalChatFlow = true

        this.$q.notify({
          type: 'info',
          message: 'Fluxo carregado! Ajuste as informações e salve.',
          position: 'top',
          timeout: 3000
        })
      } catch (error) {
        console.error('Erro ao importar fluxo:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao importar fluxo',
          position: 'top'
        })
      }
    }
  },
  async mounted () {
    await this.listarChatFlow()
    await this.listarFilas()
    await this.listarUsuarios()
  }
}
</script>

<style lang="scss" scoped>
</style>
