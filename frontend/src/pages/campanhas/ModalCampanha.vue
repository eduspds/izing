<template>
  <q-dialog persistent
    :value="modalCampanha"
    @hide="fecharModal"
    @show="abrirModal"
    :maximized="$q.screen.lt.md"
    :full-width="$q.screen.lt.lg"
    :full-height="$q.screen.lt.lg">
    <q-card class="modern-modal">
      <!-- Header Moderno -->
      <q-card-section class="modal-header">
        <div class="header-content">
          <div class="header-title">
            <q-icon :name="campanhaEdicao.id ? 'mdi-pencil' : 'mdi-plus-circle'"
              size="md"
              class="q-mr-sm" />
            <span class="text-h5 text-weight-bold">
              {{ campanhaEdicao.id ? 'Editar' : 'Criar' }} Campanha
            </span>
          </div>
          <q-btn
            flat
            round
            icon="mdi-close"
            @click="fecharModal"
            class="close-btn" />
        </div>

        <div class="header-subtitle">
          <q-icon name="mdi-clock-outline" size="sm" class="q-mr-xs" />
          As mensagens sempre serão enviadas em horário comercial e dias úteis
        </div>

        <!-- Aviso de Contatos Vinculados -->
        <q-banner v-if="campanhaEdicao._hasExistingContacts"
          class="modern-banner bg-gradient-green"
          rounded
          clickable
          @click="verContatosVinculados">
          <template v-slot:avatar>
            <q-avatar color="white" text-color="green" size="sm">
              <q-icon name="mdi-account-check" />
            </q-avatar>
          </template>
          <div class="banner-content">
            <div class="text-weight-bold text-white">
              Esta campanha possui {{ campanhaEdicao._existingContacts.length }} contato(s) já vinculado(s)
            </div>
            <div class="text-caption text-white-7">
              Os contatos serão mantidos. Você pode adicionar mais ou continuar com os mesmos.
            </div>
          </div>
          <template v-slot:action>
            <q-btn flat
              color="white"
              icon="mdi-eye"
              label="Ver Lista"
              size="sm"
              class="banner-btn" />
          </template>
        </q-banner>
      </q-card-section>

      <!-- Campos principais -->
      <q-card-section class="form-section">
        <div class="form-grid">
          <!-- Nome da Campanha -->
          <div class="form-field full-width">
            <q-input class="modern-input required"
              outlined
              v-model="campanha.name"
              label="Nome da Campanha"
              @blur="$v.campanha.name.$touch"
              :error="$v.campanha.name.$error"
              error-message="Obrigatório">
              <template v-slot:prepend>
                <q-icon name="mdi-format-title" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Data e Hora -->
          <div class="form-field">
            <q-input class="modern-input"
              outlined
              v-model="campanhaStartFormatted"
              label="Data e Hora de Início"
              @blur="$v.campanha.start.$touch"
              :error="$v.campanha.start.$error"
              error-message="Não pode ser inferior ao dia atual"
              mask="##/##/#### ##:##"
              fill-mask
              hint="DD/MM/YYYY HH:mm">
              <template v-slot:prepend>
                <q-icon name="mdi-calendar-clock" color="primary" />
              </template>
              <template v-slot:append>
                <q-icon name="mdi-calendar" class="cursor-pointer">
                  <q-popup-proxy transition-show="scale" transition-hide="scale">
                    <q-date v-model="campanha.start"
                      mask="YYYY-MM-DDTHH:mm:ss"
                      :options="dateOptions">
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="OK" color="primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
                <q-icon name="mdi-clock" class="cursor-pointer q-ml-xs">
                  <q-popup-proxy transition-show="scale" transition-hide="scale">
                    <q-time v-model="campanha.start"
                      mask="YYYY-MM-DDTHH:mm:ss"
                      format24h>
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="OK" color="primary" flat />
                      </div>
                    </q-time>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>

          <!-- Enviar por -->
          <div class="form-field">
            <q-select class="modern-input required"
              outlined
              emit-value
              map-options
              label="Enviar por"
              color="primary"
              v-model="campanha.sessionId"
              :options="cSessions"
              :input-debounce="700"
              option-value="id"
              option-label="name"
              @blur="$v.campanha.sessionId.$touch"
              :error="$v.campanha.sessionId.$error"
              error-message="Obrigatório">
              <template v-slot:prepend>
                <q-icon name="mdi-whatsapp" color="primary" />
              </template>
            </q-select>
          </div>

          <!-- Delay -->
          <div class="form-field small">
            <q-input class="modern-input"
              outlined
              v-model.number="campanha.delay"
              type="number"
              label="Delay"
              suffix="segundos"
              hint="Intervalo entre envios">
              <template v-slot:prepend>
                <q-icon name="mdi-timer" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Mídia -->
          <div class="form-field full-width">
            <q-file v-if="!campanha.mediaUrl"
              class="modern-file"
              :loading="loading"
              label="Mídia composição mensagem (opcional)"
              ref="PickerFileMessage"
              v-model="arquivos"
              outlined
              clearable
              :max-files="1"
              :max-file-size="10485760"
              accept=".jpg, .png, image/jpeg, .pdf, .doc, .docx, .mp4, .jpeg, image/*"
              @rejected="onRejectedFiles">
              <template v-slot:prepend>
                <q-icon name="mdi-attachment" color="primary" />
              </template>
            </q-file>
            <q-input v-if="campanha.mediaUrl"
              class="modern-input"
              readonly
              label="Mídia composição mensagem"
              :value="cArquivoName"
              outlined>
              <template v-slot:prepend>
                <q-icon name="mdi-file" color="primary" />
              </template>
              <template v-slot:append>
                <q-btn round dense flat icon="mdi-close" @click="campanha.mediaUrl = null; arquivos = []" />
              </template>
            </q-input>
          </div>
        </div>

        <!-- Seção de Importação -->
        <div class="import-section">
          <div class="import-header">
            <q-icon name="mdi-database-import" size="sm" class="q-mr-sm" />
            <span class="text-subtitle1 text-weight-bold">Importação de Dados</span>
          </div>

          <div class="import-actions">
            <q-btn color="primary"
              icon="mdi-file-excel"
              label="Importar XLSX"
              rounded
              @click="handleImportXLSX"
              class="import-btn" />

            <div class="import-chips">
              <q-chip v-if="customVariables.length > 0"
                color="green"
                text-color="white"
                icon="mdi-variable"
                class="modern-chip">
                {{ customVariables.length }} variáveis
              </q-chip>
              <q-chip v-if="importedContacts.length > 0"
                color="blue"
                text-color="white"
                icon="mdi-account-multiple"
                class="modern-chip">
                {{ importedContacts.length }} contatos
              </q-chip>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Mensagens Dinâmicas -->
      <q-card-section class="messages-section">
        <div class="messages-container">
          <!-- Coluna Mensagens -->
          <div class="messages-column">
            <div class="section-header">
              <q-icon name="mdi-message-text" size="md" class="q-mr-sm" />
              <span class="text-h6 text-weight-bold">Mensagens da Campanha</span>
            </div>

            <!-- Mensagem dinâmica -->
            <div v-for="(msg, idx) in messages"
              :key="idx"
              class="message-card">
              <div class="message-header">
                <div class="message-title">
                  <q-icon name="mdi-message" size="sm" class="q-mr-xs" />
                  <span class="text-subtitle1 text-weight-bold">{{ idx + 1 }}ª Mensagem</span>
                </div>
                <div class="message-actions">
                  <!-- Botão Emoji -->
                  <q-btn round flat size="sm" class="action-btn">
                    <q-icon name="mdi-emoticon-happy-outline" />
                    <q-tooltip>Emoji</q-tooltip>
                    <q-menu>
                      <VEmojiPicker style="width: 40vw"
                        :showSearch="false"
                        :emojisByRow="20"
                        labelSearch="Localizar..."
                        lang="pt-BR"
                        @select="(v) => onInsertSelectEmoji(v, idx)" />
                    </q-menu>
                  </q-btn>

                  <!-- Botão Variáveis -->
                  <q-btn round flat size="sm" class="action-btn">
                    <q-icon name="mdi-variable-box" />
                    <q-tooltip>Variáveis</q-tooltip>
                    <q-menu>
                      <q-list dense style="min-width: 200px">
                        <q-item-label header>Variável Padrão</q-item-label>
                        <q-item clickable @click="onInsertSelectVariable('{{name}}', idx)" v-close-popup>
                          <q-item-section>Nome do Contato</q-item-section>
                        </q-item>

                        <q-separator v-if="customVariables.length > 0" />

                        <q-item-label v-if="customVariables.length > 0" header>Variáveis Importadas</q-item-label>
                        <q-item v-for="variavel in customVariables"
                          :key="variavel.label"
                          clickable
                          @click="onInsertSelectVariable(variavel.value, idx)"
                          v-close-popup>
                          <q-item-section>
                            <q-item-label>{{ variavel.label }}</q-item-label>
                            <q-item-label caption>{{ variavel.value }}</q-item-label>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>

                  <!-- Botão Remover -->
                  <q-btn v-if="messages.length > 1"
                    round
                    flat
                    size="sm"
                    color="negative"
                    icon="mdi-delete"
                    class="action-btn"
                    @click="removeMessage(idx)">
                    <q-tooltip>Remover mensagem</q-tooltip>
                  </q-btn>
                </div>
              </div>

              <div class="message-content">
                <textarea :ref="`message${idx}`"
                  class="modern-textarea"
                  :class="{
                    'error-state': idx === 0 && $v.campanha.message1.$error
                  }"
                  @blur="idx === 0 && $v.campanha.message1.$touch()"
                  placeholder="Digite a mensagem aqui..."
                  @input="(v) => updateMessage(idx, v.target.value)"
                  :value="msg.content" />
              </div>
            </div>

            <!-- Botão Adicionar Mensagem -->
            <q-btn v-if="messages.length < 3"
              color="primary"
              outline
              icon="mdi-plus"
              label="Adicionar Mensagem"
              @click="addMessage"
              class="add-message-btn" />
          </div>

          <!-- Coluna Preview e Contatos -->
          <div class="preview-column">
            <!-- Preview -->
            <div class="preview-card">
              <div class="preview-header">
                <q-icon name="mdi-eye" size="sm" class="q-mr-sm" />
                <span class="text-subtitle1 text-weight-bold">Pré-visualização</span>
              </div>
              <div class="preview-content">
                <q-option-group v-if="messages.length > 1"
                  class="preview-selector"
                  inline
                  dense
                  v-model="messagemPreview"
                  :options="optRadio"
                  color="primary" />
                <div class="phone-preview">
                  <cMolduraCelular class="phone-frame" :key="cKey">
                    <MensagemChat :isLineDate="false"
                      size="8"
                      class="full-width"
                      :mensagens="cMessages" />
                  </cMolduraCelular>
                </div>
              </div>
            </div>

            <!-- Contatos Importados -->
            <div v-if="importedContacts.length > 0" class="contacts-card">
              <div class="contacts-header">
                <q-icon name="mdi-account-multiple" size="sm" class="q-mr-sm" />
                <span class="text-subtitle1 text-weight-bold">
                  Contatos Importados ({{ importedContacts.length }})
                </span>
              </div>
              <div class="contacts-content">
                <q-list dense class="contacts-list">
                  <q-item v-for="(contact, idx) in importedContacts.slice(0, 50)"
                    :key="idx"
                    class="contact-item">
                    <q-item-section avatar>
                      <q-avatar color="primary" text-color="white" size="sm">
                        {{ contact.name.charAt(0).toUpperCase() }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="contact-name">{{ contact.name }}</q-item-label>
                      <q-item-label caption class="contact-number">{{ formatPhoneDisplay(contact.number) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-if="importedContacts.length > 50" class="more-contacts">
                  <q-icon name="mdi-dots-horizontal" size="sm" class="q-mr-xs" />
                  ... e mais {{ importedContacts.length - 50 }} contatos
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-section class="actions-section">
        <div class="actions-container">
          <q-btn label="Cancelar"
            color="negative"
            outline
            icon="mdi-close"
            v-close-popup
            class="action-btn cancel-btn" />
          <q-btn label="Salvar Campanha"
            color="positive"
            icon="mdi-content-save"
            @click="handleCampanha"
            :loading="loading"
            class="action-btn save-btn" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Modal Preview Variáveis e Contatos -->
    <q-dialog v-model="modalPreviewImport" persistent>
      <q-card style="min-width: 70vw; max-width: 90vw;">
        <q-card-section class="row items-center text-white"
          :class="campanhaEdicao._hasExistingContacts ? 'bg-green' : 'bg-primary'">
          <q-icon :name="campanhaEdicao._hasExistingContacts ? 'mdi-account-multiple' : 'mdi-file-excel'"
            size="sm" class="q-mr-sm" />
          <div class="text-h6">
            {{ campanhaEdicao._hasExistingContacts ? 'Contatos Vinculados à Campanha' : 'Dados Importados do XLSX' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense @click="modalPreviewImport = false" />
        </q-card-section>

        <q-card-section>
          <q-tabs v-model="activeTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="justify">
            <q-tab name="contacts" label="Contatos" icon="mdi-account-multiple" />
            <q-tab name="variables" label="Variáveis" icon="mdi-variable" />
            <q-tab name="preview" label="Dados Completos" icon="mdi-table" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="activeTab" animated>
            <!-- Aba Contatos -->
            <q-tab-panel name="contacts">
              <div class="q-pa-sm">
                <q-chip color="primary" text-color="white" icon="mdi-account-check">
                  {{ tempContacts.length }} contatos encontrados
                </q-chip>
              </div>
              <q-table :data="tempContacts"
                :columns="contactsColumns"
                row-key="number"
                :pagination.sync="contactsPagination"
                flat
                bordered>
                <template v-slot:body-cell-avatar="props">
                  <q-td :props="props">
                    <q-avatar color="primary" text-color="white" size="sm">
                      {{ props.row.name.charAt(0).toUpperCase() }}
                    </q-avatar>
                  </q-td>
                </template>
              </q-table>
            </q-tab-panel>

            <!-- Aba Variáveis -->
            <q-tab-panel name="variables">
              <div class="q-pa-sm">
                <q-chip color="secondary" text-color="white" icon="mdi-variable">
                  {{ tempVariables.length }} variáveis encontradas
                </q-chip>
              </div>
              <q-list bordered separator>
                <q-item v-for="variable in tempVariables" :key="variable.label">
                  <q-item-section avatar>
                    <q-icon name="mdi-code-braces" color="secondary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ variable.label }}</q-item-label>
                    <q-item-label caption>Use: {{ variable.value }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-tab-panel>

            <!-- Aba Preview Dados -->
            <q-tab-panel name="preview">
              <div class="q-pa-sm">
                <q-chip color="info" text-color="white" icon="mdi-database">
                  {{ tempVariablesData.length }} registros
                </q-chip>
              </div>
              <q-table :data="tempVariablesData"
                :columns="variablesDataColumns"
                row-key="numero"
                :pagination.sync="variablesPagination"
                flat
                bordered
                dense />
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>

        <q-card-actions align="right">
          <!-- Botões para importação normal -->
          <template v-if="!campanhaEdicao._hasExistingContacts">
            <q-btn label="Cancelar" color="negative" @click="cancelImport" rounded />
            <q-btn label="Confirmar Importação"
              color="positive"
              @click="confirmImport"
              rounded />
          </template>

          <!-- Botão para apenas visualização -->
          <template v-else>
            <q-btn label="Fechar"
              color="primary"
              @click="modalPreviewImport = false"
              rounded
              icon="mdi-check" />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script>
import { required } from 'vuelidate/lib/validators'
import { VEmojiPicker } from 'v-emoji-picker'
import cMolduraCelular from 'src/components/cMolduraCelular'
import MensagemChat from 'src/pages/atendimento/MensagemChat'
import { mapGetters } from 'vuex'
import { CriarCampanha, AlterarCampanha } from 'src/service/campanhas'
import { parseISO, startOfDay, format } from 'date-fns'
import { formatPhoneDisplay } from 'src/utils/formatPhoneDisplay'

const isValidDate = (v) => {
  return startOfDay(new Date(parseISO(v))).getTime() >= startOfDay(new Date()).getTime()
}

export default {
  name: 'ModalCampanha',
  components: { VEmojiPicker, cMolduraCelular, MensagemChat },
  props: {
    modalCampanha: {
      type: Boolean,
      default: false
    },
    campanhaEdicao: {
      type: Object,
      default: () => {
        return { id: null }
      }
    }
  },
  data () {
    return {
      // Mensagens dinâmicas
      messages: [
        { content: '' }
      ],
      messagemPreview: 0,

      // Importação XLSX
      modalPreviewImport: false,
      activeTab: 'contacts',
      tempContacts: [],
      tempVariables: [],
      tempVariablesData: [],
      customVariables: [],
      importedContacts: [],
      variablesData: [],

      // Colunas das tabelas
      contactsColumns: [
        { name: 'avatar', label: '', field: 'name', style: 'width: 60px', align: 'center' },
        { name: 'name', label: 'Nome', field: 'name', align: 'left' },
        { name: 'number', label: 'Telefone', field: 'number', align: 'center' }
      ],
      variablesDataColumns: [],
      contactsPagination: { rowsPerPage: 10 },
      variablesPagination: { rowsPerPage: 10 },

      // Dados da campanha
      loading: false,
      abrirModalImagem: false,
      urlMedia: '',
      campanha: {
        name: null,
        start: null,
        mediaUrl: null,
        sessionId: null,
        delay: 20,
        message1: '',
        message2: '',
        message3: ''
      },
      messageTemplate: {
        mediaUrl: null,
        id: null,
        ack: 3,
        read: true,
        fromMe: true,
        body: null,
        mediaType: 'chat',
        isDeleted: false,
        createdAt: '2021-02-20T20:09:04.736Z',
        updatedAt: '2021-02-20T23:26:24.311Z',
        quotedMsgId: null,
        ticketId: 0,
        contactId: null,
        userId: null,
        contact: null,
        quotedMsg: null
      },
      arquivos: []
    }
  },
  validations: {
    campanha: {
      name: { required },
      start: { required, isValidDate },
      message1: { required },
      sessionId: { required }
      // message2 e message3 são opcionais
    }
  },
  computed: {
    ...mapGetters(['whatsapps']),
    cSessions () {
      return this.whatsapps.filter(w => w.type === 'whatsapp' && !w.isDeleted)
    },
    // Data formatada para exibição no padrão brasileiro
    campanhaStartFormatted: {
      get () {
        if (!this.campanha.start) return ''
        try {
          const date = parseISO(this.campanha.start)
          return format(date, 'dd/MM/yyyy HH:mm')
        } catch (error) {
          return ''
        }
      },
      set (value) {
        // Se o valor estiver vazio ou incompleto, limpar
        if (!value || value.length < 16) {
          this.campanha.start = null
          return
        }

        try {
          // Verificar se o formato está completo (DD/MM/YYYY HH:mm)
          const dateTimeRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/
          const match = value.match(dateTimeRegex)

          if (match) {
            const [, day, month, year, hour, minute] = match

            // Validar se os valores são válidos
            const dayNum = parseInt(day)
            const monthNum = parseInt(month)
            const yearNum = parseInt(year)
            const hourNum = parseInt(hour)
            const minuteNum = parseInt(minute)

            if (dayNum >= 1 && dayNum <= 31 &&
                monthNum >= 1 && monthNum <= 12 &&
                yearNum >= 2020 && yearNum <= 2030 &&
                hourNum >= 0 && hourNum <= 23 &&
                minuteNum >= 0 && minuteNum <= 59) {
              const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`
              this.campanha.start = isoString
            }
          }
        } catch (error) {
          console.error('Erro ao converter data:', error)
          // Em caso de erro, não alterar o valor atual
        }
      }
    },
    cKey () {
      return this.messages.map(m => m.content).join('_')
    },
    cArquivoName () {
      if (!this.campanha.mediaUrl) return ''
      const split = this.campanha.mediaUrl.split('/')
      return split[split.length - 1]
    },
    optRadio () {
      return this.messages.map((msg, idx) => ({
        label: `Mensagem ${idx + 1}`,
        value: idx
      }))
    },
    cMessages () {
      const messages = []

      // Mídia
      if (this.arquivos?.type) {
        const blob = new Blob([this.arquivos], { type: this.arquivos.type })
        messages.push({
          ...this.messageTemplate,
          id: 'mediaUrl',
          mediaUrl: window.URL.createObjectURL(blob),
          body: this.arquivos.name,
          mediaType: this.arquivos.type.substr(0, this.arquivos.type.indexOf('/'))
        })
      } else if (this.campanha.mediaUrl) {
        messages.push({
          ...this.messageTemplate,
          id: 'mediaUrl',
          mediaUrl: this.campanha.mediaUrl,
          body: '',
          mediaType: this.campanha.mediaType
        })
      }

      // Mensagem selecionada no preview
      const selectedMessage = this.messages[this.messagemPreview]
      if (selectedMessage && selectedMessage.content) {
        messages.push({
          ...this.messageTemplate,
          id: `message${this.messagemPreview}`,
          body: selectedMessage.content
        })
      }

      return messages
    }
  },
  methods: {
    formatPhoneDisplay,
    // ===== DATA =====
    dateOptions (date) {
      return date >= format(new Date(), 'yyyy/MM/dd')
    },

    // ===== MENSAGENS DINÂMICAS =====
    addMessage () {
      if (this.messages.length < 3) {
        this.messages.push({ content: '' })
      }
    },
    removeMessage (idx) {
      if (this.messages.length > 1) {
        this.messages.splice(idx, 1)
        if (this.messagemPreview >= this.messages.length) {
          this.messagemPreview = this.messages.length - 1
        }
      }
    },
    updateMessage (idx, value) {
      this.messages[idx].content = value
      // Atualizar campanha.message1/2/3
      this.campanha.message1 = this.messages[0]?.content || ''
      this.campanha.message2 = this.messages[1]?.content || ''
      this.campanha.message3 = this.messages[2]?.content || ''
    },

    // ===== IMPORTAÇÃO XLSX =====
    handleImportXLSX () {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = '.csv,.xls,.xlsx'
      fileInput.onchange = e => {
        const file = e.target.files[0]
        if (file) {
          this.processXLSXFile(file)
        }
      }
      fileInput.click()
    },

    async processXLSXFile (file) {
      try {
        this.loading = true
        const data = await this.readFile(file)
        const result = await this.extractVariablesAndContacts(data, file.name)

        // Preparar colunas para preview
        if (result.variablesData.length > 0) {
          this.variablesDataColumns = Object.keys(result.variablesData[0]).map(key => ({
            name: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            field: key,
            align: 'left'
          }))
        }

        this.tempContacts = result.contacts
        this.tempVariables = result.variables
        this.tempVariablesData = result.variablesData

        this.modalPreviewImport = true
        this.activeTab = 'contacts'
      } catch (error) {
        console.error('Erro ao processar arquivo:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao processar arquivo. Verifique o formato.',
          position: 'top'
        })
      } finally {
        this.loading = false
      }
    },

    readFile (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result)
        reader.onerror = e => reject(e)
        if (file.name.endsWith('.csv')) {
          reader.readAsText(file)
        } else {
          reader.readAsArrayBuffer(file)
        }
      })
    },

    async extractVariablesAndContacts (data, fileName) {
      const variables = []
      const contacts = []
      const variablesData = []

      if (fileName.endsWith('.csv')) {
        const lines = data.split('\n').filter(line => line.trim() !== '')
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase())

        const nameIndex = headers.findIndex(h => h === 'nome' || h === 'name')
        const numberIndex = headers.findIndex(h => h === 'numero' || h === 'telefone' || h === 'number' || h === 'phone')

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(value => value.trim())
          if (values.length === headers.length) {
            const row = {}
            headers.forEach((header, index) => {
              row[header] = values[index]
            })
            variablesData.push(row)

            if (nameIndex >= 0 && numberIndex >= 0 && values[nameIndex] && values[numberIndex]) {
              contacts.push({
                name: values[nameIndex],
                number: values[numberIndex].replace(/\D/g, '')
              })
            }
          }
        }

        // Criar variáveis customizadas
        headers.forEach(header => {
          if (header !== 'nome' && header !== 'name' && header !== 'numero' && header !== 'number' && header !== 'telefone' && header !== 'phone') {
            variables.push({
              label: header.charAt(0).toUpperCase() + header.slice(1),
              value: `{{${header}}}`
            })
          }
        })
      } else {
        // Processar XLSX
        const XLSX = window.XLSX || await import('xlsx')
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

        if (jsonData.length > 1) {
          const headers = jsonData[0].map(header => String(header).trim().toLowerCase())
          const nameIndex = headers.findIndex(h => h === 'nome' || h === 'name')
          const numberIndex = headers.findIndex(h => h === 'numero' || h === 'telefone' || h === 'number' || h === 'phone')

          for (let i = 1; i < jsonData.length; i++) {
            const values = jsonData[i]
            if (values && values.length > 0) {
              const row = {}
              headers.forEach((header, index) => {
                row[header] = values[index] != null ? String(values[index]) : ''
              })
              variablesData.push(row)

              if (nameIndex >= 0 && numberIndex >= 0 && values[nameIndex] && values[numberIndex]) {
                contacts.push({
                  name: String(values[nameIndex]),
                  number: String(values[numberIndex]).replace(/\D/g, '')
                })
              }
            }
          }

          // Criar variáveis customizadas
          headers.forEach(header => {
            if (header !== 'nome' && header !== 'name' && header !== 'numero' && header !== 'number' && header !== 'telefone' && header !== 'phone') {
              variables.push({
                label: header.charAt(0).toUpperCase() + header.slice(1),
                value: `{{${header}}}`
              })
            }
          })
        }
      }

      return { variables, contacts, variablesData }
    },

    confirmImport () {
      this.customVariables = [...this.tempVariables]
      this.importedContacts = [...this.tempContacts]
      this.variablesData = [...this.tempVariablesData]

      this.modalPreviewImport = false

      this.$q.notify({
        type: 'positive',
        message: `Importação concluída: ${this.customVariables.length} variáveis e ${this.importedContacts.length} contatos!`,
        position: 'top'
      })
    },

    cancelImport () {
      this.tempContacts = []
      this.tempVariables = []
      this.tempVariablesData = []
      this.modalPreviewImport = false
    },

    // ===== INSERIR EMOJI/VARIÁVEL =====
    onInsertSelectEmoji (emoji, messageIdx) {
      if (!emoji.data) return

      const refName = `message${messageIdx}`
      const tArea = this.$refs[refName]?.[0]
      if (!tArea) return

      const startPos = tArea.selectionStart
      const endPos = tArea.selectionEnd
      const currentValue = tArea.value || ''

      const newValue = currentValue.substring(0, startPos) + emoji.data + currentValue.substring(endPos)
      this.updateMessage(messageIdx, newValue)

      setTimeout(() => {
        tArea.selectionStart = tArea.selectionEnd = startPos + emoji.data.length
        tArea.focus()
      }, 10)
    },

    onInsertSelectVariable (variableValue, messageIdx) {
      const refName = `message${messageIdx}`
      const tArea = this.$refs[refName]?.[0]
      if (!tArea) return

      const startPos = tArea.selectionStart || 0
      const endPos = tArea.selectionEnd || 0
      const currentValue = tArea.value || ''

      const newValue = currentValue.substring(0, startPos) + variableValue + currentValue.substring(endPos)
      this.updateMessage(messageIdx, newValue)

      setTimeout(() => {
        tArea.selectionStart = tArea.selectionEnd = startPos + variableValue.length
        tArea.focus()
      }, 10)
    },

    // ===== MODAL =====
    resetarCampanha () {
      this.campanha = {
        id: null,
        name: null,
        start: null,
        mediaUrl: null,
        sessionId: null,
        delay: 20,
        message1: '',
        message2: '',
        message3: ''
      }
      this.messages = [{ content: '' }]
      this.customVariables = []
      this.importedContacts = []
      this.variablesData = []
      this.messagemPreview = 0
    },

    fecharModal () {
      this.resetarCampanha()
      this.$emit('update:campanhaEdicao', { id: null })
      this.$emit('update:modalCampanha', false)
    },

    abrirModal () {
      if (this.campanhaEdicao.id) {
        this.campanha = { ...this.campanhaEdicao }

        // Carregar mensagens existentes
        this.messages = []
        if (this.campanha.message1) this.messages.push({ content: this.campanha.message1 })
        if (this.campanha.message2) this.messages.push({ content: this.campanha.message2 })
        if (this.campanha.message3) this.messages.push({ content: this.campanha.message3 })
        if (this.messages.length === 0) this.messages = [{ content: '' }]

        // Carregar variáveis se existirem
        if (this.campanha.customVariables) {
          // Se vier como string, fazer parse; se vier como array/objeto, usar direto
          this.customVariables = typeof this.campanha.customVariables === 'string'
            ? JSON.parse(this.campanha.customVariables)
            : Array.isArray(this.campanha.customVariables)
              ? [...this.campanha.customVariables]
              : []
        }
        if (this.campanha.variablesData) {
          // Se vier como string, fazer parse; se vier como array/objeto, usar direto
          this.variablesData = typeof this.campanha.variablesData === 'string'
            ? JSON.parse(this.campanha.variablesData)
            : Array.isArray(this.campanha.variablesData)
              ? [...this.campanha.variablesData]
              : []
        }
      } else {
        this.resetarCampanha()
        // Inicializar data com valor padrão
        this.campanha.start = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
      }
    },

    verContatosVinculados () {
      if (this.campanhaEdicao._existingContacts && this.campanhaEdicao._existingContacts.length > 0) {
        // Preparar dados para o modal de preview
        this.tempContacts = this.campanhaEdicao._existingContacts.map(contact => ({
          name: contact.name,
          number: contact.number
        }))

        // Se houver variáveis personalizadas, preparar também
        const customVars = this.campanhaEdicao.customVariables || []
        const varsData = this.campanhaEdicao.variablesData || []

        // Garantir que sejam arrays válidos
        this.tempVariables = typeof customVars === 'string'
          ? JSON.parse(customVars)
          : Array.isArray(customVars) ? customVars : []

        this.tempVariablesData = typeof varsData === 'string'
          ? JSON.parse(varsData)
          : Array.isArray(varsData) ? varsData : []

        // Preparar colunas dinâmicas para a tabela de dados
        if (this.tempVariablesData.length > 0) {
          this.variablesDataColumns = Object.keys(this.tempVariablesData[0]).map(key => ({
            name: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            field: key,
            align: 'left'
          }))
        }

        // Iniciar na aba de contatos
        this.activeTab = 'contacts'

        // Abrir modal
        this.modalPreviewImport = true
      }
    },

    onRejectedFiles () {
      this.$q.notify({
        html: true,
        message: `Ops... Ocorreu um erro! <br>
        <ul>
          <li>Arquivo deve ter no máximo 10MB.</li>
          <li>Priorize o envio de imagem ou vídeo.</li>
        </ul>`,
        type: 'negative',
        position: 'top'
      })
    },

    async handleCampanha () {
      // Atualizar mensagens
      this.campanha.message1 = this.messages[0]?.content || ''
      this.campanha.message2 = this.messages[1]?.content || ''
      this.campanha.message3 = this.messages[2]?.content || ''

      this.$v.campanha.$touch()

      if (this.$v.campanha.$error) {
        this.$q.notify({
          type: 'negative',
          message: 'Verifique se todos os campos obrigatórios estão preenchidos'
        })
        return
      }

      try {
        this.loading = true
        const campanha = { ...this.campanha }
        const medias = new FormData()

        Object.keys(campanha).forEach((key) => {
          if (campanha[key] != null) {
            medias.append(key, campanha[key])
          }
        })

        medias.append('medias', this.arquivos)

        // Adicionar variáveis e contatos
        if (this.customVariables.length > 0) {
          medias.append('customVariables', JSON.stringify(this.customVariables))
          medias.append('variablesData', JSON.stringify(this.variablesData))
        }

        if (this.importedContacts.length > 0) {
          medias.append('contactsData', JSON.stringify(this.importedContacts))
        }

        if (this.campanha.id) {
          const { data } = await AlterarCampanha(medias, campanha.id)
          this.$emit('modal-campanha:editada', data)
          this.$q.notify({
            type: 'info',
            message: 'Campanha editada!',
            position: 'top'
          })
        } else {
          const { data } = await CriarCampanha(medias)
          this.$emit('modal-campanha:criada', data)
          this.$q.notify({
            type: 'positive',
            message: 'Campanha criada com sucesso!',
            position: 'top'
          })
        }

        this.loading = false
        this.fecharModal()
      } catch (error) {
        console.error(error)
        this.$notificarErro('Algum problema ao criar campanha', error)
        this.loading = false
      }
    }
  },
  mounted () {
    // Garantir que XLSX está carregado
    if (typeof window !== 'undefined' && !window.XLSX) {
      import('xlsx').then(XLSX => {
        window.XLSX = XLSX
      })
    }
  }
}
</script>

<style lang="scss" scoped>
// Modal Principal - Minimalista
.modern-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
}

// Header - Simples
.modal-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 16px 20px;
  margin: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-title {
  display: flex;
  align-items: center;
  color: #495057;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  color: #6c757d !important;

  &:hover {
    color: #495057 !important;
  }
}

.header-subtitle {
  display: flex;
  align-items: center;
  color: #6c757d;
  font-size: 13px;
}

// Banner - Simples
.modern-banner {
  margin-top: 12px;
  border-radius: 6px;
  border: 1px solid #d4edda;
  background: #d1ecf1;
}

.bg-gradient-green {
  background: #d1ecf1;
  color: #0c5460;
}

.banner-content {
  flex: 1;
}

.banner-btn {
  color: #0c5460;
}

// Form Section - Compacto
.form-section {
  padding: 20px;
  background: white;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 100px;
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.form-field {
  &.full-width {
    grid-column: 1 / -1;
  }

  &.small {
    grid-column: span 1;
  }
}

.modern-input {
  ::v-deep .q-field__control {
    border-radius: 6px;
    border: 1px solid #ced4da;
  }

  ::v-deep .q-field--focused .q-field__control {
    border-color: #1976d2;
  }

  ::v-deep .q-field__label {
    font-weight: 500;
    color: #495057;
  }
}

.modern-file {
  ::v-deep .q-field__control {
    border-radius: 6px;
    border: 1px dashed #ced4da;
  }
}

.required {
  ::v-deep .q-field__label::after {
    content: ' *';
    color: #dc3545;
    font-weight: bold;
  }
}

// Import Section - Minimalista
.import-section {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  margin-top: 16px;
  border: 1px solid #e9ecef;
}

.import-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.import-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.import-btn {
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
}

.import-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.modern-chip {
  border-radius: 12px;
  font-size: 12px;
}

// Messages Section - Compacto
.messages-section {
  padding: 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.messages-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

.message-card {
  background: white;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e9ecef;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.message-title {
  display: flex;
  align-items: center;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.message-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  border-radius: 4px;
  padding: 4px;
}

.modern-textarea {
  width: 100%;
  min-height: 80px;
  max-height: 120px;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  resize: vertical;
  background: white;

  &:focus {
    outline: none;
    border-color: #1976d2;
  }

  &.error-state {
    border-color: #dc3545;
    background: #f8d7da;
  }

  &::placeholder {
    color: #6c757d;
  }
}

.add-message-btn {
  width: 100%;
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
  margin-top: 12px;
}

// Preview Section - Simples
.preview-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-card, .contacts-card {
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.preview-header, .contacts-header {
  background: #495057;
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.preview-content {
  padding: 16px;
}

.preview-selector {
  margin-bottom: 12px;
}

.phone-preview {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  overflow-x: auto;
  min-height: 300px;
  width: 100%;
}

.phone-frame {
  max-width: 380px;
  min-width: 320px;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.contacts-content {
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.contacts-list {
  .contact-item {
    border-radius: 4px;
    margin-bottom: 4px;

    &:hover {
      background: #f8f9fa;
    }
  }
}

.contact-name {
  font-weight: 500;
  color: #495057;
  font-size: 13px;
}

.contact-number {
  color: #6c757d;
  font-size: 11px;
}

.more-contacts {
  text-align: center;
  color: #6c757d;
  font-size: 11px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-top: 8px;
}

// Actions Section - Simples
.actions-section {
  background: #f8f9fa;
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
}

.actions-container {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
}

.action-btn {
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 13px;
  min-width: 120px;

  @media (max-width: 768px) {
    width: 100%;
  }
}

// Responsive Design - Simplificado
@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .modal-header {
    padding: 12px 16px;
  }

  .form-section, .messages-section {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .messages-container {
    grid-template-columns: 1fr;
  }

  .import-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .import-btn {
    width: 100%;
  }

  .phone-preview {
    padding: 16px;
    min-height: 280px;
  }

  .phone-frame {
    max-width: 360px;
    min-width: 300px;
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding: 12px;
  }

  .form-section, .messages-section {
    padding: 12px;
  }

  .message-card {
    padding: 12px;
  }

  .modern-textarea {
    min-height: 60px;
  }

  .phone-preview {
    padding: 12px;
    min-height: 260px;
  }

  .phone-frame {
    max-width: 340px;
    min-width: 280px;
  }
}

// Scrollbar personalizado para o modal
.modern-modal::-webkit-scrollbar {
  width: 6px;
}

.modern-modal::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 3px;
}

.modern-modal::-webkit-scrollbar-thumb {
  background: #ced4da;
  border-radius: 3px;

  &:hover {
    background: #adb5bd;
  }
}

// Scrollbar simples para contatos
.contacts-content::-webkit-scrollbar {
  width: 4px;
}

.contacts-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.contacts-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}
</style>
