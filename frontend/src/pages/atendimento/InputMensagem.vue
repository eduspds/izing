<template>
  <div>
    <div
      class="row absolute-full fit col-12"
      ref="menuFast"
    >
      <q-menu
        :target="$refs.menuFast"
        :key="cMensagensRapidas.length"
        square
        no-focus
        no-parent-event
        class="no-box-shadow no-shadow quick-message-menu"
        fit
        :offset="[0, 5]"
        persistent
        @hide="visualizarMensagensRapidas = false"
        :value="textChat.startsWith('/') || visualizarMensagensRapidas"
      >
        <q-list
          class="no-shadow no-box-shadow quick-message-list"
          separator
          v-if="!cMensagensRapidas.length"
        >
          <q-item>
            <q-item-section>
              <q-item-label class="text-negative text-bold">Ops... Nada por aqui!</q-item-label>
              <q-item-label caption v-if="!mensagensRapidas.length">
                Cadastre suas mensagens na administração de sistema.
              </q-item-label>
              <q-item-label caption v-else>
                Nenhuma mensagem encontrada para esta busca. Tente outro termo.
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-list
          class="no-shadow no-box-shadow quick-message-list"
          separator
          v-else
        >
          <q-item
            v-for="resposta in cMensagensRapidas"
            :key="resposta.key"
            clickable
            v-close-popup
            @click="mensagemRapidaSelecionada(resposta.message)"
          >
            <q-item-section>
              <q-item-label class="text-bold"> {{ resposta.key }} </q-item-label>
              <q-item-label caption class="quick-message-preview">
                {{ resposta.message }}
              </q-item-label>
            </q-item-section>
            <q-tooltip content-class="bg-padrao text-grey-9 text-bold quick-message-tooltip" :max-width="320">
              {{ resposta.message }}
            </q-tooltip>
          </q-item>
        </q-list>
      </q-menu>
    </div>

    <div
      style="min-height: 80px"
      class="row q-pb-md q-pt-sm bg-white justify-start items-center text-grey-9 relative-position"
    >
      <q-banner
        v-if="contactBlocked"
        class="col-12 bg-negative text-white rounded-borders q-mb-sm"
        dense
      >
        <template v-slot:avatar>
          <q-icon name="mdi-block-helper" size="28px" />
        </template>
        <span class="text-weight-medium">Contato bloqueado.</span> Não é possível enviar mensagens. Desbloqueie o contato na lista de contatos para habilitar o envio.
      </q-banner>

      <div
        class="row col-12 q-pa-sm"
        v-if="isScheduleDate"
      >
        <q-datetime-picker
          style="width: 300px"
          dense
          rounded
          hide-bottom-space
          outlined
          stack-label
          bottom-slots
          label="Data/Hora Agendamento"
          mode="datetime"
          color="primary"
          v-model="scheduleDate"
          format24h
        />
      </div>

      <template v-if="!isRecordingAudio">
        <q-btn
          v-if="$q.screen.width > 500"
          flat
          dense
          @click="abrirEnvioArquivo"
          icon="mdi-paperclip"
          :disable="cDisableActions"
          class="bg-padrao btn-rounded q-mx-xs"
          :color="$q.dark.isActive ? 'white' : ''"
        >
          <q-tooltip content-class="text-bold">
            Enviar arquivo
          </q-tooltip>
        </q-btn>
        <q-btn
          v-if="$q.screen.width > 500"
          flat
          dense
          icon="mdi-emoticon-happy-outline"
          :disable="cDisableActions"
          class="bg-padrao btn-rounded q-mx-xs"
          :color="$q.dark.isActive ? 'white' : ''"
        >
          <q-tooltip content-class="text-bold">
            Emoji
          </q-tooltip>
          <q-menu
            anchor="top right"
            self="bottom middle"
            :offset="[5, 40]"
          >
            <VEmojiPicker
              style="width: 40vw"
              :showSearch="false"
              :emojisByRow="20"
              labelSearch="Localizar..."
              lang="pt-BR"
              @select="onInsertSelectEmoji"
            />
          </q-menu>
        </q-btn>
        <!-- <q-btn
          v-if="$q.screen.width > 500"
          flat
          dense
          @click="handlSendLinkVideo"
          icon="mdi-message-video"
          :disable="cDisableActions"
          class="bg-padrao btn-rounded q-mx-xs"
          :color="$q.dark.isActive ? 'white' : ''"
        >
          <q-tooltip content-class="text-bold">
            Enviar link para videoconferencia
          </q-tooltip>
        </q-btn>
        <q-toggle
          keep-color
          v-model="sign"
          dense
          @input="handleSign"
          class="q-mx-sm q-ml-md"
          :color="sign ? 'positive' : 'black'"
          type="toggle"
        >
          <q-tooltip>
            {{ sign ? 'Desativar' : 'Ativar' }} Assinatura
          </q-tooltip>
        </q-toggle> -->
        <q-input
          hide-bottom-space
          :loading="loading"
          :disable="cDisableActions"
          ref="inputEnvioMensagem"
          id="inputEnvioMensagem"
          type="textarea"
          @keydown.exact.enter.prevent="() => textChat.trim().length ? enviarMensagem() : ''"
          @keydown.tab="onQuickMessageTab"
          v-show="!cMostrarEnvioArquivo"
          class="col-grow q-mx-xs text-grey-10 inputEnvioMensagem"
          bg-color="grey-2"
          color="grey-7"
          placeholder="Digita sua mensagem"
          input-style="max-height: 30vh"
          autogrow
          rounded
          dense
          outlined
          v-model="textChat"
          :value="textChat"
          @paste="handleInputPaste"
        >
          <!-- <template v-slot:hint>
          "Quebra linha: Shift + Enter"
        </template> -->
          <template
            v-slot:prepend
            v-if="$q.screen.width < 500"
          >
            <q-btn
              flat
              icon="mdi-emoticon-happy-outline"
              :disable="cDisableActions"
              dense
              round
              :color="$q.dark.isActive ? 'white' : ''"
            >
              <q-tooltip content-class="text-bold">
                Emoji
              </q-tooltip>
              <q-menu
                anchor="top right"
                self="bottom middle"
                :offset="[5, 40]"
              >
                <VEmojiPicker
                  style="width: 40vw"
                  :showSearch="false"
                  :emojisByRow="20"
                  labelSearch="Localizar..."
                  lang="pt-BR"
                  @select="onInsertSelectEmoji"
                />
              </q-menu>
            </q-btn>
          </template>
          <template v-slot:append>
            <q-btn
              flat
              @click="abrirEnvioArquivo"
              icon="mdi-paperclip"
              :disable="cDisableActions"
              dense
              round
              v-if="$q.screen.width < 500"
              class="bg-padrao btn-rounded"
              :color="$q.dark.isActive ? 'white' : ''"
            >
              <q-tooltip content-class=" text-bold">
                Enviar arquivo
              </q-tooltip>
            </q-btn>
            <q-btn
              dense
              flat
              round
              icon="mdi-message-flash-outline"
              @click="visualizarMensagensRapidas = !visualizarMensagensRapidas"
            >
              <q-tooltip content-class="text-bold">
                Mensagens Rápidas
              </q-tooltip>
            </q-btn>
          </template>
        </q-input>
        <!-- tamanho maximo por arquivo de 10mb -->
        <q-file
          :loading="loading"
          :disable="cDisableActions"
          ref="PickerFileMessage"
          id="PickerFileMessage"
          v-show="cMostrarEnvioArquivo"
          v-model="arquivos"
          class="col-grow q-mx-xs PickerFileMessage"
          bg-color="blue-grey-1"
          input-style="max-height: 30vh"
          outlined
          use-chips
          multiple
          autogrow
          dense
          rounded
          append
          :max-files="5"
          :max-file-size="104857600"
          :max-total-size="104857600"
          accept=".txt, .xml, .jpg, .png, image/jpeg, .pdf, .doc, .docx, .mp4, .xls, .xlsx, .jpeg, .zip, .ppt, .pptx, image/*"
          @rejected="onRejectedFiles"
        />
        <q-btn
          v-if="textChat || cMostrarEnvioArquivo"
          ref="btnEnviarMensagem"
          @click="enviarMensagem"
          :disabled="(ticketFocado.status !== 'open' && !isScheduleDate) || contactBlocked"
          flat
          icon="mdi-send"
          class="bg-padrao btn-rounded q-mx-xs"
          :color="$q.dark.isActive ? 'white' : ''"
        >
          <q-tooltip content-class=" text-bold">
            Enviar Mensagem
          </q-tooltip>
        </q-btn>
        <q-btn
          v-if="!textChat && !cMostrarEnvioArquivo && !isRecordingAudio"
          @click="handleSartRecordingAudio"
          :disabled="cDisableActions"
          flat
          icon="mdi-microphone"
          class="bg-padrao btn-rounded q-mx-xs"
          :color="$q.dark.isActive ? 'white' : ''"
        >
          <q-tooltip content-class="text-bold">
            Enviar Áudio
          </q-tooltip>
        </q-btn>
      </template>
      <template v-else>
        <div class="full-width items-center row justify-end ">
          <q-skeleton
            animation="pulse-y"
            class="col-grow q-mx-md"
            type="text"
          />
          <div
            style="width: 200px"
            class="flex flex-center items-center"
            v-if="isRecordingAudio"
          >
            <q-btn
              flat
              icon="mdi-close"
              color="negative"
              @click="handleCancelRecordingAudio"
              class="bg-padrao btn-rounded q-mx-xs"
            />
            <RecordingTimer
              class="text-bold"
              :class="{ 'text-white': $q.dark.isActive }"
            />
            <q-btn
              flat
              icon="mdi-send-circle-outline"
              color="positive"
              @click="handleStopRecordingAudio"
              class="bg-padrao btn-rounded q-mx-xs"
            />
          </div>

        </div>
      </template>

      <q-dialog
        v-model="abrirModalPreviewImagem"
        position="right"
        @hide="hideModalPreviewImagem"
        @show="showModalPreviewImagem"
      >
        <q-card
          style="height: 90vh; min-width: 60vw; max-width: 60vw"
          class="q-pa-md"
        >
          <q-card-section>
            <div class="text-h6">{{ urlMediaPreview.title }}
              <q-btn
                class="float-right"
                icon="close"
                color="negative"
                round
                outline
                @click="hideModalPreviewImagem"
              />
            </div>
          </q-card-section>
          <q-card-section>
            <q-img
              :src="urlMediaPreview.src"
              spinner-color="white"
              class="img-responsive mdi-image-auto-adjust q-uploader__file--img"
              style="height: 60vh; min-width: 55vw; max-width: 55vw"
            />
          </q-card-section>
          <q-card-actions align="center">
            <q-btn
              ref="qbtnPasteEnvioMensagem"
              label="Enviar"
              color="primary"
              v-close-popup
              @click="enviarMensagem"
              @keypress.enter.exact="enviarMensagem()"
            />
          </q-card-actions>
          <span class="row col text-caption text-blue-grey-10">* Confirmar envio: Enter</span>
          <span class="row col text-caption text-blue-grey-10">** Cancelar: ESC</span>
        </q-card>
      </q-dialog>
    </div>
    <!-- <p
      v-if="!cMostrarEnvioArquivo"
      class="row col text-caption text-blue-grey-10"
    >Quebra linha/Parágrafo: Shift + Enter ||| Enviar Mensagem: Enter</p> -->
  </div>
