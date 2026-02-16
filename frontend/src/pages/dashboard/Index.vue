<template>
  <div class="q-pa-sm">
    <q-card class="q-my-md">
      <q-card-section class="row justify-between items-center">
        <!-- <div class="col-xs-12 col-md-3 text-h4 text-bold">
          DashBoard
        </div> -->
        <div class="col-xs-12 col-md-9 justify-end flex q-gutter-sm">
          <q-datetime-picker style="width: 200px" dense hide-bottom-space outlined stack-label bottom-slots
            label="Data/Hora Agendamento" mode="date" color="primary" format24h v-model="params.startDate" />
          <q-datetime-picker style="width: 200px" dense hide-bottom-space outlined stack-label bottom-slots
            label="Data/Hora Agendamento" mode="date" color="primary" format24h v-model="params.endDate" />
          <!-- <q-select
            style="width: 300px"
            dense
            outlined
            hide-bottom-space
            emit-value
            map-options
            multiple
            options-dense
            use-chips
            label="Filas"
            color="primary"
            v-model="params.queuesIds"
            :options="filas"
            :input-debounce="700"
            option-value="id"
            option-label="queue"
            input-style="width: 280px; max-width: 280px;"
          /> -->
          <q-btn class="bg-padrao" flat color="primary" icon="refresh" label="FILTRAR" @click="getDashData" />

        </div>
      </q-card-section>
    </q-card>

    <q-card style="background-color: transparent; box-shadow: none;">
      <q-card-section class="q-pa-md">
        <div class="row q-gutter-md justify-center">
          <div class="col-xs-12 col-sm-shrink">
            <q-card
              class="my-card full-height bg-primary text-white"
              style="min-width: 300px; min-height: 100px; border-radius: 16px;"
            >
              <!-- Ícone acima do título -->
              <q-card-section>
                <q-icon name="assignment" size="25px" class="q-mb-md" />
                <div class="text-bold">Total de Atendimentos</div>
              </q-card-section>
              <!-- Adicionando um espaçamento maior entre o título e a variável -->
              <q-card-section class="text-bold q-mb-lg">
                <p class="text-h4 text-bold"> {{ ticketsAndTimes.qtd_total_atendimentos || 0 }} </p>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-xs-12 col-sm-shrink">
            <q-card
              class="my-card full-height bg-green text-white"
              style="min-width: 395px; min-height: 100px; border-radius: 16px;"
            >
              <!-- Ícone acima do título -->
              <q-card-section>
                <q-icon name="live_help" size="25px" class="q-mb-md" />
                <div class="text-bold">Atendimentos Ativos</div>
              </q-card-section>
              <!-- Adicionando um espaçamento maior entre o título e a variável -->
              <q-card-section class="text-bold q-mb-lg">
                <p class="text-h4 text-bold"> {{ ticketsAndTimes.qtd_demanda_ativa || 0 }} </p>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-xs-12 col-sm-shrink">
            <q-card
              class="my-card full-height bg-orange text-white"
              style="min-width: 395px; min-height: 100px; border-radius: 16px;"
            >
              <!-- Ícone acima do título -->
              <q-card-section>
                <q-icon name="call_received" size="25px" class="q-mb-md" />
                <div class="text-bold">Atendimentos Receptivos</div>
              </q-card-section>

              <!-- Adicionando um espaçamento maior entre o título e a variável -->
              <q-card-section class="text-bold q-mb-lg">
                <p class="text-h4 text-bold"> {{ ticketsAndTimes.qtd_demanda_receptiva || 0 }} </p>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
    <q-card class="q-my-md q-pa-sm" style="background-color: transparent; box-shadow: none;">
      <q-card-section class="q-pa-md">
        <div class="row q-gutter-md justify-center">
          <div class="col-xs-12 col-sm-shrink">
            <q-card
              class="my-card full-height bg-blue text-white"
              style="min-width: 300px; min-height: 100px; border-radius: 16px;"
            >
              <q-card-section>
                <q-icon name="person_add" size="25px" class="q-mb-md" />
                <div class="text-bold">Novos Contatos</div>
              </q-card-section>

              <!-- Adicionando um espaçamento maior entre o título e a variável -->
              <q-card-section class="text-bold q-mb-lg">
                <p class="text-h4 text-bold"> {{ ticketsAndTimes.new_contacts || 0 }} </p>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-xs-12 col-sm-shrink">
            <q-card
             class="my-card full-height bg-purple text-white"
             style="min-width: 395px; min-height: 100px; border-radius: 16px;"
            >
              <q-card-section>
                <q-icon name="timer" size="25px" class="q-mb-md" />
                <div class="text-bold">Tempo Médio Atendimento</div>
              </q-card-section>

              <!-- Adicionando um espaçamento maior entre o título e a variável -->
              <q-card-section class="text-bold q-mb-lg">
                <p class="text-h5 text-bold"> {{ cTmaFormat || 'N/A' }} </p>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-xs-12 col-sm-shrink">
            <q-card
              class="my-card full-height bg-teal text-white"
              style="min-width: 395px; min-height: 100px; border-radius: 16px;"
            >
              <!-- Ícone acima do título -->
              <q-card-section>
                <q-icon name="access_time" size="25px" class="q-mb-md" />
                <div class="text-bold">Tempo Médio 1º Resposta</div>
              </q-card-section>

              <!-- Adicionando um espaçamento maior entre o título e a variável -->
              <q-card-section class="text-bold q-mb-lg">
                <p class="text-h5 text-bold"> {{ cTmeFormat || 'N/A' }} </p>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
    <q-card class="q-my-md q-pa-sm">
      <q-card-section class="q-pa-md">
        <q-table title="Performance Usuários" :data="ticketsPerUsersDetail" :columns="TicketsPerUsersDetailColumn"
          row-key="email" :pagination.sync="paginationTableUser" :rows-per-page-options="[0]" bordered flat hide-bottom>
          <template v-slot:body-cell-name="props">
            <q-td :props="props">
              <div class="row col text-bold"> {{ props.row.name || 'Não informado' }} </div>
              <div class="row col text-caption">{{ props.row.email }} </div>
            </q-td>
          </template>
        </q-table>

      </q-card-section>

    </q-card>

    <div class="row q-col-gutter-md">
      <div class="col-xs-12 col-sm-6">
        <q-card>
          <q-card-section class="q-pa-md">
            <ApexChart
              v-if="chartsReady"
              ref="ChartTicketsChannels"
              type="pie"
              height="300"
              width="100%"
              :options="ticketsChannelsOptions"
              :series="ticketsChannelsOptions.series"
            />
            <div v-else class="text-center q-pa-lg">
              <q-spinner size="40px" color="primary" />
              <div class="q-mt-md">Carregando gráfico...</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-xs-12 col-sm-6">
        <q-card>
          <q-card-section class="q-pa-md">
            <ApexChart
              v-if="chartsReady"
              ref="ChartTicketsQueue"
              type="pie"
              height="300"
              width="100%"
              :options="ticketsQueueOptions"
              :series="ticketsQueueOptions.series"
            />
            <div v-else class="text-center q-pa-lg">
              <q-spinner size="40px" color="primary" />
              <div class="q-mt-md">Carregando gráfico...</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <q-card class="q-my-md"
    style="border-radius: 16px; box-shadow: none;">
      <q-card-section>
        <ApexChart
          v-if="chartsReady"
          ref="ChartTicketsEvolutionChannels"
          type="bar"
          height="250"
          width="100%"
          :options="ticketsEvolutionChannelsOptions"
          :series="ticketsEvolutionChannelsOptions.series"
        />
        <div v-else class="text-center q-pa-lg">
          <q-spinner size="40px" color="primary" />
          <div class="q-mt-md">Carregando gráfico...</div>
        </div>
      </q-card-section>
    </q-card>
    <q-card class="q-my-md" style="border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <q-card-section class="q-pa-md">
        <ApexChart
          v-if="chartsReady"
          ref="ChartTicketsEvolutionByPeriod"
          type="area"
          height="350"
          width="100%"
          :options="ticketsEvolutionByPeriodOptions"
          :series="ticketsEvolutionByPeriodOptions.series"
        />
        <div v-else class="text-center q-pa-lg">
          <q-spinner size="40px" color="primary" />
          <div class="q-mt-md text-grey-6">Carregando evolução de atendimentos...</div>
        </div>
      </q-card-section>
    </q-card>

  </div>
