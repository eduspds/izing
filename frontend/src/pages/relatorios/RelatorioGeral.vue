<template>
    <div>
      <q-card class="q-ma-md" bordered>
        <q-card-section class="q-pa-md">
          <div class="text-h6">Relatório Geral</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="row q-gutter-md">
            <div class="col-12 col-md">
              <q-select v-model="filtros.whatsappId" :options="canais" label="Canal" dense emit-value map-options
                option-value="id" option-label="name" clearable />
            </div>
            <div class="col-12 col-md">
              <q-select v-model="filtros.userIds" :options="usuarios" label="Usuário" dense multiple use-chips emit-value
                map-options option-value="id" option-label="name" @update:model-value="handleSelection('userIds', $event)"
                ref="userSelectRef" />
            </div>
            <div class="col-12 col-md">
              <q-select v-model="filtros.queueIds" :options="departamentos" label="Departamento" dense multiple use-chips
                emit-value map-options option-value="id" option-label="queue"
                @update:model-value="handleSelection('queueIds', $event)" ref="departmentSelectRef" />
            </div>
            <div class="col-12 col-md">
              <q-select v-model="filtros.tags" :options="etiquetas" label="Etiqueta" dense multiple use-chips emit-value
                map-options option-value="id" option-label="tag" @update:model-value="handleSelection('tags', $event)"
                ref="tagSelectRef" />
            </div>
            <div class="col-12 col-md">
              <q-select v-model="filtros.status" :options="statusOptions" label="Status" dense emit-value map-options
                option-value="id" option-label="status" clearable />
            </div>
            <div class="col-12 col-md">
              <q-select v-model="filtros.closeReasonIds" :options="motivosEncerramento" label="Motivo Encerramento" dense
                multiple use-chips emit-value map-options option-value="id" option-label="message"
                @update:model-value="handleSelection('closeReasonIds', $event)" ref="motivoEncerramentoSelectRef" />
            </div>
          </div>
          <div class="row q-gutter-md q-mt-sm">
            <div class="col-12 col-md-3">
              <q-input v-model="filtros.dateStart" label="Data Inicial" dense readonly>
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="filtros.dateStart" mask="YYYY-MM-DD">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Fechar" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-12 col-md-3">
              <q-input v-model="filtros.dateEnd" label="Data Final" dense readonly>
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="filtros.dateEnd" mask="YYYY-MM-DD">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Fechar" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-12 col-md-auto self-end">
              <q-btn color="primary" label="Buscar" @click="() => buscarRelatorio(1)" class="q-mr-sm" />
              <q-btn flat color="red" label="Limpar" @click="limparFiltros" class="q-mr-sm" />
              <q-btn color="green" label="Exportar XLS" @click="exportarXLS" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card class="q-ma-md" bordered>
        <q-card-section>
          <!-- Informações de paginação -->
          <div class="q-mb-md row items-center justify-between">
            <div class="text-caption">
              Mostrando {{ tickets.length }} de {{ pagination.totalRecords }} registros
              (Página {{ pagination.page }} de {{ pagination.totalPages }})
            </div>
            <div class="row items-center q-gutter-sm">
              <span class="text-caption">Registros por página:</span>
              <q-select
                v-model="pagination.pageSize"
                :options="[25, 50, 100, 200]"
                dense
                style="min-width: 80px"
                @update:model-value="alterarTamanhoPagina"
              />
            </div>
          </div>

          <!-- Tabela principal -->
          <div class="table-container">
            <q-table :data="tickets" :columns="[
              {
                name: 'id',
                label: 'ID',
                field: 'id',
                sortable: true,
                align: 'left',
                style: 'width: 70px'
              },
              {
                name: 'status',
                label: 'Status',
                field: 'status',
                sortable: true,
                align: 'left',
                style: 'width: 120px',
                format: (val) => {
                  switch (val) {
                    case 'open': return 'Em atendimento'
                    case 'pending': return 'Em fila'
                    case 'closed': return 'Encerrado'
                    default: return val
                  }
                }
              },
              {
                name: 'departamento',
                label: 'Departamento',
                field: row => row.queue?.name || '',
                sortable: true,
                align: 'left',
                style: 'width: 150px'
              },
              {
                name: 'contato',
                label: 'Contato',
                field: row => row.contact?.name || '',
                sortable: true,
                align: 'left',
                style: 'width: 150px'
              },
              {
                name: 'whatsapp',
                label: 'WhatsApp',
                field: row => row.whatsapp?.name || 'N/A',
                sortable: true,
                align: 'left',
                style: 'width: 150px'
              },
              {
                name: 'inicializacao',
                label: 'Inicialização',
                field: row => row.initialization,
                sortable: true,
                align: 'left',
                style: 'width: 150px'
              },
              {
                name: 'primeiro_atd',
                label: 'Primeiro Atendente',
                field: 'firstAttendant',
                sortable: true,
                align: 'left',
                style: 'width: 150px'
              },
              {
                name: 'ultimo_atd',
                label: 'Último Atendente',
                field: 'lastAttendant',
                sortable: true,
                align: 'left',
                style: 'width: 150px'
              },
              {
                name: 'fim_atd',
                label: 'Fim Atendimento',
                field: row => this.formatarData(row.closedAt ? new Date(Number(row.closedAt)) : null),
                sortable: true,
                align: 'left',
                style: 'width: 150px'
              },
              {
                name: 'tempo_espera',
                label: 'Tempo Espera',
                field: row => this.calcularTempoEspera(row.createdAt, row.startedAttendanceAt),
                sortable: true,
                align: 'left',
                style: 'width: 120px'
              },
              {
                name: 'motivo_enc',
                label: 'Motivo Encerramento',
                field: row => {
                  const motivo = this.motivosEncerramento.find(m => String(m.id) === String(row.endConversationId))
                  return motivo?.message || ''
                },
                sortable: true,
                align: 'left',
                style: 'width: 200px'
              },
              {
                name: 'observacao',
                label: 'Observação',
                field: 'endConversationObservation',
                sortable: true,
                align: 'left',
                style: 'width: 200px'
              }
            ]" row-key="id" flat :loading="loading" :pagination="{
              rowsPerPage: 50,
              sortBy: 'id',
              descending: true
            }" binary-state-sort virtual-scroll>
              <!-- Loading state -->
              <template v-slot:loading>
                <q-inner-loading showing>
                  <q-spinner size="50px" color="primary" />
                </q-inner-loading>
              </template>

              <!-- No data message -->
              <template v-slot:no-data>
                <div class="full-width row flex-center q-pa-md text-negative">
                  Nenhum dado encontrado
                </div>
              </template>

              <!-- Custom body -->
              <template v-slot:body="props">
                <q-tr :props="props">
                  <q-td key="id" :props="props" class="text-left">
                    {{ props.row.id }}
                  </q-td>
                  <q-td key="status" :props="props" class="text-left">
                    <q-chip dense
                      :color="props.row.status === 'open' ? 'green' : props.row.status === 'pending' ? 'orange' : 'grey'"
                      text-color="white" class="q-px-sm">
                      {{ props.row.status === 'open' ? 'Em atendimento' : props.row.status === 'pending' ? 'Em fila' :
                        'Encerrado' }}
                    </q-chip>
                  </q-td>
                  <q-td key="departamento" :props="props" class="text-left">
                    {{ props.row.queue?.name || '' }}
                  </q-td>
                  <q-td key="contato" :props="props" class="text-left">
                    {{ props.row.contact?.name || '' }}
                  </q-td>
                  <q-td key="whatsapp" :props="props" class="text-left">
                    {{ props.row.contact?.number || 'N/A' }}
                  </q-td>
                  <q-td key="inicializacao" :props="props" class="text-left">
                    {{ props.row.initialization }}
                  </q-td>
                  <q-td key="primeiro_atd" :props="props" class="text-left">
                    {{ props.row.firstAttendant || '' }}
                  </q-td>
                  <q-td key="ultimo_atd" :props="props" class="text-left">
                    {{ props.row.lastAttendant || '' }}
                  </q-td>
                  <q-td key="inicio_atd" :props="props" class="text-left">
                    {{ formatarData(props.row.startedAttendanceAt ? new Date(Number(props.row.startedAttendanceAt)) :
                      null) }}
                  </q-td>
                  <q-td key="fim_atd" :props="props" class="text-left">
                    {{ formatarData(props.row.closedAt ? new Date(Number(props.row.closedAt)) : null) }}
                  </q-td>
                  <q-td key="tempo_espera" :props="props" class="text-left">
                    {{ calcularTempoEspera(props.row.createdAt, props.row.startedAttendanceAt) }}
                  </q-td>
                  <q-td key="motivo_enc" :props="props" class="text-left">
                    {{motivosEncerramento.find(m => String(m.id) === String(props.row.endConversationId))?.message || ''
                    }}
                  </q-td>
                  <q-td key="observacao" :props="props" class="text-left">
                    {{ props.row.endConversationObservation || '' }}
                  </q-td>
                </q-tr>
              </template>
            </q-table>
          </div>

          <!-- Controles de paginação -->
          <div v-if="pagination.totalPages > 1" class="q-mt-md row items-center justify-center q-gutter-sm">
            <q-btn
              :disable="pagination.page === 1"
              @click="paginaAnterior"
              icon="chevron_left"
              flat
              round
              dense
            />

            <q-btn
              v-for="pagina in paginasVisiveis"
              :key="pagina"
              :color="pagina === pagination.page ? 'primary' : 'grey-6'"
              :flat="pagina !== pagination.page"
              @click="irParaPagina(pagina)"
              :label="pagina"
              dense
              class="q-px-sm"
            />

            <q-btn
              :disable="pagination.page === pagination.totalPages"
              @click="proximaPagina"
              icon="chevron_right"
              flat
              round
              dense
            />
          </div>
        </q-card-section>
      </q-card>

    </div>
  </template>

