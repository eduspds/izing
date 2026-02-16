<template>
  <div class="bg-white no-scroll hide-scrollbar overflow-hidden"
    :style="style">
    <InforCabecalhoChat @updateTicket:resolver="atualizarStatusTicket('closed')"
      @updateTicket:retornar="atualizarStatusTicket('pending')"
      @abrir:modalAgendamentoMensagem="modalAgendamentoRapido = true"
      @abrir:modalAgendaMensagens="modalAgendamentoMensagem = true" />

    <!-- Modal de Encerramento -->
    <ModalEncerrarTicket
      v-model="modalEncerrarTicket"
      :ticket="ticketFocado"
      @ticket-encerrado="onTicketEncerrado"
    />

    <q-scroll-area ref="scrollContainer"
      class="scroll-y hide-scrollbar"
      :style="cStyleScroll"
      @scroll="scrollArea">
      <transition appear
        enter-active-class="animated fadeIn"
        leave-active-class="animated fadeOut">
        <infinite-loading v-if="cMessages.length"
          @infinite="onLoadMore"
          direction="top"
          :identificador="ticketFocado.id"
          spinner="spiral">
          <div slot="no-results">
            <div v-if="!cMessages.length">
              Sem resultados :(
            </div>
          </div>
          <div slot="no-more">
            Nada mais a carregar :)
          </div>
        </infinite-loading>
      </transition>
      <MensagemChat :replyingMessage.sync="replyingMessage"
        :mensagens="cMessages"
        v-if="cMessages.length && ticketFocado.id"
        @mensagem-chat:encaminhar-mensagem="abrirModalEncaminharMensagem"
        :ativarMultiEncaminhamento.sync="ativarMultiEncaminhamento"
        :mensagensParaEncaminhar.sync="mensagensParaEncaminhar"
        :isShowOptions="!modoEspiar" />
      <div id="inicioListaMensagensChat"></div>
    </q-scroll-area>
    <div class="absolute-center items-center"
      :class="{
          'row col text-center q-col-gutter-lg': !$q.screen.xs,
          'full-width text-center': $q.screen.xs
        }"
      v-if="!ticketFocado.id">
      <q-icon style="margin-left: 30vw"
        size="6em"
        color="grey-6"
        name="mdi-emoticon-wink-outline"
        class="row col text-center"
        :class="{
            'row col text-center q-mr-lg': !$q.screen.xs,
            'full-width text-center center-block': $q.screen.xs
          }">
      </q-icon>
      <h1 class="text-grey-6 row col justify-center"
        :class="{
            'full-width': $q.screen.xs
          }">
        Selecione um ticket!
      </h1>
    </div>
    <div v-if="cMessages.length"
      class="relative-position">
      <transition appear
        enter-active-class="animated fadeIn"
        leave-active-class="animated fadeOut">
        <div v-if="scrollIcon">
          <q-btn class="vac-icon-scroll"
            color="white"
            text-color="black"
            icon="mdi-arrow-down"
            round
            push
            ripple
            dense
            @click="scrollToBottom" />
        </div>
      </transition>
    </div>

    <q-footer class="bg-white">
      <q-separator class="bg-grey-4" />
      <q-list v-if="replyingMessage"
        :style="`border-top: 1px solid #; max-height: 140px; width: 100%;`"
        style=" max-height: 100px;"
        class="q-pa-none q-py-md text-black row items-center col justify-center full-width"
        :class="{
            'bg-grey-1': !$q.dark.isActive,
            'bg-grey-10': $q.dark.isActive
          }">
        <q-item class="q-card--bordered q-pb-sm btn-rounded"
          :style="`
            width: 460px;
            min-width: 460px;
            max-width: 460px;
            max-height: 110px;
          `"
          :class="{
              'bg-blue-1': !replyingMessage.fromMe && !$q.dark.isActive,
              'bg-blue-2 text-black': !replyingMessage.fromMe && $q.dark.isActive,
              'bg-grey-2 text-black': replyingMessage.fromMe
            }">
          <q-item-section>
            <q-item-label v-if="!replyingMessage.fromMe"
              :class="{ 'text-black': $q.dark.isActive }"
              caption>
              {{ replyingMessage.contact && replyingMessage.contact.name }}
            </q-item-label>
            <q-item-label lines="4"
              v-html="farmatarMensagemWhatsapp(replyingMessage.body)">
            </q-item-label>
          </q-item-section>
          <q-btn @click="replyingMessage = null"
            dense
            flat
            round
            icon="close"
            class="float-right absolute-top-right z-max"
            :disabled="loading || ticketFocado.status !== 'open'" />
        </q-item>
      </q-list>

      <q-banner class="text-grey-8"
        v-if="mensagensParaEncaminhar.length > 0">
        <span class="text-bold text-h5"> {{ mensagensParaEncaminhar.length }} de 10 mensagens</span> selecionadas para
        serem encaminhadas.
        <q-separator class="bg-grey-4" />
        <q-select dense
          class="q-my-md"
          ref="selectAutoCompleteContato"
          autofocus
          outlined
          rounded
          hide-dropdown-icon
          :loading="loading"
          v-model="contatoSelecionado"
          :options="contatos"
          input-debounce="700"
          @filter="localizarContato"
          use-input
          hide-selected
          fill-input
          clearable
          option-label="name"
          option-value="id"
          label="Localize e selecione o contato"
          hint="Digite no mínimo duas letras para localizar o contato. É possível selecionar apenas 1 contato!">
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps"
              v-on="scope.itemEvents"
              v-if="scope.opt.name">
              <q-item-section>
                <q-item-label> {{ scope.opt.name }}</q-item-label>
                <q-item-label caption>{{ scope.opt.number }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
        <template v-slot:action>
          <q-btn class="bg-padrao q-px-sm"
            flat
            color="negative"
            label="Cancelar"
            @click="cancelarMultiEncaminhamento" />
          <q-btn class="bg-padrao q-px-sm"
            flat
            color="positive"
            label="Enviar"
            icon="mdi-send"
            @click="confirmarEncaminhamentoMensagem(mensagensParaEncaminhar)" />
        </template>
      </q-banner>

      <InputMensagem v-if="!mensagensParaEncaminhar.length"
        :mensagensRapidas="mensagensRapidas"
        :replyingMessage.sync="replyingMessage" />
      <q-resize-observer @resize="onResizeInputMensagem" />
    </q-footer>

    <q-dialog v-model="modalAgendamentoRapido"
      persistent>
      <q-card :style="$q.screen.width < 770 ? 'min-width: 96vw; max-width: 96vw' : 'min-width: 50vw; max-width: 50vw'">
        <q-card-section class="row items-center">
          <div class="text-h6">
            Agendamento de Mensagem
          </div>
          <q-space />
            <q-btn flat
            round
            dense
              color="negative"
              icon="close"
              v-close-popup />
        </q-card-section>
        <q-card-section class="q-mb-lg">
          <InputMensagem isScheduleDate
            :mensagensRapidas="mensagensRapidas"
            :replyingMessage.sync="replyingMessage" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="modalAgendamentoMensagem"
      persistent>
      <q-card :style="$q.screen.width < 900 ? 'min-width: 96vw; max-width: 96vw' : 'min-width: 75vw; max-width: 75vw'">
        <q-card-section class="row items-center">
          <div class="text-h6 text-weight-bold">
            Agenda de Mensagens
          </div>
          <q-space />
            <q-btn flat
            round
            dense
              color="negative"
              icon="close"
              v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-none">
          <div class="row calendar-modal__container q-col-gutter-md">
            <div class="col-12 col-lg-8">
              <div class="calendar-main q-pa-md">
                <div class="calendar-header row items-center justify-between q-mb-md">
                  <div class="row items-center q-gutter-xs">
                    <q-btn flat
                      round
                      dense
                      icon="mdi-chevron-double-left"
                      @click="navigateCalendarYear(-1)" />
                    <q-btn flat
                      round
                      dense
                      icon="mdi-chevron-left"
                      @click="navigateCalendarMonth(-1)" />
                  </div>
                  <div class="text-h6 text-weight-bold calendar-header__title">
                    {{ calendarMonthLabel }}
                  </div>
                  <div class="row items-center q-gutter-xs">
                    <q-btn flat
                      round
                      dense
                      icon="mdi-chevron-right"
                      @click="navigateCalendarMonth(1)" />
                    <q-btn flat
                      round
                      dense
                      icon="mdi-chevron-double-right"
                      @click="navigateCalendarYear(1)" />
                  </div>
                </div>
                <div class="calendar-weekdays row no-wrap">
                  <div v-for="dia in diasSemana"
                    :key="dia"
                    class="calendar-weekday col text-center text-caption text-uppercase">
                    {{ dia }}
                  </div>
                </div>
                <div class="calendar-grid">
                  <div v-for="(semana, semanaIndex) in calendarWeeks"
                    :key="semanaIndex"
                    class="calendar-week row no-wrap">
                    <div v-for="dia in semana"
                      :key="dia.date"
                      class="calendar-day"
                      :class="calendarDayClasses(dia)"
                      @click="onSelectDate(dia.date)">
                      <div class="calendar-day__header row items-start justify-between no-wrap">
                        <span class="calendar-day__number">
                          {{ dia.day }}
                        </span>
                        <span v-if="dia.mensagens.length"
                          class="calendar-day__badge"
                          :class="calendarDayBadgeColor(dia.mensagens)">
                          {{ dia.mensagens.length }}
                        </span>
                      </div>
                      <div class="calendar-day__messages">
                        <div v-for="(mensagem, idx) in dia.mensagens.slice(0, 3)"
                          :key="idx"
                          :class="['calendar-day__message', calendarMensagemClasse(mensagem)]">
                          <span class="calendar-day__message-time">
                            {{ formatHorario(mensagem.scheduleDate) }}
                          </span>
                          <span class="calendar-day__message-body">
                            {{ formatMensagemPreview(mensagem) }}
                          </span>
                        </div>
                        <div v-if="dia.mensagens.length > 3"
                          class="calendar-day__more">
                          {{ calendarMoreLabel(dia.mensagens) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-12 col-lg-4">
              <div class="calendar-sidebar q-pa-md">
                <div class="column q-gutter-sm">
                  <q-btn
                    color="primary"
                    unelevated
                    rounded
                    icon="mdi-calendar-plus"
                    label="Agendar nova mensagem"
                    :disable="!calendarSelectedDate || mostrarFormularioAgendamento || modoEspiar"
                    @click="abrirFormularioAgendamento"
                  />
                  <q-btn
                    v-if="mostrarFormularioAgendamento"
                    outline
                    color="negative"
                    icon="mdi-close"
                    label="Cancelar agendamento"
                    @click="cancelarFormularioAgendamento"
                  />
                  <div v-if="modoEspiar"
                    class="text-caption text-negative">
                    Recursos de agendamento indisponíveis no modo espiar.
                  </div>
                  <div class="calendar-legend text-caption text-grey-7">
                    <div class="row items-center">
                      <span class="calendar-legend__dot calendar-legend__dot--pending" />
                      <span class="q-ml-xs">Pendentes</span>
                    </div>
                    <div class="row items-center q-mt-xs">
                      <span class="calendar-legend__dot calendar-legend__dot--sent" />
                      <span class="q-ml-xs">Enviadas</span>
                    </div>
                    <div class="row items-center q-mt-xs">
                      <span class="calendar-legend__dot calendar-legend__dot--mixed" />
                      <span class="q-ml-xs">Mistas</span>
                    </div>
                  </div>
                  <div class="calendar-day-details q-mt-md">
                    <div class="text-subtitle1 text-weight-medium">
                      {{ legendaDataSelecionada }}
                    </div>
                    <q-separator class="q-my-sm" />
                    <div v-if="!mensagensDataSelecionada.length"
                      class="text-caption text-grey-6">
                      Nenhuma mensagem agendada para este dia.
                    </div>
                    <div v-else class="q-gutter-md">
                      <div v-if="mensagensPendentesDataSelecionada.length">
                        <div class="text-caption text-weight-medium text-warning q-mb-xs">
                          Pendentes
                        </div>
                        <q-list bordered
                          separator
                          class="rounded-borders">
                          <q-item v-for="mensagem in mensagensPendentesDataSelecionada"
                            :key="getScheduledMessageKey(mensagem)"
                            clickable
                            :class="{ 'bg-grey-2': selectedScheduledMessageKey === getScheduledMessageKey(mensagem) }"
                            @click="selecionarMensagem(mensagem)">
                            <q-item-section>
                              <q-item-label class="text-weight-medium">
                                {{ formatHorario(mensagem.scheduleDate) }} • {{ mensagem.mediaName || mensagem.body || 'Mensagem agendada' }}
                              </q-item-label>
                              <q-item-label caption
                                v-if="mensagem.createdAt">
                                Criada em {{ $formatarData(mensagem.createdAt, 'dd/MM/yyyy HH:mm') }}
                              </q-item-label>
                            </q-item-section>
                            <q-item-section side>
                              <div class="row no-wrap q-gutter-xs">
                                <q-btn flat
                                  round
                                  dense
                                  icon="mdi-pencil-outline"
                                  color="primary"
                                  @click.stop="abrirEdicaoMensagemAgendada(mensagem)" />
                                <q-btn flat
                                  round
                                  dense
                                  icon="mdi-trash-can-outline"
                                  color="negative"
                                  @click.stop="deletarMensagemAgendada(mensagem)" />
                              </div>
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </div>
                      <div v-if="mensagensEnviadasDataSelecionada.length">
                        <div class="text-caption text-weight-medium text-positive q-mb-xs">
                          Enviadas
                        </div>
                        <q-list bordered
                          separator
                          class="rounded-borders">
                          <q-item v-for="mensagem in mensagensEnviadasDataSelecionada"
                            :key="getScheduledMessageKey(mensagem)"
                            clickable
                            :class="{ 'bg-grey-2': selectedScheduledMessageKey === getScheduledMessageKey(mensagem) }"
                            @click="selecionarMensagem(mensagem)">
                            <q-item-section>
                              <q-item-label class="text-weight-medium">
                                {{ formatHorario(mensagem.scheduleDate) }} • {{ mensagem.mediaName || mensagem.body || 'Mensagem agendada' }}
                              </q-item-label>
                              <q-item-label caption>
                                Status: {{ mensagem.status === 'received' ? 'Recebida' : 'Enviada' }}
                              </q-item-label>
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </div>
                    </div>
                  </div>
                  <div v-if="selectedScheduledMessage"
                    class="calendar-preview q-mt-md">
                    <div class="text-caption text-weight-medium text-grey-7 q-mb-sm">
                      Prévia da mensagem
                    </div>
                    <MensagemChat :mensagens="[selectedScheduledMessage]"
                      :isShowOptions="false" />
                  </div>
                </div>
                <q-slide-transition>
                  <div v-if="mostrarFormularioAgendamento"
                    class="calendar-form bg-grey-2 q-pa-md rounded-borders q-mt-md">
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">
                      Nova mensagem para {{ legendaDataSelecionada }}
                    </div>
                    <InputMensagem :key="`calendar-${calendarSelectedDate}`"
                      isScheduleDate
                      :defaultScheduleDate="agendamentoDefaultScheduleDate"
            :mensagensRapidas="mensagensRapidas"
                      :replyingMessage.sync="replyingMessageAgendamento" />
                  </div>
                </q-slide-transition>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog v-model="modalEditarMensagemAgendada"
      persistent>
      <q-card :style="$q.screen.width < 770 ? 'min-width: 96vw; max-width: 96vw' : 'min-width: 45vw; max-width: 45vw'">
        <q-card-section class="row items-center">
          <div class="text-h6 text-weight-medium">
            Editar mensagem agendada
          </div>
          <q-space />
          <q-btn flat
            round
            dense
            color="negative"
            icon="close"
            @click="cancelarEdicaoMensagemAgendada" />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-md">
          <q-datetime-picker
            v-model="editarMensagemAgendada.scheduleDate"
            label="Data/Hora agendada"
            mode="datetime"
            format24h
            rounded
            dense
            outlined
            hide-bottom-space
            color="primary" />
          <q-input
            v-model="editarMensagemAgendada.body"
            type="textarea"
            label="Mensagem"
            autogrow
            outlined
            dense
            maxlength="5000"
            counter />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat
            label="Cancelar"
            color="primary"
            @click="cancelarEdicaoMensagemAgendada" />
          <q-btn unelevated
            color="primary"
            label="Salvar alterações"
            :loading="editarMensagemLoading"
            :disable="editarMensagemLoading || !editarMensagemAgendada.body || !editarMensagemAgendada.scheduleDate"
            @click="salvarEdicaoMensagemAgendada" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="modalEncaminhamentoMensagem"
      persistent
      @hide="mensagemEncaminhamento = {}">
      <q-card :style="$q.screen.width < 770 ? `min-width: 98vw; max-width: 98vw` : 'min-width: 50vw; max-width: 50vw'">
        <q-card-section>
          <div class="text-h6">
            Encaminhando Mensagem
            <q-btn flat
              class="bg-padrao btn-rounded float-right"
              color="negative"
              icon="close"
              v-close-popup />
          </div>
        </q-card-section>
        <q-separator inset />
        <q-card-section>
          <MensagemChat :isShowOptions="false"
            :replyingMessage.sync="replyingMessage"
            :mensagens="[mensagemEncaminhamento]" />
        </q-card-section>
        <q-card-section>
          <q-select class="q-px-lg"
            ref="selectAutoCompleteContato"
            autofocus
            outlined
            rounded
            hide-dropdown-icon
            :loading="loading"
            v-model="contatoSelecionado"
            :options="contatos"
            input-debounce="700"
            @filter="localizarContato"
            use-input
            hide-selected
            fill-input
            clearable
            option-label="name"
            option-value="id"
            label="Localize e selecione o contato"
            hint="Digite no mínimo duas letras para localizar o contato. É possível selecionar apenas 1 contato!">
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps"
                v-on="scope.itemEvents"
                v-if="scope.opt.name">
                <q-item-section>
                  <q-item-label> {{ scope.opt.name }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.number }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>
        <q-card-actions align="right"
          class="q-pa-md">
          <q-btn class="bg-padrao q-px-sm"
            flat
            color="positive"
            label="Enviar"
            icon="mdi-send"
            @click="confirmarEncaminhamentoMensagem([mensagemEncaminhamento])" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </div>
</template>
<script>
import mixinCommon from './mixinCommon'
import InforCabecalhoChat from './InforCabecalhoChat'
// import parser from 'vdata-parser'
import MensagemChat from './MensagemChat'
import InputMensagem from './InputMensagem'
import mixinAtualizarStatusTicket from './mixinAtualizarStatusTicket'
import mixinSockets from './mixinSockets'
import InfiniteLoading from 'vue-infinite-loading'
import { ListarContatos } from 'src/service/contatos'
import { DeletarMensagem, EditarMensagem, EncaminharMensagem } from 'src/service/tickets'
import whatsBackground from 'src/assets/wa-background.png'
import whatsBackgroundDark from 'src/assets/wa-background-dark.jpg'
import bgConfidential from 'src/assets/bg-confidential.png'
import ModalEncerrarTicket from 'src/components/ModalEncerrarTicket'
import { mapGetters } from 'vuex'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, isToday, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default {
  name: 'Chat',
  mixins: [mixinCommon, mixinAtualizarStatusTicket, mixinSockets],
  props: {
    mensagensRapidas: Array
  },
  components: {
    InforCabecalhoChat,
    MensagemChat,
    InputMensagem,
    InfiniteLoading,
    ModalEncerrarTicket
  },
  data () {
    return {
      scrollIcon: false,
      loading: false,
      exibirContato: false,
      heigthInputMensagem: 0,
      params: {
        ticketId: null,
        pageNumber: 1
      },
      replyingMessage: null,
      modalAgendamentoMensagem: false,
      modalAgendamentoRapido: false,
      modalEncaminhamentoMensagem: false,
      mensagemEncaminhamento: {},
      mensagensParaEncaminhar: [],
      ativarMultiEncaminhamento: false,
      contatoSelecionado: {
        id: '',
        name: ''
      },
      contatos: [],
      calendarSelectedDate: null,
      calendarViewCursor: null,
      mostrarFormularioAgendamento: false,
      selectedScheduledMessage: null,
      selectedScheduledMessageKey: null,
      agendamentoDefaultScheduleDate: null,
      replyingMessageAgendamento: null,
      scheduledMessagesSnapshot: 0,
      modalEditarMensagemAgendada: false,
      mensagemAgendadaEdicao: null,
      editarMensagemAgendada: {
        body: '',
        scheduleDate: null
      },
      editarMensagemLoading: false
    }
  },
  computed: {
    ...mapGetters(['modoEspiar']),
    cMessages () {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.replyingMessage = null
      // Filtrar mensagens agendadas - elas devem aparecer apenas na lateral
      return this.mensagensTicket.filter(mensagem => !mensagem.scheduleDate)
    },
    style () {
      // Se sigilo estiver ativo, usar background confidencial
      if (this.ticketFocado?.isConfidential) {
        return {
          backgroundImage: `url(${bgConfidential}) !important`,
          backgroundRepeat: 'repeat !important',
          backgroundPosition: 'center !important',
          backgroundSize: 'auto !important'
        }
      }
      return {
        backgroundImage: this.$q.dark.isActive ? `url(${whatsBackgroundDark}) !important` : `url(${whatsBackground}) !important`,
        // backgroundRepeat: 'no-repeat !important',
        backgroundPosition: 'center !important'
        // backgroundSize: '50% !important',
      }
    },
    cStyleScroll () {
      const loading = 0 // this.loading ? 72 : 0
      const add = this.heigthInputMensagem + loading
      return `min-height: calc(100vh - ${62 + add}px); height: calc(100vh - ${62 + add}px); width: 100%`
    },
    scheduledMessages () {
      return this.ticketFocado?.scheduledMessages || []
    },
    mensagensPorData () {
      const agrupadas = {}
      this.scheduledMessages.forEach(mensagem => {
        const data = this.formatDateToCalendar(mensagem.scheduleDate)
        if (!data) return
        if (!agrupadas[data]) agrupadas[data] = []
        agrupadas[data].push(mensagem)
      })
      Object.keys(agrupadas).forEach(key => {
        agrupadas[key].sort((a, b) => {
          const aTime = new Date(a.scheduleDate || 0).getTime()
          const bTime = new Date(b.scheduleDate || 0).getTime()
          return aTime - bTime
        })
      })
      return agrupadas
    },
    diasSemana () {
      return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    },
    calendarWeeks () {
      const cursor = this.calendarViewCursor || new Date()
      const inicioMes = startOfMonth(cursor)
      const inicioGrade = startOfWeek(inicioMes, { weekStartsOn: 0 })
      const fimMes = endOfMonth(cursor)
      const fimGrade = endOfWeek(fimMes, { weekStartsOn: 0 })
      const semanas = []
      let dataCorrente = inicioGrade
      while (dataCorrente <= fimGrade) {
        const semana = []
        for (let i = 0; i < 7; i += 1) {
          const dia = dataCorrente
          const iso = format(dia, 'yyyy-MM-dd')
          semana.push({
            date: iso,
            day: format(dia, 'd'),
            isCurrentMonth: isSameMonth(dia, inicioMes),
            isToday: isToday(dia),
            mensagens: this.mensagensPorData[iso] || []
          })
          dataCorrente = addDays(dataCorrente, 1)
        }
        semanas.push(semana)
      }
      return semanas
    },
    calendarMonthLabel () {
      const cursor = this.calendarViewCursor || new Date()
      const label = format(cursor, 'MMMM yyyy', { locale: ptBR })
      return label.charAt(0).toUpperCase() + label.slice(1)
    },
    mensagensDataSelecionada () {
      if (!this.calendarSelectedDate) return []
      return this.mensagensPorData[this.calendarSelectedDate] || []
    },
    mensagensPendentesDataSelecionada () {
      return this.mensagensDataSelecionada.filter(msg => msg.status === 'pending')
    },
    mensagensEnviadasDataSelecionada () {
      return this.mensagensDataSelecionada.filter(msg => ['sended', 'received'].includes(msg.status))
    },
    legendaDataSelecionada () {
      if (!this.calendarSelectedDate) return 'Selecione uma data'
      try {
        return this.$formatarData(`${this.calendarSelectedDate}T00:00:00`, 'dd/MM/yyyy')
      } catch (error) {
        return this.calendarSelectedDate
      }
    }
  },
  watch: {
    modalAgendamentoMensagem (value) {
      if (value) {
        this.prepareCalendarState()
      } else {
        this.resetCalendarState()
        this.cancelarEdicaoMensagemAgendada()
      }
    },
    scheduledMessages: {
      handler (mensagens) {
        if (this.modalAgendamentoMensagem) {
          if (mensagens.length > this.scheduledMessagesSnapshot) {
            this.mostrarFormularioAgendamento = false
            if (this.agendamentoDefaultScheduleDate) {
              const dataAgendada = this.formatDateToCalendar(this.agendamentoDefaultScheduleDate)
              if (dataAgendada) {
                this.calendarSelectedDate = dataAgendada
                this.setCalendarViewCursorToDate(dataAgendada)
              }
            }
            this.agendamentoDefaultScheduleDate = null
            this.replyingMessageAgendamento = null
          }
          this.scheduledMessagesSnapshot = mensagens.length
        }

        if (this.selectedScheduledMessageKey) {
          const mensagemAtualizada = mensagens.find(msg => this.getScheduledMessageKey(msg) === this.selectedScheduledMessageKey)
          if (mensagemAtualizada) {
            this.selectedScheduledMessage = mensagemAtualizada
          } else {
            this.selectedScheduledMessage = null
            this.selectedScheduledMessageKey = null
          }
        }
      },
      deep: true
    }
  },
  methods: {
    prepareCalendarState () {
      this.scheduledMessagesSnapshot = this.scheduledMessages.length
      const dataPadrao = this.getDefaultCalendarDate()
      if (!this.calendarSelectedDate || (!this.mensagensPorData[this.calendarSelectedDate] && Object.keys(this.mensagensPorData).length)) {
        this.calendarSelectedDate = dataPadrao
      }
      this.setCalendarViewCursorToDate(this.calendarSelectedDate || dataPadrao)
      this.mostrarFormularioAgendamento = false
      this.agendamentoDefaultScheduleDate = null
      this.replyingMessageAgendamento = null
      this.selectedScheduledMessage = null
      this.selectedScheduledMessageKey = null
    },
    resetCalendarState () {
      this.calendarSelectedDate = null
      this.calendarViewCursor = null
      this.mostrarFormularioAgendamento = false
      this.agendamentoDefaultScheduleDate = null
      this.replyingMessageAgendamento = null
      this.selectedScheduledMessage = null
      this.selectedScheduledMessageKey = null
      this.scheduledMessagesSnapshot = 0
    },
    getDefaultCalendarDate () {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      const datasAgendadas = Object.keys(this.mensagensPorData).sort()
      if (this.mensagensPorData[hoje]) {
        return hoje
      }
      const proximaComMensagens = datasAgendadas.find(data => data >= hoje)
      return proximaComMensagens || datasAgendadas[0] || hoje
    },
    formatDateToCalendar (isoString) {
      if (!isoString) return null
      try {
        const parsed = parseISO(isoString)
        if (!isValid(parsed)) return null
        return format(parsed, 'yyyy-MM-dd')
      } catch (error) {
        console.error('Erro ao converter data agendada:', error)
        return null
      }
    },
    setCalendarViewCursorToDate (dateString) {
      let referencia = dateString ? parseISO(`${dateString}T00:00:00`) : new Date()
      if (!isValid(referencia)) {
        referencia = new Date()
      }
      this.calendarViewCursor = startOfMonth(referencia)
    },
    adjustSelectedDateToCursor () {
      if (!this.calendarViewCursor) {
        this.calendarSelectedDate = format(new Date(), 'yyyy-MM-dd')
        return
      }
      if (!this.calendarSelectedDate) {
        this.calendarSelectedDate = format(this.calendarViewCursor, 'yyyy-MM-dd')
        return
      }
      const selecionada = parseISO(`${this.calendarSelectedDate}T00:00:00`)
      if (!isValid(selecionada) || !isSameMonth(selecionada, this.calendarViewCursor)) {
        this.calendarSelectedDate = format(this.calendarViewCursor, 'yyyy-MM-dd')
      }
    },
    navigateCalendarMonth (step) {
      const cursor = this.calendarViewCursor || new Date()
      this.calendarViewCursor = startOfMonth(addMonths(cursor, step))
      this.adjustSelectedDateToCursor()
      this.selectedScheduledMessage = null
      this.selectedScheduledMessageKey = null
    },
    navigateCalendarYear (step) {
      this.navigateCalendarMonth(step * 12)
    },
    onSelectDate (dateString) {
      if (!dateString) return
      const parsed = parseISO(`${dateString}T00:00:00`)
      if (isValid(parsed) && (!this.calendarViewCursor || !isSameMonth(parsed, this.calendarViewCursor))) {
        this.calendarViewCursor = startOfMonth(parsed)
      }
      this.calendarSelectedDate = dateString
      this.selectedScheduledMessage = null
      this.selectedScheduledMessageKey = null
      if (this.mostrarFormularioAgendamento) {
        this.agendamentoDefaultScheduleDate = this.buildDefaultScheduleDate(dateString)
      }
    },
    calendarDayClasses (dia) {
      return {
        'calendar-day--outside': !dia.isCurrentMonth,
        'calendar-day--selected': this.calendarSelectedDate === dia.date,
        'calendar-day--today': dia.isToday,
        'calendar-day--has-messages': dia.mensagens.length > 0
      }
    },
    calendarDayBadgeColor (mensagens) {
      if (!mensagens.length) return null
      const possuiPendentes = mensagens.some(msg => msg.status === 'pending')
      const possuiEnviadas = mensagens.some(msg => ['sended', 'received'].includes(msg.status))
      if (possuiPendentes && possuiEnviadas) return 'calendar-day__badge--mixed'
      if (possuiPendentes) return 'calendar-day__badge--pending'
      return 'calendar-day__badge--sent'
    },
    calendarMensagemClasse (mensagem) {
      if (mensagem.status === 'pending') return 'calendar-day__message--pending'
      if (['sended', 'received'].includes(mensagem.status)) return 'calendar-day__message--sent'
      return ''
    },
    formatMensagemPreview (mensagem) {
      const texto = mensagem.mediaName || mensagem.body || 'Mensagem agendada'
      return texto.length > 60 ? `${texto.slice(0, 60)}...` : texto
    },
    abrirFormularioAgendamento () {
      if (this.mostrarFormularioAgendamento || this.modoEspiar) return
      if (!this.calendarSelectedDate) {
        this.calendarSelectedDate = format(this.calendarViewCursor || new Date(), 'yyyy-MM-dd')
      }
      this.agendamentoDefaultScheduleDate = this.buildDefaultScheduleDate(this.calendarSelectedDate)
      this.replyingMessageAgendamento = null
      this.mostrarFormularioAgendamento = true
    },
    abrirEdicaoMensagemAgendada (mensagem) {
      this.mostrarFormularioAgendamento = false
      this.mensagemAgendadaEdicao = mensagem
      const dataSelecionada = this.formatDateToCalendar(mensagem.scheduleDate)
      if (dataSelecionada) {
        this.calendarSelectedDate = dataSelecionada
        this.setCalendarViewCursorToDate(dataSelecionada)
      }
      const scheduleValue = mensagem.scheduleDate
        ? new Date(mensagem.scheduleDate)
        : new Date()
      const scheduleISO = Number.isNaN(scheduleValue.getTime())
        ? null
        : scheduleValue.toISOString()
      this.editarMensagemAgendada = {
        body: mensagem.mediaName || mensagem.body || '',
        scheduleDate: scheduleISO
      }
      this.modalEditarMensagemAgendada = true
    },
    cancelarEdicaoMensagemAgendada () {
      this.modalEditarMensagemAgendada = false
      this.mensagemAgendadaEdicao = null
      this.editarMensagemAgendada = {
        body: '',
        scheduleDate: null
      }
    },
    async salvarEdicaoMensagemAgendada () {
      if (!this.mensagemAgendadaEdicao) return
      const mensagemTexto = this.editarMensagemAgendada.body
        ? this.editarMensagemAgendada.body.trim()
        : ''
      if (!mensagemTexto) {
        this.$notificarErro('Informe o texto da mensagem.')
        return
      }
      if (!this.editarMensagemAgendada.scheduleDate) {
        this.$notificarErro('Informe a data e hora do agendamento.')
        return
      }

      let scheduleISO
      try {
        const parsed = new Date(this.editarMensagemAgendada.scheduleDate)
        if (Number.isNaN(parsed.getTime())) {
          throw new Error('invalid date')
        }
        scheduleISO = parsed.toISOString()
      } catch (error) {
        this.$notificarErro('Data de agendamento inválida.')
        return
      }

      this.editarMensagemLoading = true
      try {
        const payload = {
          ...this.mensagemAgendadaEdicao,
          messageId: this.mensagemAgendadaEdicao.messageId || 'null',
          newBody: mensagemTexto,
          scheduleDate: scheduleISO
        }
        const { data } = await EditarMensagem(payload)
        const mensagemAtualizada = data || {
          ...this.mensagemAgendadaEdicao,
          body: mensagemTexto,
          scheduleDate: scheduleISO,
          isEdited: true,
          updatedAt: new Date().toISOString()
        }

        this.$store.commit('UPDATE_SCHEDULED_MESSAGE', mensagemAtualizada)
        this.selectedScheduledMessage = mensagemAtualizada
        this.selectedScheduledMessageKey = this.getScheduledMessageKey(mensagemAtualizada)

        const dataSelecionada = this.formatDateToCalendar(mensagemAtualizada.scheduleDate)
        if (dataSelecionada) {
          this.calendarSelectedDate = dataSelecionada
          this.setCalendarViewCursorToDate(dataSelecionada)
        }

        this.$q.notify({
          type: 'positive',
          message: 'Mensagem agendada atualizada com sucesso!'
        })
        this.cancelarEdicaoMensagemAgendada()
      } catch (error) {
        console.error(error)
        this.$notificarErro('Não foi possível editar a mensagem agendada', error)
      } finally {
        this.editarMensagemLoading = false
      }
    },
    cancelarFormularioAgendamento () {
      this.mostrarFormularioAgendamento = false
      this.agendamentoDefaultScheduleDate = null
      this.replyingMessageAgendamento = null
    },
    buildDefaultScheduleDate (dateString) {
      if (!dateString) return null
      const agora = new Date()
      const horas = String(agora.getHours()).padStart(2, '0')
      const minutos = String(agora.getMinutes()).padStart(2, '0')
      const tentativa = new Date(`${dateString}T${horas}:${minutos}:00`)
      if (!Number.isNaN(tentativa.getTime())) {
        return tentativa.toISOString()
      }
      const fallback = new Date(`${dateString}T12:00:00`)
      return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString()
    },
    selecionarMensagem (mensagem) {
      const key = this.getScheduledMessageKey(mensagem)
      if (key && key === this.selectedScheduledMessageKey) {
        this.selectedScheduledMessage = null
        this.selectedScheduledMessageKey = null
        return
      }
      this.selectedScheduledMessage = mensagem
      this.selectedScheduledMessageKey = key
    },
    getScheduledMessageKey (mensagem) {
      if (!mensagem) return null
      return mensagem.id || mensagem.messageId || mensagem.scheduleId || mensagem.idFront || mensagem.uid || `${mensagem.scheduleDate}-${mensagem.body}`
    },
    formatHorario (isoString) {
      if (!isoString) return '--:--'
      try {
        return this.$formatarData(isoString, 'HH:mm')
      } catch (error) {
        return '--:--'
      }
    },
    calendarMoreLabel (mensagens) {
      if (!mensagens || mensagens.length <= 3) return ''
      return `+${mensagens.length - 3} mensagens`
    },
    deletarMensagemAgendada (mensagem) {
      const payload = { ...mensagem }
      this.$q.dialog({
        title: 'Remover mensagem agendada?',
        message: 'Mensagens já enviadas não serão removidas do cliente.',
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
          await DeletarMensagem(payload)
          this.$store.commit('UPDATE_MESSAGE_STATUS', {
            ...payload,
            ticket: { id: this.ticketFocado.id }
          })
          if (this.getScheduledMessageKey(mensagem) === this.selectedScheduledMessageKey) {
            this.selectedScheduledMessage = null
            this.selectedScheduledMessageKey = null
          }
        } catch (error) {
          this.$notificarErro('Não foi possível apagar a mensagem', error)
        } finally {
          this.loading = false
        }
      })
    },
    async onResizeInputMensagem (size) {
      this.heigthInputMensagem = size.height
    },
    async onLoadMore (infiniteState) {
      if (this.loading) return

      if (!this.hasMore || !this.ticketFocado?.id) {
        return infiniteState.complete()
      }

      try {
        this.loading = true
        this.params.ticketId = this.ticketFocado.id
        this.params.pageNumber += 1
        await this.$store.dispatch('LocalizarMensagensTicket', this.params)
        this.loading = false
        infiniteState.loaded()
      } catch (error) {
        infiniteState.complete()
      }
      this.loading = false
    },
    scrollArea (e) {
      this.hideOptions = true
      setTimeout(() => {
        if (!e) return
        this.scrollIcon = (e.verticalSize - (e.verticalPosition + e.verticalContainerSize)) > 2000 // e.verticalPercentage < 0.8
      }, 200)
    },
    scrollToBottom () {
      document.getElementById('inicioListaMensagensChat').scrollIntoView()
    },
    abrirModalEncaminharMensagem (msg) {
      this.mensagemEncaminhamento = msg
      this.modalEncaminhamentoMensagem = true
    },
    async localizarContato (search, update, abort) {
      if (search.length < 2) {
        if (this.contatos.length) update(() => { this.contatos = [...this.contatos] })
        abort()
        return
      }
      this.loading = true
      const { data } = await ListarContatos({
        searchParam: search
      })

      update(() => {
        if (data.contacts.length) {
          this.contatos = data.contacts
        } else {
          this.contatos = [{}]
          // this.$refs.selectAutoCompleteContato.toggleOption({}, true)
        }
      })
      this.loading = false
    },
    cancelarMultiEncaminhamento () {
      this.mensagensParaEncaminhar = []
      this.ativarMultiEncaminhamento = false
    },
    confirmarEncaminhamentoMensagem (data) {
      if (!this.contatoSelecionado.id) {
        this.$notificarErro('Selecione o contato de destino das mensagens.')
        return
      }
      EncaminharMensagem(data, this.contatoSelecionado)
        .then(r => {
          this.$notificarSucesso(`Mensagem encaminhada para ${this.contatoSelecionado.name} | Número: ${this.contatoSelecionado.number}`)
          this.mensagensParaEncaminhar = []
          this.ativarMultiEncaminhamento = false
        })
        .catch(e => {
          this.$notificarErro('Não foi possível encaminhar mensagem. Tente novamente em alguns minutos!', e)
        })
    }
  },
  created () {
    this.$root.$on('scrollToBottomMessageChat', this.scrollToBottom)
    this.socketTicket()
  },
  mounted () {
    this.socketMessagesList()
  },
  destroyed () {
    this.$root.$off('scrollToBottomMessageChat', this.scrollToBottom)
  }
}
</script>

<style lang="scss">
audio {
  height: 40px;
  width: 264px;
}

.mostar-btn-opcoes-chat {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  position: absolute !important;
  top: 8px;
  right: 8px;
  z-index: 999;
  pointer-events: none;
}

.q-message-text:hover .mostar-btn-opcoes-chat {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* Manter botão visível quando menu estiver aberto */
.q-message-text:hover .mostar-btn-opcoes-chat:hover,
.q-message-text .mostar-btn-opcoes-chat:focus-within,
.q-message-text .mostar-btn-opcoes-chat:focus {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}

/* Garantir que o menu não cause reposicionamento */
.q-menu {
  position: fixed !important;
}

/* Garantir posicionamento correto do container da mensagem */
.q-message {
  position: relative !important;
}

.q-message-text {
  position: relative !important;
}

.hr-text {
  line-height: 1em;
  position: relative;
  outline: 0;
  border: 0;
  color: black;
  text-align: center;
  height: 1.5em;
  opacity: 0.8;

  &:before {
    content: "";
    // use the linear-gradient for the fading effect
    // use a solid background color for a solid bar
    background: linear-gradient(to right, transparent, #818078, transparent);
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
  }

  &:after {
    content: attr(data-content);
    position: relative;
    display: inline-block;
    color: black;
    font-size: 16px;
    font-weight: 600;
    padding: 0 0.5em;
    line-height: 1.5em;
    background-color: $grey;
    border-radius: 15px;
  }
}

.textContentItem {
  overflow-wrap: break-word;
  // padding: 3px 80px 6px 6px;
}

.textContentItemDeleted {
  font-style: italic;
  color: rgba(0, 0, 0, 0.36);
  overflow-wrap: break-word;
  // padding: 3px 80px 6px 6px;
}

.replyginContactMsgSideColor {
  flex: none;
  width: 4px;
  background-color: #35cd96;
}

.replyginSelfMsgSideColor {
  flex: none;
  width: 4px;
  background-color: #6bcbef;
}

.replyginMsgBody {
  padding: 10;
  height: auto;
  display: block;
  white-space: pre-wrap;
  overflow: hidden;
}

.messageContactName {
  display: flex;
  color: #6bcbef;
  font-weight: 500;
}

.vac-icon-scroll {
  position: absolute;
  bottom: 20px;
  right: 20px;
  box-shadow: 0 1px 1px -1px rgba(0, 0, 0, 0.2), 0 1px 1px 0 rgba(0, 0, 0, 0.14),
    0 1px 2px 0 rgba(0, 0, 0, 0.12);
  display: flex;
  cursor: pointer;
  z-index: 99;
}

// /* CSS Logilcs */
// #message-box {
//   &:empty ~ #submit-button {
//     display: none;
//   } /*when textbox empty show microhpone*/
//   &:not(:empty) ~ #voice-button {
//     display: none;
//   } /*when textbox with texy show submit button*/
// }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to

/* .fade-leave-active below version 2.1.8 */
  {
  opacity: 0;
}

.calendar-modal__container {
  flex-wrap: wrap;
}

.calendar-main {
  background: #f5f7fb;
  border-radius: 12px;
  min-height: 420px;
}

.calendar-header .q-btn {
  min-width: 32px;
}

.calendar-header__title {
  text-transform: capitalize;
}

.calendar-weekdays {
  margin-bottom: 4px;
}

.calendar-weekday {
  font-weight: 600;
  color: #5f6368;
  padding: 6px 0;
}

.calendar-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  width: 100%;
}

.calendar-day {
  background: #ffffff;
  border-radius: 10px;
  height: 140px;
  padding: 6px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  width: 100%;
}

.calendar-day--outside {
  background: #f2f2f2;
  color: #9e9e9e;
}

.calendar-day--selected {
  border: 2px solid #1976d2;
  box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.2);
}

.calendar-day--has-messages {
  background: #fdfcff;
}

.calendar-day--today {
  border: 2px solid #26a69a;
}

.calendar-day:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.calendar-day__header {
  margin-bottom: 6px;
}

.calendar-day__number {
  font-weight: 700;
  font-size: 14px;
}

.calendar-day__badge {
  padding: 0 6px;
  border-radius: 12px;
  font-size: 11px;
  line-height: 20px;
  height: 20px;
  color: #fff;
}

.calendar-day__badge--pending {
  background: #f2c037;
}

.calendar-day__badge--sent {
  background: #21ba45;
}

.calendar-day__badge--mixed {
  background: #8e24aa;
}

.calendar-day__messages {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.calendar-day__message {
  background: rgba(33, 150, 243, 0.08);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 11px;
  display: flex;
  gap: 6px;
  align-items: center;
  line-height: 1.3;
  overflow: hidden;
}

.calendar-day__message-time {
  font-weight: 600;
  color: #455a64;
}

.calendar-day__message-body {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.calendar-day__message--pending {
  border-left: 3px solid #f2c037;
}

.calendar-day__message--sent {
  border-left: 3px solid #21ba45;
}

.calendar-day__more {
  font-size: 11px;
  color: #757575;
}

.calendar-sidebar {
  background: #ffffff;
  border-radius: 12px;
  min-height: 420px;
  display: flex;
  flex-direction: column;
}

.calendar-legend__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.calendar-legend__dot--pending {
  background: #f2c037;
}

.calendar-legend__dot--sent {
  background: #21ba45;
}

.calendar-legend__dot--mixed {
  background: #8e24aa;
}

.calendar-form {
  border: 1px dashed rgba(0, 0, 0, 0.1);
  position: relative;
}

.calendar-preview .q-message {
  max-height: 240px;
  overflow-y: auto;
}

@media (max-width: 1023px) {
  .calendar-main,
  .calendar-sidebar {
    min-height: unset;
  }
}

/* Modo Escuro */
.body--dark .calendar-main {
  background: #1e1e1e;
}

.body--dark .calendar-sidebar {
  background: #1e1e1e;
}

.body--dark .calendar-weekday {
  color: #b0b0b0;
}

.body--dark .calendar-day {
  background: #2d2d2d;
  border-color: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

.body--dark .calendar-day--outside {
  background: #252525;
  color: #707070;
}

.body--dark .calendar-day--selected {
  border-color: #42a5f5;
  box-shadow: 0 0 0 1px rgba(66, 165, 245, 0.3);
}

.body--dark .calendar-day--has-messages {
  background: #2a2a2a;
}

.body--dark .calendar-day--today {
  border-color: #4db6ac;
}

.body--dark .calendar-day:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  background: #333333;
}

.body--dark .calendar-day__number {
  color: #e0e0e0;
}

.body--dark .calendar-day__message {
  background: rgba(66, 165, 245, 0.15);
  color: #e0e0e0;
}

.body--dark .calendar-day__message-time {
  color: #b0b0b0;
}

.body--dark .calendar-day__message-body {
  color: #e0e0e0;
}

.body--dark .calendar-day__more {
  color: #9e9e9e;
}

.body--dark .calendar-form {
  border-color: rgba(255, 255, 255, 0.1);
  background: #252525 !important;
}

.body--dark .calendar-day-details .q-item.bg-grey-2 {
  background: #3a3a3a !important;
  color: #e0e0e0 !important;
}

.body--dark .calendar-day-details .q-item.bg-grey-2 .q-item__label {
  color: #e0e0e0 !important;
}

.body--dark .calendar-day-details .q-item.bg-grey-2 .q-item__label--caption {
  color: #b0b0b0 !important;
}
</style>