</template>

<script>
import { uid } from 'quasar'
import mixinCommon from './mixinCommon'
import { EnviarMensagemTexto } from 'src/service/tickets'
import { VEmojiPicker } from 'v-emoji-picker'
import { mapGetters } from 'vuex'
import RecordingTimer from './RecordingTimer'
import MicRecorder from 'mic-recorder-to-mp3'
const Mp3Recorder = new MicRecorder({ bitRate: 128 })

export default {
  name: 'InputMensagem',
  mixins: [mixinCommon],
  props: {
    replyingMessage: {
      type: Object,
      default: null
    },
    isScheduleDate: {
      type: Boolean,
      default: false
    },
    defaultScheduleDate: {
      type: String,
      default: null
    },
    mensagensRapidas: {
      type: Array,
      default: () => []
    }
  },
  components: {
    VEmojiPicker,
    RecordingTimer
  },
  data () {
    return {
      loading: false,
      abrirFilePicker: false,
      abrirModalPreviewImagem: false,
      isRecordingAudio: false,
      urlMediaPreview: {
        title: '',
        src: ''
      },
      visualizarMensagensRapidas: false,
      arquivos: [],
      textChat: '',
      scheduleDate: null
    }
  },
  watch: {
    defaultScheduleDate: {
      handler (value) {
        if (!value) {
          if (this.scheduleDate) {
            this.scheduleDate = null
          }
          return
        }
        if (value !== this.scheduleDate) {
          this.scheduleDate = value
        }
      },
      immediate: true
    },
    isScheduleDate (value) {
      if (!value && this.scheduleDate) {
        this.scheduleDate = null
      }
    }
  },
  computed: {
    ...mapGetters(['ticketFocado', 'modoEspiar']),
    cMostrarEnvioArquivo () {
      return this.arquivos.length > 0
    },
    contactBlocked () {
      return this.ticketFocado?.contact?.isBlocked === true || this.ticketFocado?.contactIsBlocked === true
    },
    cDisableActions () {
      return (
        this.isRecordingAudio ||
        (this.ticketFocado.status !== 'open' && !this.isScheduleDate) ||
        this.modoEspiar ||
        this.contactBlocked
      )
    },
    cMensagensRapidas () {
      let search = this.textChat?.toLowerCase()
      if (search && search.trim().startsWith('/')) {
        search = search.replace('/', '')
      }

      // Se não há busca ou busca está vazia, retorna todas as mensagens
      if (!search || search.trim() === '') {
        return this.mensagensRapidas
      }

      // Filtra as mensagens baseado na busca
      const filtered = this.mensagensRapidas.filter(r => r.key.toLowerCase().indexOf(search) !== -1)

      // Se não encontrou nenhuma correspondência, retorna todas as mensagens para evitar "não há nada aqui"
      return filtered.length > 0 ? filtered : this.mensagensRapidas
    },
    cSignEnabled () {
      try {
        const configuracoes = JSON.parse(localStorage.getItem('configuracoes') || '[]')
        const signConfig = configuracoes.find(config => config.key === 'sign')
        return signConfig && signConfig.value === 'enabled'
      } catch (error) {
        console.error('Erro ao verificar configuração de assinatura:', error)
        return false
      }
    }
  },
  methods: {
    openFilePreview (event) {
      const data = event.clipboardData.files[0]
      const urlImg = window.URL.createObjectURL(data)
      return urlImg
    },
    handleInputPaste (e) {
      if (!this.ticketFocado?.id) return
      if (e.clipboardData.files[0]) {
        this.textChat = ''
        this.arquivos = [e.clipboardData.files[0]]
        this.abrirModalPreviewImagem = true
        this.urlMediaPreview = {
          title: `Enviar imagem para ${this.ticketFocado?.contact?.name}`,
          src: this.openFilePreview(e)
        }
        this.$refs.inputEnvioMensagem.focus()
      }
    },
    onQuickMessageTab (e) {
      if (!this.textChat.trim().startsWith('/') || !this.cMensagensRapidas.length) return
      e.preventDefault()
      e.stopPropagation()
      const search = this.textChat.replace('/', '').trim().toLowerCase()
      const exact = this.cMensagensRapidas.find(m => m.key.toLowerCase() === search)
      const msg = exact || this.cMensagensRapidas[0]
      if (msg) this.mensagemRapidaSelecionada(msg.message)
    },
    mensagemRapidaSelecionada (mensagem) {
      this.textChat = mensagem
      this.visualizarMensagensRapidas = false
      this.$nextTick(() => {
        this.$refs.inputEnvioMensagem && this.$refs.inputEnvioMensagem.focus()
      })
    },
    onInsertSelectEmoji (emoji) {
      const self = this
      var tArea = this.$refs.inputEnvioMensagem.$refs.input
      // get cursor's position:
      var startPos = tArea.selectionStart,
        endPos = tArea.selectionEnd,
        cursorPos = startPos,
        tmpStr = tArea.value

      // filter:
      if (!emoji.data) {
        return
      }

      // insert:
      self.txtContent = this.textChat
      self.txtContent = tmpStr.substring(0, startPos) + emoji.data + tmpStr.substring(endPos, tmpStr.length)
      this.textChat = self.txtContent
      // move cursor:
      setTimeout(() => {
        tArea.selectionStart = tArea.selectionEnd = cursorPos + emoji.data.length
      }, 10)
    },
    abrirEnvioArquivo (event) {
      this.textChat = ''
      this.abrirFilePicker = true
      this.$refs.PickerFileMessage.pickFiles(event)
    },
    async handleSartRecordingAudio () {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        await Mp3Recorder.start()
        this.isRecordingAudio = true
      } catch (error) {
        this.isRecordingAudio = false
      }
    },
    async handleStopRecordingAudio () {
      this.loading = true
      try {
        const [, blob] = await Mp3Recorder.stop().getMp3()
        if (blob.size < 10000) {
          this.loading = false
          this.isRecordingAudio = false
          return
        }

        const formData = new FormData()
        const filename = `${new Date().getTime()}.mp3`
        formData.append('medias', blob, filename)
        formData.append('body', filename)
        formData.append('fromMe', true)
        if (this.isScheduleDate) {
          formData.append('scheduleDate', this.scheduleDate)
        }
        const ticketId = this.ticketFocado.id
        await EnviarMensagemTexto(ticketId, formData)
        this.arquivos = []
        this.textChat = ''
        this.$emit('update:replyingMessage', null)
        this.abrirFilePicker = false
        this.abrirModalPreviewImagem = false
        this.isRecordingAudio = false
        this.loading = false
        setTimeout(() => {
          this.scrollToBottom()
        }, 300)
      } catch (error) {
        this.isRecordingAudio = false
        this.loading = false
        this.$notificarErro('Ocorreu um erro!', error)
      }
    },
    async handleCancelRecordingAudio () {
      try {
        await Mp3Recorder.stop().getMp3()
        this.isRecordingAudio = false
        this.loading = false
      } catch (error) {
        this.$notificarErro('Ocorreu um erro!', error)
      }
    },
    prepararUploadMedia () {
      if (!this.arquivos.length) {
        throw new Error('Não existem arquivos para envio')
      }
      const formData = new FormData()
      formData.append('fromMe', true)
      formData.append('idFront', uid())
      const firstBody = this.arquivos.length === 1
        ? this.arquivos[0].name
        : `${this.arquivos.length} arquivos`
      formData.append('body', firstBody)
      if (this.isScheduleDate) {
        formData.append('scheduleDate', this.scheduleDate)
      }
      this.arquivos.forEach(media => {
        formData.append('medias', media)
      })
      return formData
    },
    prepararMensagemTexto () {
      if (this.textChat.trim() === '') {
        throw new Error('Mensagem Inexistente')
      }

      if (this.textChat.trim() && this.textChat.trim().startsWith('/')) {
        let search = this.textChat.trim().toLowerCase()
        search = search.replace('/', '')
        const mensagemRapida = this.cMensagensRapidas.find(m => m.key.toLowerCase() === search)
        if (mensagemRapida?.message) {
          this.textChat = mensagemRapida.message
        } else {
          const error = this.cMensagensRapidas.length > 1
            ? 'Várias mensagens rápidas encontradas. Selecione uma ou digite uma chave única da mensagem.'
            : '/ indica que você deseja enviar uma mensagem rápida, mas nenhuma foi localizada. Cadastre ou apague a / e digite sua mensagem.'
          this.$notificarErro(error)
          this.loading = false
          throw new Error(error)
        }
      }
      let mensagem = this.textChat.trim()
      const username = localStorage.getItem('username')
      if (username && this.cSignEnabled) {
        mensagem = `*${username}*:\n ${mensagem}`
      }
      const message = {
        read: 1,
        fromMe: true,
        mediaUrl: '',
        body: mensagem,
        scheduleDate: this.isScheduleDate ? this.scheduleDate : null,
        quotedMsg: this.replyingMessage,
        idFront: uid()
      }
      if (this.isScheduleDate) {
        message.scheduleDate = this.scheduleDate
      }
      return message
    },
    async enviarMensagem () {
      if (this.isScheduleDate && !this.scheduleDate) {
        this.$notificarErro('Para agendar uma mensagem, informe o campo Data/Hora Agendamento.')
        return
      }
      this.loading = true
      const ticketId = this.ticketFocado.id
      const message = !this.cMostrarEnvioArquivo
        ? this.prepararMensagemTexto()
        : this.prepararUploadMedia()
      try {
        if (!this.cMostrarEnvioArquivo && !this.textChat) {
          this.loading = false
          return
        }
        await EnviarMensagemTexto(ticketId, message)
        this.arquivos = []
        this.textChat = ''
        this.$emit('update:replyingMessage', null)
        this.abrirFilePicker = false
        this.abrirModalPreviewImagem = false
        setTimeout(() => {
          this.scrollToBottom()
        }, 300)
      } catch (error) {
        this.isRecordingAudio = false
        this.loading = false
        this.$notificarErro('Ocorreu um erro!', error)
      }
      this.isRecordingAudio = false
      this.loading = false
      setTimeout(() => {
        this.$refs.inputEnvioMensagem.focus()
      }, 300)
    },
    async handlSendLinkVideo () {
      const link = `https://meet.jit.si/${uid()}/${uid()}`
      let mensagem = link
      const username = localStorage.getItem('username')
      if (username && this.cSignEnabled) {
        mensagem = `*${username}*:\n ${mensagem}`
      }
      const message = {
        read: 1,
        fromMe: true,
        mediaUrl: '',
        body: mensagem,
        scheduleDate: this.isScheduleDate ? this.scheduleDate : null,
        quotedMsg: this.replyingMessage,
        idFront: uid()
      }

      this.loading = true
      const ticketId = this.ticketFocado.id
      try {
        await EnviarMensagemTexto(ticketId, message)
        setTimeout(() => {
          this.scrollToBottom()
        }, 200)
        setTimeout(() => {
          window.open(link, '_blank')
        }, 800)
      } catch (error) {
        this.loading = false
        this.$notificarErro('Ocorreu um erro!', error)
      }
      this.loading = false
    },
    handlerInputMensagem (v) {
      if (!v || !v.target) return
      this.textChat = v.target.value
    },
    showModalPreviewImagem () {
      this.$nextTick(() => {
        setTimeout(() => {
          this.$refs.qbtnPasteEnvioMensagem.$el.focus()
        }, 20)
      })
    },
    hideModalPreviewImagem () {
      this.arquivos = []
      this.urlMediaPreview = {}
      this.abrirModalPreviewImagem = false
    },
    onRejectedFiles (rejectedEntries) {
      this.$q.notify({
        html: true,
        message: `Ops... Ocorreu um erro! <br>
        <ul>
          <li>Cada arquivo deve ter no máximo 100MB.</li>
          <li>Em caso de múltiplos arquivos, o tamanho total (soma de todos) deve ser de até 100MB.</li>
        </ul>`,
        type: 'negative',
        progress: true,
        position: 'top',
        actions: [{
          icon: 'close',
          round: true,
          color: 'white'
        }]
      })
    }
  },
  mounted () {
    this.$root.$on('mensagem-chat:focar-input-mensagem', () => this.$refs.inputEnvioMensagem.focus())
    const self = this
    window.addEventListener('paste', self.handleInputPaste)
  },
  beforeDestroy () {
    const self = this
    window.removeEventListener('paste', self.handleInputPaste)
  },
  destroyed () {
    this.$root.$off('mensagem-chat:focar-input-mensagem')
  }
}
</script>

<style lang="sass" scoped>
@media (max-width: 850px)
  .inputEnvioMensagem,
  .PickerFileMessage
    width: 150px

@media (min-width: 851px), (max-width: 1360px)
  .inputEnvioMensagem,
  .PickerFileMessage
    width: 200px !important
</style>

<style lang="sass">
.quick-message-menu
  max-width: min(90vw, 420px)
  max-height: 400px
  overflow: hidden
  display: flex
  flex-direction: column

.quick-message-list
  max-height: 360px
  overflow-y: auto
  overflow-x: hidden
  min-width: 120px

.quick-message-preview
  word-break: break-word
  overflow: hidden
  display: -webkit-box
  -webkit-line-clamp: 2
  -webkit-box-orient: vertical
  white-space: normal
  max-width: 100%

.quick-message-tooltip
  max-width: 320px
  word-break: break-word
  white-space: normal
</style>
