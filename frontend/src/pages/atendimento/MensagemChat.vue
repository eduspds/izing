<template>
  <div class="q-pa-md">
    <transition-group appear
      enter-active-class="animated fadeIn"
      leave-active-class="animated fadeOut">
      <div v-for="(mensagem, index) in mensagens" :key="mensagem.id">
        <hr v-if="isLineDate"
          class="hr-text q-mt-lg q-mb-md"
          :data-content="formatarData(mensagem.createdAt)"
          v-show="index === 0 || formatarData(mensagem.createdAt) !== formatarData(mensagens[index - 1].createdAt)">
        <template v-if="mensagens.length && index === mensagens.length - 1">
          <div ref="lastMessageRef" id="lastMessageRef"
            style="float: left; background: black; clear: both;" />
        </template>
        <div :id="`chat-message-${mensagem.id}`" />
        <q-chat-message
          :key="mensagem._renderKey || mensagem.id"
          :stamp="getStampWithLock(mensagem)"
          :sent="mensagem.fromMe"
          class="text-weight-medium"
          :bg-color="mensagem.fromMe ? 'grey-2' : $q.dark.isActive ? 'blue-2' : 'blue-1'"
          :class="{
            pulseIdentications: identificarMensagem == `chat-message-${mensagem.id}`,
            'message-confidential': mensagem.isConfidential
          }"
          :data-confidential="mensagem.isConfidential">
          <!-- :bg-color="mensagem.fromMe ? 'grey-2' : 'secondary' " -->
          <div style="min-width: 100px; max-width: 350px;"
            :style="mensagem.isDeleted ? 'color: rgba(0, 0, 0, 0.36) !important;' : ''">
            <div v-if=" isMessageEdited(mensagem) "
              class="text-caption text-grey-6 q-mb-xs"
              style="font-style: italic;">
              Mensagem editada <q-icon name="mdi-pencil" size="0.8em" class="q-ml-xs" />
            </div>
            <q-checkbox v-if="ativarMultiEncaminhamento"
              :key="`cheked-chat-message-${mensagem.id}`"
              :class="{
                  'absolute-top-right checkbox-encaminhar-right': !mensagem.fromMe,
                  'absolute-top-left checkbox-encaminhar-left': mensagem.fromMe
                }"
              :ref="`box-chat-message-${mensagem.id}`"
              @click.native="verificarEncaminharMensagem(mensagem)"
              :value="false" />

            <q-icon class="q-ma-xs"
              name="mdi-calendar"
              size="18px"
              :class="{
                  'text-primary': mensagem.scheduleDate && mensagem.status === 'pending',
                  'text-positive': !['pending', 'canceled'].includes(mensagem.status)
                }"
              v-if="mensagem.scheduleDate">
              <q-tooltip content-class="bg-secondary text-grey-8">
                <div class="row col">
                  Mensagem agendada
                </div>
                <div class="row col"
                  v-if="mensagem.isDeleted">
                  <q-chip color="red-3"
                    icon="mdi-trash-can-outline">
                    Envio cancelado: {{ formatarData(mensagem.updatedAt, 'dd/MM/yyyy') }}
                  </q-chip>
                </div>
                <div class="row col">
                  <q-chip color="blue-1"
                    icon="mdi-calendar-import">
                    Criado em: {{ formatarData(mensagem.createdAt, 'dd/MM/yyyy HH:mm') }}
                  </q-chip>
                </div>
                <div class="row col">
                  <q-chip color="blue-1"
                    icon="mdi-calendar-start">
                    Programado para: {{ formatarData(mensagem.scheduleDate, 'dd/MM/yyyy HH:mm') }}
                  </q-chip>
                </div>
              </q-tooltip>
            </q-icon>
            <div v-if="mensagem.isDeleted"
              class="text-italic">
              Mensagem apagada para todos em {{ formatarData(mensagem.updatedAt, 'dd/MM/yyyy') }}.
            </div>
            <div v-if="isGroupLabel(mensagem)"
              class="q-mb-sm"
              style="display: flex; color: rgb(59 23 251); font-weight: 500;">
              {{ isGroupLabel(mensagem) }}
            </div>
            <div v-if="mensagem.quotedMsg"
              :class="{ 'textContentItem': !mensagem.isDeleted, 'textContentItemDeleted': mensagem.isDeleted }">
              <MensagemRespondida style="max-width: 240px; max-height: 150px"
                class="row justify-center"
                @mensagem-respondida:focar-mensagem="f
                                                                                                                carMensagem"
                :mensagem="mensagem.quotedMsg" />
            </div>
            <q-btn v-if=" !mensagem.isDeleted && isShowOptions "
              class="absolute-top-right mostar-btn-opcoes-chat"
              dense
              flat
              ripple
              round
              icon="mdi-chevron-down"
              @mouseenter="onButtonHover"
              @mouseleave="onButtonLeave">
              <q-menu square
                auto-close
                anchor="bottom right"
                self="top right"
                :offset="[0, 5]"
                :delay="100"
                :hide-delay="200">
                <q-list style="min-width: 100px">
                  <q-item :disable=" !['whatsapp', 'telegram'].includes(ticketFocado.channel) "
                    clickable
                    @click=" citarMensagem(mensagem) ">
                    <q-item-section>Responder</q-item-section>
                    <q-tooltip v-if=" !['whatsapp', 'telegram'].includes(ticketFocado.channel) ">
                      Disponível apenas para WhatsApp e Telegram
                    </q-tooltip>
                  </q-item>
                  <q-item @click=" editarMensagem(mensagem) "
                    clickable
                    v-if=" mensagem.fromMe && (!mensagem.mediaType || mensagem.mediaType === 'chat') "
                    :disable=" isDesactivateEdit(mensagem) || !['whatsapp', 'telegram'].includes(ticketFocado.channel) ">
                    <q-item-section>
                      <q-item-label>Editar</q-item-label>
                    </q-item-section>
                    <q-tooltip v-if=" !['whatsapp', 'telegram'].includes(ticketFocado.channel) ">
                      Disponível apenas para WhatsApp e Telegram
                    </q-tooltip>
                  </q-item>
                  <q-item clickable
                    @click=" encaminharMensagem(mensagem) ">
                    <q-item-section>Encaminhar</q-item-section>
                  </q-item>
                  <q-item clickable
                    @click=" marcarMensagensParaEncaminhar(mensagem) ">
                    <q-item-section>Marcar (encaminhar várias)</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item @click=" deletarMensagem(mensagem) "
                    clickable
                    v-if=" mensagem.fromMe "
                    :disable=" isDesactivatDelete(mensagem) || ticketFocado.channel === 'messenger' ">
                    <q-item-section>
                      <q-item-label>Deletar</q-item-label>
                      <!-- <q-item-label caption>
                        Apagará mensagem: {{ isDesactivatDelete(mensagem) ? 'PARA TODOS' : 'PARAM MIN' }}
                      </q-item-label> -->
                      <!-- <q-tooltip :delay="500"
                        content-class="text-black bg-red-3 text-body1">
                        * Após 5 min do envio, não será possível apagar a mensagem. <br>
                        ** Não está disponível para Messenger.
                      </q-tooltip> -->
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
            <q-icon v-if=" mensagem.fromMe "
              class="absolute-bottom-right q-pr-xs q-pb-xs"
              :name=" ackIcons[mensagem.ack] "
              size="1.2em"
              :color=" mensagem.ack >= 3 ? 'blue-12' : '' " />
            <template v-if=" mensagem.mediaType === 'audio' ">
              <div style="width: 330px; height: fit-content">
                <audio class="q-mt-md full-width"
                  controls
                  ref="audioMessage"
                  controlsList="nodownload noplaybackrate volume novolume"
                  preload="metadata">
                  <source :src=" getMediaUrl(mensagem) " type="audio/mpeg">
                  <source :src=" getMediaUrl(mensagem) " type="audio/ogg">
                  <source :src=" getMediaUrl(mensagem) " type="audio/mp3">
                  <source :src=" getMediaUrl(mensagem) " type="audio/webm">
                  <source :src=" getMediaUrl(mensagem) " type="audio/wav">
                  Seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            </template>
            <template v-if=" mensagem.mediaType === 'vcard' ">
              <q-btn type="a"
                :color=" $q.dark.isActive ? '' : 'black' "
                outline
                dense
                class="q-px-sm text-center btn-rounded "
                download="vCard"
                :href=" `data:text/x-vcard;charset=utf-8;base64,${returnCardContato(mensagem.body)}` ">
                Download Contato
              </q-btn>
            </template>
            <template v-if=" mensagem.mediaType === 'image' ">
              <!-- @click="buscarImageCors(mensagem.mediaUrl)" -->
              <q-img @click=" urlMedia = getMediaUrl(mensagem); abrirModalImagem = true "
                :src=" getMediaUrl(mensagem) "
                spinner-color="primary"
                height="150px"
                width="330px"
                class="q-mt-md"
                style="cursor: pointer;" />
              <VueEasyLightbox moveDisabled
                :visible=" abrirModalImagem "
                :imgs=" urlMedia "
                :index=" mensagem.ticketId || 1 "
                @hide=" abrirModalImagem = false " />
            </template>
            <template v-if=" mensagem.mediaType === 'video' ">
              <video :src=" getMediaUrl(mensagem) "
                controls
                class="q-mt-md"
                style="object-fit: cover;
                  width: 330px;
                  height: 150px;
                  border-top-left-radius: 8px;
                  border-top-right-radius: 8px;
                  border-bottom-left-radius: 8px;
                  border-bottom-right-radius: 8px;
                " >
                </video>
            </template>
            <template v-if=" !['audio', 'vcard', 'image', 'video'].includes(mensagem.mediaType) && mensagem.mediaUrl ">
              <div class="text-center full-width hide-scrollbar no-scroll">
                <div class="pdf-viewer-container">
                  <div class="pdf-iframe-wrapper">
                    <iframe v-if=" isPDF(getMediaUrl(mensagem)) "
                      frameBorder="0"
                      scrolling="auto"
                      style="
                        width: 330px;
                        height: 400px;
                        overflow-y: auto;
                        -ms-overflow-y: auto;
                      "
                      class="pdf-viewer-iframe no-scroll hide-scrollbar"
                      :src="`https://docs.google.com/viewer?url=${encodeURIComponent(getMediaUrl(mensagem))}&embedded=true`"
                      id="frame-pdf"
                      @click="abrirPdfTelaCheia(getMediaUrl(mensagem))"
                      @contextmenu="baixarPdf(getMediaUrl(mensagem), mensagem.mediaName || 'documento.pdf', $event)">
                    </iframe>

                  </div>
                  <div class="pdf-fallback" v-if="!isPDF(getMediaUrl(mensagem))">
                    <q-icon name="mdi-file-document-outline" size="48px" />
                    <p>Documento anexo</p>
                    <p style="font-size: 12px;">Use o botão abaixo para baixar o arquivo</p>
                  </div>

                  <!-- Botão de tela cheia para PDFs -->
                  <div v-if="isPDF(getMediaUrl(mensagem))" class="pdf-controls q-mt-sm">
                    <q-btn
                      color="primary"
                      dense
                      class="btn-rounded pdf-fullscreen-btn"
                      @click.stop="abrirPdfTelaCheia(getMediaUrl(mensagem))">
                      <q-icon name="mdi-open-in-new" class="q-mr-xs" />
                      Abrir em nova aba
                    </q-btn>
                  </div>
                </div>
                <q-btn v-if="!isPDF(getMediaUrl(mensagem))"
                  type="a"
                  :color=" $q.dark.isActive ? '' : 'grey-3' "
                  no-wrap
                  no-caps
                  stack
                  dense
                  class="q-mt-sm text-center text-black btn-rounded  text-grey-9 ellipsis"
                  download
                  :href=" getMediaUrl(mensagem) ">
                  <q-tooltip v-if=" getMediaUrl(mensagem) "
                    content-class="text-bold">
                    Baixar arquivo: {{ mensagem.mediaName }}
                    {{ mensagem.body }}
                  </q-tooltip>
                  <div class="row items-center q-ma-xs ">
                    <div class="ellipsis col-grow q-pr-sm"
                      style="max-width: 290px">
                      {{ farmatarMensagemWhatsapp(mensagem.body || mensagem.mediaName) }}
                    </div>
                    <q-icon name="mdi-download" />
                  </div>
                </q-btn>
              </div>
              <!-- <q-btn
                type="a"
                color="primary"
                outline
                dense
                class="q-px-sm text-center"
                target="_blank"
                :href="`http://docs.google.com/gview?url=${mensagem.mediaUrl}&embedded=true`"
              >
                Visualizar
              </q-btn> -->
            </template>
            <div v-linkified
              v-if=" !['vcard', 'application', 'audio'].includes(mensagem.mediaType) "
              :class=" { 'q-mt-sm': mensagem.mediaType !== 'chat' } "
              class="q-message-container row items-end no-wrap">
              <div class="col-grow">
                <div v-html=" farmatarMensagemWhatsapp(mensagem.body) ">
                </div>
              </div>
            </div>
          </div>
        </q-chat-message>
      </div>
    </transition-group>
  </div>
