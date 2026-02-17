<template>
  <div class="ai-summary-section" :class="satisfactionClass">
    <!-- Cabeçalho -->
    <div class="section-header">
      <div class="section-title">
        <q-icon name="smart_toy" class="q-mr-xs" />
        Resumo com IA
      </div>
      <q-btn
        v-if="!summary && !loading"
        icon="auto_awesome"
        flat
        round
        dense
        size="sm"
        color="primary"
        @click="generateSummary"
        :disable="!canGenerate"
      >
        <q-tooltip>Gerar resumo com IA</q-tooltip>
      </q-btn>
    </div>

    <q-separator class="q-mb-sm" />

    <!-- Conteúdo -->
    <div class="section-content">
      <!-- Loading -->
      <div v-if="loading" class="text-center q-py-md">
        <q-spinner-dots size="24px" color="primary" />
        <div class="text-caption q-mt-sm text-grey-6">
          Gerando resumo com IA...
        </div>
      </div>

      <!-- Resumo -->
      <div v-else-if="summary" class="summary-content">
        <div
          class="summary-text"
          :class="{ 'summary-text-clicavel': summary.text && summary.text.length > 200 }"
          @click="summary.text && summary.text.length > 200 ? $emit('ver-completo', summary.text) : null"
        >
          {{ summary.text && summary.text.length > 200 ? summary.text.substring(0, 200) + '...' : summary.text }}
        </div>
        <div v-if="summary.text && summary.text.length > 200" class="text-caption q-mt-xs">
          <a href="javascript:void(0)" class="text-primary" @click.prevent="$emit('ver-completo', summary.text)">Ver completo</a>
        </div>
        <div class="summary-meta text-caption text-grey-6 q-mt-sm">
          <q-icon name="schedule" size="12px" class="q-mr-xs" />
          Gerado em {{ formatDate(summary.createdAt) }}
        </div>
        <div class="summary-actions q-mt-sm">
          <q-btn
            flat
            dense
            size="sm"
            color="primary"
            icon="refresh"
            @click="regenerateSummary"
            :loading="loading"
          >
            Regenerar
          </q-btn>
          <q-btn
            flat
            dense
            size="sm"
            color="grey-7"
            icon="content_copy"
            @click="copySummary"
          >
            Copiar
          </q-btn>
        </div>
      </div>

      <!-- Sem resumo -->
      <div v-else class="empty-state">
        <q-icon name="smart_toy" size="32px" color="grey-4" />
        <div class="text-caption text-grey-6 q-mt-sm">
          Clique no botão para gerar um resumo inteligente das primeiras 100 mensagens
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { generateAISummary, getAISummary } from '../service/aiSummary'
import { LocalizarMensagens } from '../service/tickets'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default {
  name: 'AISummary',

  props: {
    ticketId: {
      type: [Number, String],
      required: true
    }
  },

  data () {
    return {
      summary: null,
      loading: false,
      ticketMessages: []
    }
  },

  computed: {
    canGenerate () {
      return this.ticketMessages && this.ticketMessages.length > 0
    },

    satisfactionClass () {
      if (!this.summary || !this.summary.text) return ''

      const text = this.summary.text.toLowerCase()
      console.log('🔍 Analisando satisfação:', text)

      // Verificar primeiro "insatisfeito" para evitar conflito com "satisfeito"
      if (text.includes('insatisfeito')) {
        console.log('🔴 Cliente insatisfeito detectado')
        return 'satisfaction-unsatisfied'
      } else if (text.includes('satisfeito')) {
        console.log('🟢 Cliente satisfeito detectado')
        return 'satisfaction-satisfied'
      } else if (text.includes('neutro')) {
        console.log('⚪ Cliente neutro detectado')
        return 'satisfaction-neutral'
      }

      console.log('❓ Satisfação não detectada')
      return ''
    }
  },

  watch: {
    ticketId: {
      handler (newTicketId) {
        if (newTicketId) {
          this.loadTicketMessages()
          this.loadExistingSummary()
        }
      },
      immediate: true
    }
  },

  methods: {
    async loadTicketMessages () {
      try {
        console.log('📝 Carregando mensagens do ticket:', this.ticketId)
        const { data } = await LocalizarMensagens({ ticketId: this.ticketId })
        this.ticketMessages = data.messages || []
        console.log('📝 Mensagens carregadas:', this.ticketMessages.length)
        console.log('📝 Primeira mensagem:', this.ticketMessages[0])
      } catch (error) {
        console.error('❌ Erro ao carregar mensagens:', error)
        this.ticketMessages = []
      }
    },

    async loadExistingSummary () {
      try {
        this.loading = true
        const { data } = await getAISummary(this.ticketId)
        this.summary = data.summary
      } catch (error) {
        // Se não existe resumo (404), não é erro - é comportamento normal
        if (error.response?.status === 404) {
          console.log('📝 Nenhum resumo encontrado para o ticket', this.ticketId)
        } else {
          console.error('❌ Erro ao carregar resumo:', error)
        }
        this.summary = null
      } finally {
        this.loading = false
      }
    },

    async generateSummary () {
      if (!this.canGenerate) {
        this.$q.notify({
          type: 'warning',
          message: 'Nenhuma mensagem disponível para resumir',
          position: 'top'
        })
        return
      }

      try {
        this.loading = true

        // Preparar mensagens para envio
        const messagesToSend = this.ticketMessages.slice(0, 100).map(msg => ({
          body: msg.body || msg.message || msg.text || '',
          fromMe: msg.fromMe || false,
          timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
          contact: msg.contact || null,
          name: msg.name || null
        }))

        console.log('📝 Enviando mensagens para resumo:', {
          ticketId: this.ticketId,
          messageCount: messagesToSend.length,
          firstMessage: messagesToSend[0]
        })

        const { data } = await generateAISummary(this.ticketId, messagesToSend)

        console.log('✅ Resposta do backend:', data)
        console.log('✅ Summary recebido:', data.summary)
        console.log('✅ Texto do resumo:', data.summary?.text)

        this.summary = data.summary

        this.$q.notify({
          type: 'positive',
          message: 'Resumo gerado com sucesso!',
          position: 'top'
        })
      } catch (error) {
        console.error('Erro ao gerar resumo:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.error || 'Erro ao gerar resumo',
          position: 'top'
        })
      } finally {
        this.loading = false
      }
    },

    async regenerateSummary () {
      await this.generateSummary()
    },

    async copySummary () {
      try {
        await navigator.clipboard.writeText(this.summary.text)
        this.$q.notify({
          type: 'positive',
          message: 'Resumo copiado para a área de transferência!',
          position: 'top'
        })
      } catch (error) {
        console.error('Erro ao copiar:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao copiar resumo',
          position: 'top'
        })
      }
    },

    formatDate (date) {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    }
  }
}
</script>

<style lang="scss" scoped>
.ai-summary-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-weight: 600;
  color: #424242;
  display: flex;
  align-items: center;
}

.section-content {
  min-height: 60px;
}

.summary-content {
  .summary-text {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 8px;
    border-left: 3px solid #1976d2;
    font-size: 14px;
    line-height: 1.5;
    color: #424242;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .summary-text-clicavel {
    cursor: pointer;
  }
  .summary-text-clicavel:hover {
    text-decoration: underline;
    color: #1976d2;
  }
}

// Cores baseadas na satisfação do cliente
.satisfaction-satisfied {
  .summary-text {
    border-left-color: #4caf50 !important; // Verde para satisfeito
  }
}

.satisfaction-unsatisfied {
  .summary-text {
    border-left-color: #f44336 !important; // Vermelho para insatisfeito
  }
}

.satisfaction-neutral {
  .summary-text {
    border-left-color: #9e9e9e !important; // Cinza para neutro
  }

  .summary-meta {
    display: flex;
    align-items: center;
    margin-top: 8px;
  }

  .summary-actions {
    display: flex;
    gap: 8px;
  }
}

.empty-state {
  text-align: center;
  padding: 20px 0;
  color: #9e9e9e;
}
</style>