<script>
import { format, differenceInMinutes, formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ListarWhatsapps } from 'src/service/sessoesWhatsapp'
import { ListarUsuarios } from 'src/service/user'
import { ListarFilas } from 'src/service/filas'
import { ListarEtiquetas } from 'src/service/etiquetas'
import { ListarMotivosEncerramento } from 'src/service/motivoEncerramento'
import { ConsultarTicketsRelatorio } from 'src/service/tickets'
import * as XLSX from 'xlsx'

const initialFilters = {
  whatsappId: null,
  userIds: [],
  queueIds: [],
  tags: [],
  status: null,
  closeReasonIds: [],
  dateStart: '',
  dateEnd: ''
}

const statusOptions = [
  { id: 'todos', status: 'Todos' },
  { id: 'pending', status: 'Em fila' },
  { id: 'open', status: 'Em atendimento' },
  { id: 'closed', status: 'Encerrado' }
]

export default {
  name: 'RelatorioGeral',
  data () {
    return {
      filtros: { ...initialFilters },
      loading: false,
      canais: [],
      usuarios: [],
      departamentos: [],
      etiquetas: [],
      motivosEncerramento: [],
      tickets: [],
      userSelectRef: null,
      departmentSelectRef: null,
      tagSelectRef: null,
      motivoEncerramentoSelectRef: null,
      statusOptions,
      // Paginação
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 0,
        totalRecords: 0
      }
    }
  },
  computed: {
    // Páginas visíveis para navegação
    paginasVisiveis () {
      const total = this.pagination.totalPages
      const atual = this.pagination.page
      const paginas = []

      if (total <= 7) {
        // Se tem 7 ou menos páginas, mostra todas
        for (let i = 1; i <= total; i++) {
          paginas.push(i)
        }
      } else {
        // Lógica para mostrar páginas com reticências
        if (atual <= 4) {
          // Páginas iniciais
          for (let i = 1; i <= 5; i++) {
            paginas.push(i)
          }
          paginas.push('...')
          paginas.push(total)
        } else if (atual >= total - 3) {
          // Páginas finais
          paginas.push(1)
          paginas.push('...')
          for (let i = total - 4; i <= total; i++) {
            paginas.push(i)
          }
        } else {
          // Páginas do meio
          paginas.push(1)
          paginas.push('...')
          for (let i = atual - 1; i <= atual + 1; i++) {
            paginas.push(i)
          }
          paginas.push('...')
          paginas.push(total)
        }
      }

      return paginas
    }
  },
  methods: {
    formatarData (data) {
      if (!data) return ''
      return format(new Date(data), 'dd/MM/yyyy HH:mm')
    },
    calcularTempoEspera (inicio, fim) {
      if (!inicio || !fim) return ''
      const dataFim = new Date(Number(fim))
      const dataInicio = new Date(inicio)
      if (isNaN(dataFim.getTime())) {
        return ''
      }
      const diff = differenceInMinutes(dataFim, dataInicio)
      if (diff < 0) return ''
      if (diff < 1) return '< 1 minuto'
      if (diff < 60) return formatDistanceStrict(dataFim, dataInicio, { locale: ptBR, unit: 'minute' })
      return formatDistanceStrict(dataFim, dataInicio, { locale: ptBR, unit: 'hour' })
    },
    async inicializarDatas () {
      const hoje = new Date()
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

      this.filtros.dateStart = format(primeiroDiaMes, 'yyyy-MM-dd')
      this.filtros.dateEnd = format(ultimoDiaMes, 'yyyy-MM-dd')
    },
    async carregarCanais () {
      const { data } = await ListarWhatsapps()
      this.canais = data
    },
    async carregarUsuarios () {
      const { data } = await ListarUsuarios()
      this.usuarios = [{ id: 'todos', name: 'Todos' }, ...data.users]
    },
    async carregarDepartamentos () {
      const { data } = await ListarFilas()
      this.departamentos = [{ id: 'todos', queue: 'Todos' }, ...data]
    },
    async carregarEtiquetas () {
      const { data } = await ListarEtiquetas(true)
      this.etiquetas = [{ id: 'todos', tag: 'Todos' }, ...data]
    },
    async carregarMotivosEncerramento () {
      const { data } = await ListarMotivosEncerramento()
      this.motivosEncerramento = [{ id: 'todos', message: 'Todos' }, ...data]
    },
    async buscarRelatorio (page = 1) {
      this.loading = true
      try {
        // Garantir que page seja um número válido
        const pageNumber = typeof page === 'number' ? page : 1

        const params = {
          dateStart: this.filtros.dateStart,
          dateEnd: this.filtros.dateEnd,
          whatsappId: this.filtros.whatsappId,
          page: pageNumber,
          pageSize: this.pagination.pageSize
        }

        // Filtros condicionais - só envia se não for "todos"
        if (this.filtros.userIds.length && !this.filtros.userIds.includes('todos')) {
          params.userIds = this.filtros.userIds
        }

        if (this.filtros.queueIds.length && !this.filtros.queueIds.includes('todos')) {
          params.queueIds = this.filtros.queueIds
        }

        if (this.filtros.tags.length && !this.filtros.tags.includes('todos')) {
          params.tags = this.filtros.tags
        }

        if (this.filtros.closeReasonIds.length && !this.filtros.closeReasonIds.includes('todos')) {
          params.closeReasonIds = this.filtros.closeReasonIds
        }

        if (this.filtros.status && this.filtros.status !== 'todos') {
          params.status = this.filtros.status
        }

        const { data } = await ConsultarTicketsRelatorio(params)

        if (!data || !data.tickets) {
          this.tickets = []
          this.pagination = {
            page: 1,
            pageSize: this.pagination.pageSize,
            totalPages: 0,
            totalRecords: 0
          }
          return
        }

        // Backend já retorna dados processados, não precisa mapear novamente
        this.tickets = data.tickets || []

        // Atualizar paginação
        if (data.pagination) {
          this.pagination = {
            page: data.pagination.page,
            pageSize: data.pagination.pageSize,
            totalPages: data.pagination.totalPages,
            totalRecords: data.pagination.totalRecords
          }
        }
      } catch (error) {
        console.error('Erro ao buscar relatório:', error)
        this.tickets = []
        this.pagination = {
          page: 1,
          pageSize: this.pagination.pageSize,
          totalPages: 0,
          totalRecords: 0
        }
      } finally {
        this.loading = false
      }
    },
    exportarXLS () {
      const data = this.tickets.map(ticket => {
        const motivo = this.motivosEncerramento.find(m => m.id === ticket.endConversationId)
        return {
          DEPARTAMENTO: ticket.queue?.name || '',
          CONTATO: ticket.contact?.name || '',
          WHATSAPP: ticket.contact?.number || 'N/A',
          INICIALIZAÇÃO: ticket.initialization,
          'INICIO DO ATENDIMENTO': this.formatarData(ticket.startedAttendanceAt ? new Date(Number(ticket.startedAttendanceAt)) : null),
          'PRIMEIRO ATENDENTE': ticket.firstAttendant || '',
          'TEMPO DE ESPERA': this.calcularTempoEspera(ticket.createdAt, ticket.startedAttendanceAt),
          'FIM DO ATENDIMENTO': this.formatarData(ticket.closedAt ? new Date(Number(ticket.closedAt)) : null),
          'ULTIMO ATENDENTE': ticket.lastAttendant || '',
          'MOTIVO DE ENCERRAMENTO': motivo?.message || '',
          OBSERVAÇÃO: ticket.endConversationObservation || ''
        }
      })
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório Geral')
      XLSX.writeFile(wb, 'relatorio_geral.xlsx')
    },
    handleSelection (model, value) {
      const lastValue = value[value.length - 1]
      if (lastValue === 'todos') {
        this.filtros[model] = ['todos']
        if (this.$refs[`${model}Ref`]) {
          this.$refs[`${model}Ref`].hidePopup()
        }
      } else {
        this.filtros[model] = this.filtros[model].filter(v => v !== 'todos')
      }
    },
    limparFiltros () {
      this.filtros = { ...initialFilters }
      this.pagination.page = 1
      this.inicializarDatas()
      this.buscarRelatorio(1)
    },
    // Métodos de paginação
    irParaPagina (pagina) {
      if (pagina >= 1 && pagina <= this.pagination.totalPages) {
        this.pagination.page = pagina
        this.buscarRelatorio(pagina)
      }
    },
    proximaPagina () {
      if (this.pagination.page < this.pagination.totalPages) {
        this.irParaPagina(this.pagination.page + 1)
      }
    },
    paginaAnterior () {
      if (this.pagination.page > 1) {
        this.irParaPagina(this.pagination.page - 1)
      }
    },
    alterarTamanhoPagina (novoTamanho) {
      this.pagination.pageSize = novoTamanho
      this.pagination.page = 1
      this.buscarRelatorio(1)
    }
  },
  watch: {
    // Removido watch de debug desnecessário
  },
  async mounted () {
    await this.inicializarDatas()
    await this.carregarCanais()
    await this.carregarUsuarios()
    await this.carregarDepartamentos()
    await this.carregarEtiquetas()
    await this.carregarMotivosEncerramento()
  }
}
</script>

  <style>
  .table-container {
    width: 100%;
    overflow-x: auto;
    position: relative;
  }

  .q-table__container {
    min-width: 100%;
  }

  .q-table th {
    position: sticky;
    top: 0;
    background: white;
    z-index: 1;
  }

  /* Estilo para células da tabela */
  .q-td {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
    /* ou o valor que você preferir */
  }

  /* Estilo para o cabeçalho da tabela */
  .q-table thead tr th {
    font-weight: bold;
    white-space: nowrap;
  }

  /* Estilo para as linhas da tabela */
  .q-table tbody tr:nth-child(even) {
    background-color: #f5f5f5;
  }

  /* Hover nas linhas */
  .q-table tbody tr:hover {
    background-color: #e0e0e0;
  }
  </style>
