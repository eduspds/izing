<template>
  <div>
    <q-card class="q-ma-md">
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-h6">
            Versões Publicadas
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-input
          v-model="searchParam"
          placeholder="Pesquisar por título ou descrição..."
          outlined
          dense
          clearable
          debounce="300"
          @input="onSearch"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </q-card-section>
      <q-separator />
      <q-card-section class="scroll" style="height: calc(100vh - 300px)">
        <q-table
          :data="releases"
          :columns="columns"
          :loading="loading"
          :pagination.sync="pagination"
          row-key="id"
          @request="onRequest"
          binary-state-sort
        >
          <template v-slot:body-cell-version="props">
            <q-td :props="props">
              <q-badge color="primary">{{ props.value }}</q-badge>
            </q-td>
          </template>
          <template v-slot:body-cell-forceRefresh="props">
            <q-td :props="props">
              <q-icon
                :name="props.value ? 'check_circle' : 'cancel'"
                :color="props.value ? 'positive' : 'negative'"
                size="md"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-user="props">
            <q-td :props="props">
              <div class="row items-center q-gutter-xs">
                <q-icon name="mdi-account" size="sm" color="grey-6" />
                <span>{{ props.row.user?.name || 'N/A' }}</span>
              </div>
            </q-td>
          </template>
          <template v-slot:body-cell-acoes="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="primary"
                @click="visualizarRelease(props.row)"
              >
                <q-tooltip>Visualizar atualização</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Modal de Visualização -->
    <ModalAtualizacao
      :showModal="modalVisualizacao"
      :release="releaseSelecionada"
      :modoVisualizacao="true"
      @close="fecharModalVisualizacao"
    />
  </div>
</template>

<script>
import { ListarReleases } from 'src/service/releases'
import ModalAtualizacao from 'src/components/ModalAtualizacao.vue'

export default {
  name: 'Releases',
  components: {
    ModalAtualizacao
  },
  data () {
    return {
      releases: [],
      loading: false,
      modalVisualizacao: false,
      releaseSelecionada: null,
      searchParam: '',
      pagination: {
        sortBy: 'createdAt',
        descending: true,
        page: 1,
        rowsPerPage: 40,
        rowsNumber: 0
      },
      columns: [
        {
          name: 'version',
          label: 'Versão',
          field: 'version',
          align: 'left',
          sortable: true
        },
        {
          name: 'title',
          label: 'Título',
          field: 'title',
          align: 'left',
          sortable: true
        },
        {
          name: 'description',
          label: 'Descrição',
          field: 'description',
          align: 'left',
          format: (val) => {
            if (!val) return ''
            // Remover HTML tags para exibição na tabela
            const div = document.createElement('div')
            div.innerHTML = val
            const text = div.textContent || div.innerText || ''
            return text.length > 100 ? text.substring(0, 100) + '...' : text
          }
        },
        {
          name: 'user',
          label: 'Criado por',
          field: (row) => row.user?.name || 'N/A',
          align: 'left',
          sortable: false
        },
        {
          name: 'forceRefresh',
          label: 'Forçar Atualização',
          field: 'forceRefresh',
          align: 'center',
          sortable: true
        },
        {
          name: 'createdAt',
          label: 'Data de Publicação',
          field: 'createdAt',
          align: 'left',
          format: (val) => {
            if (!val) return ''
            return new Date(val).toLocaleString('pt-BR')
          },
          sortable: true
        },
        {
          name: 'acoes',
          label: 'Ações',
          field: 'acoes',
          align: 'center'
        }
      ]
    }
  },
  methods: {
    async onRequest (props) {
      const { page, rowsPerPage, sortBy, descending } = props.pagination
      this.loading = true

      try {
        const params = {
          pageNumber: page,
          searchParam: this.searchParam || ''
        }

        const { data } = await ListarReleases(params)
        this.releases = data.releases || []
        this.pagination.rowsNumber = data.count || 0
        this.pagination.page = page
        this.pagination.rowsPerPage = rowsPerPage
        this.pagination.sortBy = sortBy
        this.pagination.descending = descending
      } catch (error) {
        this.$notificarErro('Não foi possível carregar as releases', error)
      } finally {
        this.loading = false
      }
    },
    visualizarRelease (release) {
      // Fechar modal anterior se estiver aberto
      if (this.modalVisualizacao) {
        this.modalVisualizacao = false
      }

      // Usar $nextTick para garantir que o modal anterior foi fechado antes de abrir outro
      this.$nextTick(() => {
        // Converter a release para o formato esperado pelo modal
        this.releaseSelecionada = {
          version: release.version,
          title: release.title,
          description: release.description,
          forceRefresh: release.forceRefresh,
          media: release.media || [],
          createdAt: release.createdAt
        }
        this.modalVisualizacao = true
      })
    },
    fecharModalVisualizacao () {
      // Usar $nextTick para garantir que o estado seja atualizado corretamente
      this.$nextTick(() => {
        this.modalVisualizacao = false
        this.releaseSelecionada = null
        // Recarregar lista após fechar modal para garantir dados atualizados
        this.onRequest({
          pagination: this.pagination
        })
      })
    },
    onSearch () {
      // Resetar para primeira página ao pesquisar
      this.pagination.page = 1
      this.onRequest({
        pagination: this.pagination
      })
    }
  },
  mounted () {
    this.onRequest({
      pagination: this.pagination
    })
  },
  activated () {
    // Quando a rota é ativada (usuário navega para esta página), recarregar lista
    this.onRequest({
      pagination: this.pagination
    })
  },
  watch: {
    // Observar mudanças na rota para recarregar quando entrar na página
    '$route' (to, from) {
      if (to.name === 'releases') {
        this.onRequest({
          pagination: this.pagination
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped></style>