</template>

<script>
import mixinCommon from './mixinCommon'
import axios from 'axios'
import VueEasyLightbox from 'vue-easy-lightbox'
import MensagemRespondida from './MensagemRespondida'
import { getApiBaseUrl } from 'src/config/apiUrl'
const downloadImageCors = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  headers: {
    responseType: 'blob'
  }
})
import { DeletarMensagem, EditarMensagem } from 'src/service/tickets'
import { Base64 } from 'js-base64'
export default {
  name: 'MensagemChat',
  mixins: [mixinCommon],
  props: {
    mensagens: {
      type: Array,
      default: () => []
    },
    mensagensParaEncaminhar: {
      type: Array,
      default: () => []
    },
    size: {
      type: [String, Number],
      default: '5'
    },
    isLineDate: {
      type: Boolean,
      default: true
    },
    isShowOptions: {
      type: Boolean,
      default: true
    },
    ativarMultiEncaminhamento: {
      type: Boolean,
      default: false
    },
    replyingMessage: {
      type: Object,
      default: () => { }
    }
  },
  data () {
    return {
      abrirModalImagem: false,
      urlMedia: '',
      identificarMensagem: null,
      ackIcons: { // Se ACK == 3 ou 4 entao color green
        0: 'mdi-clock-outline',
        1: 'mdi-check',
        2: 'mdi-check-all',
        3: 'mdi-check-all',
        4: 'mdi-check-all'
      }
    }
  },
  components: {
    VueEasyLightbox,
    MensagemRespondida
  },
  methods: {
    onButtonHover () {
      // Manter o botão visível durante o hover
      this.$nextTick(() => {
        const button = event.target.closest('.mostar-btn-opcoes-chat')
        if (button) {
          button.style.opacity = '1'
          button.style.visibility = 'visible'
          button.style.pointerEvents = 'auto'
        }
      })
    },
    onButtonLeave () {
      // Pequeno delay para permitir transição para o menu
      setTimeout(() => {
        const button = event.target.closest('.mostar-btn-opcoes-chat')
        if (button && !button.matches(':hover')) {
          button.style.opacity = '0'
          button.style.visibility = 'hidden'
          button.style.pointerEvents = 'none'
        }
      }, 100)
    },
    verificarEncaminharMensagem (mensagem) {
      const mensagens = [...this.mensagensParaEncaminhar]
      const msgIdx = mensagens.findIndex(m => m.id === mensagem.id)
      if (msgIdx !== -1) {
        mensagens.splice(msgIdx, 1)
      } else {
        if (this.mensagensParaEncaminhar.length > 9) {
          this.$notificarErro('Permitido no máximo 10 mensagens.')
          return
        }
        mensagens.push(mensagem)
      }
      this.$refs[`box-chat-message-${mensagem.id}`][0].value = !this.$refs[`box-chat-message-${mensagem.id}`][0].value
      this.$emit('update:mensagensParaEncaminhar', mensagens)
    },
    marcarMensagensParaEncaminhar (mensagem) {
      this.$emit('update:mensagensParaEncaminhar', [])
      this.$emit('update:ativarMultiEncaminhamento', !this.ativarMultiEncaminhamento)
      // this.verificarEncaminharMensagem(mensagem)
    },
    /** URL absoluta do anexo (backend). Se a API retornar path relativo (/public/...), usa base da API. */
    getMediaUrl (mensagem) {
      const url = mensagem?.mediaUrl
      if (!url) return ''
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      const base = getApiBaseUrl().replace(/\/$/, '')
      return url.startsWith('/') ? base + url : base + '/' + url
    },
    isPDF (url) {
      if (!url) return false
      const split = url.split('.')
      const ext = split[split.length - 1]
      return ext === 'pdf'
    },
    isGroupLabel (mensagem) {
      try {
        return this.ticketFocado.isGroup ? mensagem.contact.name : ''
      } catch (error) {
        return ''
      }
    },
    // cUrlMediaCors () {
    //   return this.urlMedia
    // },
    returnCardContato (str) {
      // return btoa(str)
      return Base64.encode(str)
    },
    isDesactivatDelete (msg) {
      // if (msg) {
      //   return (differenceInMinutes(new Date(), new Date(+msg.timestamp)) > 5)
      // }
      return false
    },
    isDesactivateEdit (mensagem) {
      const diffData = new Date() - new Date(mensagem.createdAt)
      const minutos = Math.floor((diffData % 86400000) / 60000)
      // WhatsApp permite editar até 15 minutos após envio
      if (minutos > 15) return true
      return false
    },
    isMessageEdited (mensagem) {
      // Verifica se a mensagem foi marcada como editada no banco de dados
      return mensagem.isEdited === true
    },
    getStampWithLock (mensagem) {
      return this.dataInWords(mensagem.createdAt)
    },
    async buscarImageCors (imageUrl) {
      this.loading = true
      try {
        const { data, headers } = await downloadImageCors.get(imageUrl, {
          responseType: 'blob'
        })
        const url = window.URL.createObjectURL(
          new Blob([data], { type: headers['content-type'] })
        )
        this.urlMedia = url
        this.abrirModalImagem = true
      } catch (error) {
        this.$notificarErro('Ocorreu um erro!', error)
      }
      this.loading = false
    },
    citarMensagem (mensagem) {
      this.$emit('update:replyingMessage', mensagem)
      this.$root.$emit('mensagem-chat:focar-input-mensagem', mensagem)
    },
    encaminharMensagem (mensagem) {
      this.$emit('mensagem-chat:encaminhar-mensagem', mensagem)
    },
    editarMensagem (mensagem) {
      if (this.isDesactivateEdit(mensagem)) {
        this.$notificarErro('Não foi possível editar mensagem com mais de 15min do envio.')
        return
      }

      this.$q.dialog({
        title: 'Editar Mensagem',
        message: 'Digite o novo texto da mensagem:',
        prompt: {
          model: mensagem.body,
          type: 'textarea',
          filled: true
        },
        cancel: {
          label: 'Cancelar',
          color: 'primary',
          push: true,
          flat: true
        },
        ok: {
          label: 'Salvar',
          color: 'primary',
          push: true
        },
        persistent: true
      }).onOk(newBody => {
        if (!newBody || newBody.trim() === '') {
          this.$notificarErro('A mensagem não pode estar vazia.')
          return
        }

        this.loading = true
        const data = {
          ...mensagem,
          newBody: newBody.trim()
        }

        EditarMensagem(data)
          .then(res => {
            this.loading = false
            this.$q.notify({
              type: 'positive',
              message: 'Mensagem editada com sucesso!',
              position: 'top',
              timeout: 2000
            })
          })
          .catch(error => {
            this.loading = false
            console.error(error)
            this.$notificarErro('Não foi possível editar a mensagem', error)
          })
      })
    },
    deletarMensagem (mensagem) {
      if (this.isDesactivatDelete(mensagem)) {
        this.$notificarErro('Não foi possível apagar mensagem com mais de 5min do envio.')
      }
      // const diffHoursDate = differenceInHours(
      //   new Date(),
      //   parseJSON(mensagem.createdAt)
      // )
      // if (diffHoursDate > 2) {
      //   // throw new AppError("No delete message afeter 2h sended");
      // }
      const data = { ...mensagem }
      this.$q.dialog({
        title: 'Atenção!! Deseja realmente deletar a mensagem? ',
        message: 'Mensagens antigas não serão apagadas no cliente.',
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
        DeletarMensagem(data)
          .then(res => {
            this.loading = false
          })
          .catch(error => {
            this.loading = false
            console.error(error)
            this.$notificarErro('Não foi possível apagar a mensagem', error)
          })
      }).onCancel(() => {
      })
    },
    focarMensagem (mensagem) {
      const id = `chat-message-${mensagem.id}`
      this.identificarMensagem = id
      this.$nextTick(() => {
        const elem = document.getElementById(id)
        elem.scrollIntoView()
      })
      setTimeout(() => {
        this.identificarMensagem = null
      }, 5000)
    },
    abrirPdfTelaCheia (url) {
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    baixarPdf (url, filename, event) {
      if (!url) return

      // Previne o menu de contexto padrão
      if (event) {
        event.preventDefault()
      }

      // Cria link para download
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'documento.pdf'
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      this.$q.notify({
        type: 'positive',
        message: 'Download iniciado!',
        position: 'top',
        timeout: 2000
      })
    }
  },
  mounted () {
    this.scrollToBottom()
    // this.$refs.audioMessage.forEach(element => {
    //   element.playbackRate = 2
    // })
  },
  destroyed () {
  }
}
</script>

<style lang="scss">
.frame-pdf {
  overflow: hidden;
}

.pdf-viewer-container {
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  margin: 8px 0;
}

.pdf-viewer-iframe {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.pdf-fallback {
  padding: 20px;
  text-align: center;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 8px 0;
}

.pdf-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px;
  background: rgba(25, 118, 210, 0.05);
  border-radius: 8px;
  margin-top: 8px;
}

.pdf-fullscreen-btn {
  background: linear-gradient(135deg, #1976d2, #2196f3) !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3) !important;
  transition: all 0.3s ease !important;
}

.pdf-fullscreen-btn:hover {
  background: linear-gradient(135deg, #1565c0, #1976d2) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4) !important;
}

.pdf-iframe-wrapper {
  position: relative;
  display: inline-block;
}

.pdf-overlay-hint {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 10;
}

.pdf-iframe-wrapper:hover .pdf-overlay-hint {
  opacity: 1;
}

.checkbox-encaminhar-right {
  right: -35px;
  z-index: 99999;
}

.checkbox-encaminhar-left {
  left: -35px;
  z-index: 99999;
}

/* Ícone de cadeado para mensagens sigilosas */
.message-confidential .q-message__stamp {
  position: relative;
  padding-left: 18px;
}

.message-confidential .q-message__stamp::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
</style>