</template>

<script>
import { groupBy } from 'lodash'
import { ListarFilas } from 'src/service/filas'
import {
  GetDashTicketsAndTimes,
  GetDashTicketsChannels,
  GetDashTicketsEvolutionChannels,
  GetDashTicketsQueue,
  GetDashTicketsEvolutionByPeriod,
  GetDashTicketsPerUsersDetail
} from 'src/service/estatisticas'
import { subDays, format, differenceInDays } from 'date-fns'
import ApexChart from 'vue-apexcharts'

export default {
  name: 'IndexDashboard',
  components: { ApexChart },
  data () {
    return {
      chartsReady: false,
      confiWidth: {
        horizontal: false,
        width: this.$q.screen.width
      },
      params: {
        startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        queuesIds: []
      },
      paginationTableUser: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      },
      filas: [],
      ticketsChannels: [],
      ticketsChannelsOptions: {
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 1000
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.05,
            inverseColors: false,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
          }
        },
        chart: {
          toolbar: {
            show: true
          }
        },
        legend: {
          position: 'right',
          fontSize: '12px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          offsetX: 0,
          offsetY: 0,
          itemMargin: {
            horizontal: 5,
            vertical: 5
          }
        },
        title: {
          text: 'Atendimento por canal',
          align: 'left',
          style: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#374151'
          }
        },
        noData: {
          text: 'Sem dados aqui!',
          align: 'center',
          verticalAlign: 'middle',
          offsetX: 0,
          offsetY: 0,
          style: {
            color: '#6B7280',
            fontSize: '14px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          }
        },
        series: [],
        labels: [],
        theme: {
          mode: 'light',
          palette: 'palette1'
        },
        plotOptions: {
          pie: {
            dataLabels: {
              offset: -10,
              minAngleToShowLabel: 10
            },
            donut: {
              size: '0%'
            }
          }
        },
        dataLabels: {
          enabled: true,
          textAnchor: 'middle',
          style: {
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'Helvetica, Arial, sans-serif',
            colors: ['#fff']
          },
          offsetX: 0,
          offsetY: 0,
          formatter: function (val, opts) {
            return val > 0 ? val.toFixed(1) + '%' : ''
          }
        }
      },
      ticketsQueue: [],
      ticketsQueueOptions: {
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 1000
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.05,
            inverseColors: false,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
          }
        },
        chart: {
          toolbar: {
            show: true
          }
        },
        legend: {
          position: 'right',
          fontSize: '12px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          offsetX: 0,
          offsetY: 0,
          itemMargin: {
            horizontal: 5,
            vertical: 5
          }
        },
        title: {
          text: 'Atendimento por departamentos',
          align: 'left',
          style: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#374151'
          }
        },
        noData: {
          text: 'Sem dados aqui!',
          align: 'center',
          verticalAlign: 'middle',
          offsetX: 0,
          offsetY: 0,
          style: {
            color: '#6B7280',
            fontSize: '14px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          }
        },
        series: [],
        labels: [],
        theme: {
          mode: 'light',
          palette: 'palette1'
        },
        plotOptions: {
          pie: {
            dataLabels: {
              offset: -10,
              minAngleToShowLabel: 10
            },
            donut: {
              size: '0%'
            }
          }
        },
        dataLabels: {
          enabled: true,
          textAnchor: 'middle',
          style: {
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'Helvetica, Arial, sans-serif',
            colors: ['#fff']
          },
          offsetX: 0,
          offsetY: 0,
          formatter: function (val, opts) {
            return val > 0 ? val.toFixed(1) + '%' : ''
          }
        }
      },
      ticketsEvolutionChannels: [],
      ticketsEvolutionChannelsOptions: {
        colors: ['#4D91D9', '#9C4DFF', '#FFF59D, #A5D6A7'],
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 20000
        },
        chart: {
          // height: 300,
          stacked: false,
          stackType: '100%',
          toolbar: {
            tools: {
              download: true,
              selection: false,
              zoom: false,
              zoomin: false,
              zoomout: false,
              pan: false,
              reset: false | '<img src="/static/icons/reset.png" width="20">'
            }

          }
        },
        grid: {
          show: false,
          strokeDashArray: 0
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.05,
            inverseColors: false,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
          }
        },
        dataLabels: {
          enabled: true,
          colors: ['#fff']
        },
        title: {
          text: 'Evolução por canal',
          align: 'left'
        },
        stroke: {
          width: 0
        },
        // responsive: [{
        //   breakpoint: 480,
        //   options: {
        //     chart: {
        //       width: 250
        //     },
        //     legend: {
        //       position: 'bottom'
        //     }
        //   }
        // }],
        xaxis: {
          type: 'category',
          categories: [],
          tickPlacement: 'on'
          // labels: {
          //   formatter: function (value, timestamp, opts) {
          //     return format(new Date(timestamp), 'dd/MM')
          //     // return opts.dateFormatter().format('dd MMM')
          //   }
          // }
          // type: 'datetime'
          // format: 'dd/MM'
          // datetimeFormatter: {
          //   // year: 'yyyy',
          //   month: 'MM',
          //   day: 'DD'
          //   // hour: 'HH:mm',
          // }
        },
        plotOptions: {
          bar: {
            horizontal: true
          }
        },
        // yaxis: {
        //   title: {
        //     text: 'Atendimentos',
        //     style: {
        //       color: '#FFF'
        //     }
        //   }
        // },
        tooltip: {
          y: {
            formatter: function (val) {
              return Number(val).toFixed(0)
            }
          }
        }
      },
      ticketsEvolutionByPeriod: [],
      ticketsEvolutionByPeriodOptions: {
        colors: ['#4D91D9', '#9C4DFF', '#FFF59D', '#A5D6A7'],
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        chart: {
          type: 'area',
          stacked: false,
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: false,
              zoom: false,
              zoomin: false,
              zoomout: false,
              pan: false,
              reset: false
            }
          },
          zoom: {
            enabled: false
          }
        },
        grid: {
          show: false,
          strokeDashArray: 0,
          borderColor: '#e0e0e0',
          xaxis: {
            lines: {
              show: true
            }
          },
          yaxis: {
            lines: {
              show: false
            }
          }
        },
        stroke: {
          curve: 'smooth',
          width: [3, 1],
          dashArray: [0, 0]
        },
        fill: {
          type: 'gradient',
          gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.5,
            gradientToColors: ['#7B68EE', '#9C4DFF'],
            inverseColors: false,
            opacityFrom: 0.85,
            opacityTo: 0.15,
            stops: [0, 90, 100]
          }
        },
        title: {
          text: 'Evolução atendimentos',
          align: 'left',
          style: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#263238'
          }
        },
        dataLabels: {
          enabled: true,
          enabledOnSeries: [0],
          style: {
            fontSize: '11px',
            fontWeight: 'bold',
            colors: ['#fff']
          },
          background: {
            enabled: true,
            foreColor: '#4D91D9',
            borderRadius: 2,
            padding: 4,
            opacity: 0.9,
            borderWidth: 1,
            borderColor: '#4D91D9'
          }
        },
        markers: {
          size: [5, 0],
          colors: ['#4D91D9'],
          strokeColors: '#fff',
          strokeWidth: 2,
          hover: {
            size: 7
          }
        },
        xaxis: {
          categories: [],
          labels: {
            style: {
              fontSize: '12px',
              fontWeight: 500
            }
          }
        },
        yaxis: {
          title: {
            text: 'Quantidade',
            style: {
              fontSize: '12px',
              fontWeight: 500
            }
          },
          labels: {
            formatter: function (val) {
              return Math.floor(val)
            }
          }
        },
        tooltip: {
          shared: true,
          intersect: false,
          x: {
            show: true
          },
          y: {
            formatter: function (val) {
              return Number(val).toFixed(0) + ' atendimentos'
            },
            title: {
              formatter: (seriesName) => seriesName + ':'
            }
          }
        },
        legend: {
          show: false,
          position: 'top',
          horizontalAlign: 'right'
        }
      },
      ticketsAndTimes: {
        qtd_total_atendimentos: null,
        qtd_demanda_ativa: null,
        qtd_demanda_receptiva: null,
        tma: null,
        tme: null
      },
      ticketsPerUsersDetail: [],
      TicketsPerUsersDetailColumn: [
        {
          name: 'name',
          label: 'Usuário',
          field: 'name',
          align: 'left',
          style: 'width: 300px;',
          format: (v, r) => {
            return v ? `${r.name} | ${r.email}` : 'Não informado'
          }
        },
        {
          name: 'qtd_pendentes',
          label: 'Pendentes',
          field: 'qtd_pendentes'
        },
        {
          name: 'qtd_em_atendimento',
          label: 'Atendendo',
          field: 'qtd_em_atendimento'
        },
        {
          name: 'qtd_resolvidos',
          label: 'Finalizados',
          field: 'qtd_resolvidos'
        },
        {
          name: 'qtd_por_usuario',
          label: 'Total',
          field: 'qtd_por_usuario'
        },
        {
          name: 'tme',
          label: 'T.M.E',
          field: 'tme',
          align: 'center',
          headerStyle: 'text-align: center !important',
          format: v => {
            return this.formatDurationPortuguese(v)
          }
        },
        {
          name: 'tma',
          label: 'T.M.A',
          field: 'tma',
          align: 'center',
          headerStyle: 'text-align: center !important',
          format: v => {
            return this.formatDurationPortuguese(v)
          }
        }
      ]
    }
  },
  watch: {
    '$q.dark.isActive' () {
      // necessário para carregar os gráficos com a alterçaão do mode (dark/light)
      this.$router.go()
    },
    '$q.screen.width' () {
      // necessário para carregar os gráficos com a alterçaão do mode (dark/light)
      this.setConfigWidth()
    }
  },
  computed: {
    cTmaFormat () {
      const tma = this.ticketsAndTimes.tma || {}
      return this.formatDurationPortuguese(tma)
    },
    cTmeFormat () {
      const tme = this.ticketsAndTimes.tme || {}
      return this.formatDurationPortuguese(tme)
    }
  },
  methods: {
    formatDurationPortuguese (duration) {
      if (!duration || typeof duration !== 'object') {
        return ''
      }

      const { hours = 0, minutes = 0, seconds = 0 } = duration

      const parts = []

      if (hours > 0) {
        parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`)
      }

      if (minutes > 0) {
        parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`)
      }

      if (seconds > 0) {
        parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`)
      }

      return parts.length > 0 ? parts.join(' ') : ''
    },
    async listarFilas () {
      const { data } = await ListarFilas()
      // Filtrar apenas departamentos ativos
      this.filas = data.filter(fila => fila.isActive === true)
    },
    setConfigWidth () {
      const diffDays = differenceInDays(new Date(this.params.endDate), new Date(this.params.startDate))
      if (diffDays > 30) {
        this.configWidth = { horizontal: true, width: 2200 }
      } else {
        const actualWidth = this.$q.screen.width
        this.configWidth = { horizontal: true, width: actualWidth - (actualWidth < 768 ? 40 : 100) }
      }
    },
    getDashTicketsAndTimes () {
      GetDashTicketsAndTimes(this.params).then(res => {
        this.ticketsAndTimes = res.data[0]
      })
        .catch(err => {
          console.error(err)
        })
    },
    getDashTicketsQueue () {
      return GetDashTicketsQueue(this.params).then(res => {
        this.ticketsQueue = res.data || []
        const series = []
        const labels = []

        if (this.ticketsQueue && this.ticketsQueue.length > 0) {
          this.ticketsQueue.forEach(e => {
            if (e && e.qtd !== undefined && e.qtd !== null && e.label && e.label.trim() !== '') {
              const qtd = Number(e.qtd)
              if (!isNaN(qtd) && qtd > 0) {
                series.push(qtd)
                labels.push(e.label.trim())
              }
            }
          })
        }

        // Garantir que sempre temos dados válidos
        if (series.length === 0) {
          series.push(0)
          labels.push('Sem dados')
        }

        // Validar e limpar dados antes de atribuir
        this.ticketsQueueOptions.series = Array.isArray(series) ? series : [0]
        this.ticketsQueueOptions.labels = Array.isArray(labels) ? labels : ['Sem dados']

        // Garantir que series e labels tenham o mesmo tamanho
        const minLength = Math.min(this.ticketsQueueOptions.series.length, this.ticketsQueueOptions.labels.length)
        this.ticketsQueueOptions.series = this.ticketsQueueOptions.series.slice(0, minLength)
        this.ticketsQueueOptions.labels = this.ticketsQueueOptions.labels.slice(0, minLength)
      })
        .catch(err => {
          console.error('Erro ao carregar dados de departamentos:', err)
          // Garantir dados padrão em caso de erro
          this.ticketsQueueOptions.series = [0]
          this.ticketsQueueOptions.labels = ['Sem dados']
        })
    },
    getDashTicketsChannels () {
      return GetDashTicketsChannels(this.params).then(res => {
        this.ticketsChannels = res.data || []
        const series = []
        const labels = []

        if (this.ticketsChannels && this.ticketsChannels.length > 0) {
          this.ticketsChannels.forEach(e => {
            if (e && e.qtd !== undefined && e.qtd !== null && e.label && e.label.trim() !== '') {
              const qtd = Number(e.qtd)
              if (!isNaN(qtd) && qtd > 0) {
                series.push(qtd)
                labels.push(e.label.trim())
              }
            }
          })
        }

        // Garantir que sempre temos dados válidos
        if (series.length === 0) {
          series.push(0)
          labels.push('Sem dados')
        }

        // Validar e limpar dados antes de atribuir
        this.ticketsChannelsOptions.series = Array.isArray(series) ? series : [0]
        this.ticketsChannelsOptions.labels = Array.isArray(labels) ? labels : ['Sem dados']

        // Garantir que series e labels tenham o mesmo tamanho
        const minLength = Math.min(this.ticketsChannelsOptions.series.length, this.ticketsChannelsOptions.labels.length)
        this.ticketsChannelsOptions.series = this.ticketsChannelsOptions.series.slice(0, minLength)
        this.ticketsChannelsOptions.labels = this.ticketsChannelsOptions.labels.slice(0, minLength)
      })
        .catch(err => {
          console.error('Erro ao carregar dados de canais:', err)
          // Garantir dados padrão em caso de erro
          this.ticketsChannelsOptions.series = [0]
          this.ticketsChannelsOptions.labels = ['Sem dados']
        })
    },
    getDashTicketsEvolutionChannels () {
      return GetDashTicketsEvolutionChannels(this.params)
        .then(res => {
          this.ticketsEvolutionChannels = res.data || []
          const dataLabel = groupBy({ ...this.ticketsEvolutionChannels }, 'dt_referencia')
          const labels = Object.keys(dataLabel)
          // .map(l => {
          //   return format(new Date(l), 'dd/MM')
          // })
          this.ticketsEvolutionChannelsOptions.labels = labels
          this.ticketsEvolutionChannelsOptions.xaxis.categories = labels
          const series = []
          const dados = groupBy({ ...this.ticketsEvolutionChannels }, 'label')
          for (const item in dados) {
            series.push({
              name: item,
              // type: 'line',
              data: dados[item].map(d => {
                // if (labels.includes(format(new Date(d.dt_ref), 'dd/MM'))) {
                return d.qtd
              })
            })
          }
          this.ticketsEvolutionChannelsOptions.series = series
        })
        .catch(error => {
          console.error(error)
          // Garantir dados padrão em caso de erro
          this.ticketsEvolutionChannelsOptions.series = []
          this.ticketsEvolutionChannelsOptions.labels = []
        })
    },
    getDashTicketsEvolutionByPeriod () {
      return GetDashTicketsEvolutionByPeriod(this.params)
        .then(res => {
          this.ticketsEvolutionByPeriod = res.data || []
          const series = [{
            name: 'Atendimentos',
            type: 'line',
            data: []
          }, {
            type: 'area',
            data: []
          }
          ]
          const labels = []
          this.ticketsEvolutionByPeriod.forEach(e => {
            series[0].data.push(+e.qtd)
            labels.push(e.label)
          })
          series[1].data = series[0].data
          this.ticketsEvolutionByPeriodOptions.labels = labels
          this.ticketsEvolutionByPeriodOptions.series = series

          // Atualizar o gráfico após carregar os dados
          if (this.$refs.ChartTicketsEvolutionByPeriod) {
            this.$refs.ChartTicketsEvolutionByPeriod.updateOptions(this.ticketsEvolutionByPeriodOptions)
            this.$refs.ChartTicketsEvolutionByPeriod.updateSeries(series, true)
          }
        })
        .catch(error => {
          console.error(error)
          // Garantir dados padrão em caso de erro
          this.ticketsEvolutionByPeriodOptions.series = []
          this.ticketsEvolutionByPeriodOptions.labels = []
        })
    },
    getDashTicketsPerUsersDetail () {
      GetDashTicketsPerUsersDetail(this.params)
        .then(res => {
          this.ticketsPerUsersDetail = res.data
        })
        .catch(error => {
          console.error(error)
        })
    },
    getDashData () {
      this.chartsReady = false
      this.setConfigWidth()
      this.getDashTicketsAndTimes()

      // Inicializar dados padrão para evitar erros
      this.ticketsChannelsOptions.series = []
      this.ticketsChannelsOptions.labels = []
      this.ticketsQueueOptions.series = []
      this.ticketsQueueOptions.labels = []

      // Carregar dados primeiro, depois renderizar gráficos
      Promise.all([
        this.getDashTicketsChannels(),
        this.getDashTicketsEvolutionChannels(),
        this.getDashTicketsQueue(),
        this.getDashTicketsEvolutionByPeriod()
      ]).then(() => {
        // Aguardar um pouco para garantir que os dados foram processados
        setTimeout(() => {
          // Validar se todos os dados estão prontos
          const allDataReady = this.validateChartData()

          if (allDataReady) {
            console.log('Todos os dados dos gráficos estão prontos')
            this.chartsReady = true
          } else {
            console.warn('Dados dos gráficos não estão prontos, mas renderizando mesmo assim')
            this.chartsReady = true
          }
        }, 200)
      }).catch(err => {
        console.error('Erro ao carregar dados dos gráficos:', err)
        // Garantir dados padrão em caso de erro
        this.ticketsChannelsOptions.series = [0]
        this.ticketsChannelsOptions.labels = ['Sem dados']
        this.ticketsQueueOptions.series = [0]
        this.ticketsQueueOptions.labels = ['Sem dados']
        this.chartsReady = true
      })

      this.getDashTicketsPerUsersDetail()
    },

    validateChartData () {
      const channelsReady = Array.isArray(this.ticketsChannelsOptions.series) &&
                           Array.isArray(this.ticketsChannelsOptions.labels) &&
                           this.ticketsChannelsOptions.series.length === this.ticketsChannelsOptions.labels.length

      const queueReady = Array.isArray(this.ticketsQueueOptions.series) &&
                        Array.isArray(this.ticketsQueueOptions.labels) &&
                        this.ticketsQueueOptions.series.length === this.ticketsQueueOptions.labels.length

      const evolutionReady = Array.isArray(this.ticketsEvolutionChannelsOptions.series) &&
                             Array.isArray(this.ticketsEvolutionChannelsOptions.labels)

      const periodReady = Array.isArray(this.ticketsEvolutionByPeriodOptions.series) &&
                         Array.isArray(this.ticketsEvolutionByPeriodOptions.labels)

      console.log('Validação dos dados:', {
        channels: { series: this.ticketsChannelsOptions.series?.length, labels: this.ticketsChannelsOptions.labels?.length },
        queue: { series: this.ticketsQueueOptions.series?.length, labels: this.ticketsQueueOptions.labels?.length },
        evolution: { series: this.ticketsEvolutionChannelsOptions.series?.length, labels: this.ticketsEvolutionChannelsOptions.labels?.length },
        period: { series: this.ticketsEvolutionByPeriodOptions.series?.length, labels: this.ticketsEvolutionByPeriodOptions.labels?.length }
      })

      return channelsReady && queueReady && evolutionReady && periodReady
    }

  },
  beforeMount () {
    const mode = this.$q.dark.isActive ? 'dark' : 'light'
    const theme = {
      mode,
      palette: 'palette1'
    }
    this.ticketsQueueOptions = { ...this.ticketsQueueOptions, theme }
    this.ticketsChannelsOptions = { ...this.ticketsChannelsOptions, theme }
    this.ticketsEvolutionChannelsOptions = { ...this.ticketsEvolutionChannelsOptions, theme }
    this.ticketsEvolutionByPeriodOptions = { ...this.ticketsEvolutionByPeriodOptions, theme }
  },
  mounted () {
    this.listarFilas()
    this.getDashData()
  }
}
</script>

<style lang="scss">
.apexcharts-theme-dark svg {
  background: none !important;
}
</style>
