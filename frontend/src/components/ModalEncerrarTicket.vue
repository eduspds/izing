<template>
  <q-dialog
    v-model="show"
    persistent
    :maximized="$q.screen.xs"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="modal-encerrar-ticket" :style="$q.screen.xs ? 'min-width: 100vw' : 'min-width: 500px; max-width: 600px'">
      <!-- Header -->
      <q-card-section class="modal-header">
        <div class="row items-center">
          <q-icon name="mdi-comment-check" size="28px" color="positive" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Encerrar Atendimento</div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="close"
          @click="fecharModal"
          class="absolute-top-right"
        />
      </q-card-section>

      <q-separator />

      <!-- Content -->
      <q-card-section class="modal-content">
        <!-- Informações do Ticket -->
        <div class="ticket-info-card q-mb-lg">
          <div class="row items-center q-mb-sm">
            <q-icon name="mdi-ticket-confirmation" color="primary" class="q-mr-sm" />
            <span class="text-weight-bold">Ticket #{{ ticket.id }}</span>
          </div>
          <div class="row items-center">
            <q-icon name="mdi-account" color="grey-6" class="q-mr-sm" />
            <span class="text-grey-7">{{ ticket.contact?.name || 'Contato' }}</span>
          </div>
        </div>

        <!-- Formulário -->
        <q-form @submit="confirmarEncerramento" class="q-gutter-md">
          <!-- Motivo de Encerramento -->
          <div class="form-field">
            <q-select
              v-model="motivoEncerramento"
              :options="motivosOptions"
              option-value="id"
              option-label="message"
              emit-value
              map-options
              label="Motivo de Encerramento *"
              outlined
              dense
              :rules="[val => !!val || 'Selecione um motivo de encerramento']"
              :loading="carregandoMotivos"
              class="modern-select"
            >
              <template v-slot:prepend>
                <q-icon name="mdi-format-list-bulleted" color="primary" />
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">
                    Nenhum motivo encontrado
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- Observação -->
          <div class="form-field">
            <q-input
              v-model="observacao"
              label="Observação (opcional)"
              type="textarea"
              outlined
              dense
              rows="3"
              maxlength="500"
              counter
              class="modern-textarea"
            >
              <template v-slot:prepend>
                <q-icon name="mdi-text" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Enviar Avaliação -->
          <div class="form-field">
            <q-checkbox
              v-model="enviarAvaliacao"
              color="orange"
              class="evaluation-checkbox"
            >
              <div class="checkbox-content">
                <div class="row items-center">
                  <q-icon name="mdi-star-check" color="orange" size="20px" class="q-mr-xs" />
                  <span class="text-weight-bold">Enviar mensagem de avaliação</span>
                </div>
                <div class="text-caption text-grey-7 q-mt-xs">
                  Se ativado, o sistema enviará um fluxo de avaliação para o cliente antes de fechar o ticket
                </div>
              </div>
            </q-checkbox>
          </div>

          <!-- Gerar Kanban -->
          <div v-if="motivoSelecionado?.canKanban" class="form-field">
            <q-checkbox
              v-model="gerarKanban"
              color="primary"
              class="kanban-checkbox"
            >
              <div class="checkbox-content">
                <div class="row items-center">
                  <q-icon name="mdi-view-kanban" color="primary" size="20px" class="q-mr-xs" />
                  <span class="text-weight-bold">Gerar Kanban</span>
                </div>
                <div class="text-caption text-grey-7 q-mt-xs">
                  Criar um item no Kanban após encerrar o atendimento
                </div>
              </div>
            </q-checkbox>
          </div>

          <!-- Aviso -->
          <q-banner class="bg-orange-1 text-orange-8" rounded>
            <template v-slot:avatar>
              <q-icon name="mdi-information" color="orange" />
            </template>
            <div class="text-weight-bold">Atenção!</div>
            <div>Esta ação encerrará definitivamente o atendimento. Certifique-se de que todas as questões foram resolvidas.</div>
          </q-banner>
        </q-form>
      </q-card-section>

      <q-separator />

      <!-- Actions -->
      <q-card-actions class="modal-actions">
        <q-btn
          flat
          label="Cancelar"
          color="grey-7"
          @click="fecharModal"
          class="q-mr-sm"
        />
        <q-btn
          label="Encerrar Atendimento"
          color="positive"
          @click="confirmarEncerramento"
          :loading="enviando"
          :disable="!motivoEncerramento"
          class="q-px-lg"
        />
      </q-card-actions>
    </q-card>

    <!-- Modal Criar Kanban -->
    <ModalCriarKanban
      v-model="modalCriarKanban"
      :ticket-data="ticket"
      @kanban-criado="onKanbanCriado"
      @modal-fechado="onKanbanModalFechado"
    />
  </q-dialog>
</template>

<script>
import { ListarMotivosEncerramento } from 'src/service/motivoEncerramento'
import { AtualizarTicket } from 'src/service/tickets'
import ModalCriarKanban from './ModalCriarKanban.vue'

export default {
  name: 'ModalEncerrarTicket',
  components: {
    ModalCriarKanban
  },
  props: {
    value: {
      type: Boolean,
      default: false
    },
    ticket: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      show: false,
      motivoEncerramento: null,
      observacao: '',
      enviarAvaliacao: true,
      gerarKanban: false,
      motivosOptions: [],
      carregandoMotivos: false,
      enviando: false,
      modalCriarKanban: false,
      aguardandoKanban: false
    }
  },
  computed: {
    motivoSelecionado () {
      if (!this.motivoEncerramento) return null
      return this.motivosOptions.find(m => m.id === this.motivoEncerramento)
    }
  },
  watch: {
    value (newVal) {
      this.show = newVal
      if (newVal) {
        this.carregarMotivos()
        this.resetForm()
        this.aguardandoKanban = false
      }
    },
    show (newVal) {
      if (!this.aguardandoKanban) {
        this.$emit('input', newVal)
      }
    },
    modalCriarKanban (newVal) {
      if (newVal) {
        this.aguardandoKanban = true
      }
    }
  },
  methods: {
    async carregarMotivos () {
      this.carregandoMotivos = true
      try {
        const response = await ListarMotivosEncerramento()
        this.motivosOptions = response.data || []
      } catch (error) {
        console.error('Erro ao carregar motivos:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao carregar motivos de encerramento',
          position: 'top'
        })
      } finally {
        this.carregandoMotivos = false
      }
    },
    resetForm () {
      this.motivoEncerramento = null
      this.observacao = ''
      this.enviarAvaliacao = true
      this.gerarKanban = false
    },
    async confirmarEncerramento () {
      if (!this.motivoEncerramento) {
        this.$q.notify({
          type: 'warning',
          message: 'Selecione um motivo de encerramento',
          position: 'top'
        })
        return
      }

      this.enviando = true
      try {
        const data = {
          status: 'closed',
          endConversationId: this.motivoEncerramento,
          endConversationObservation: this.observacao || null,
          sendEvaluation: this.enviarAvaliacao
        }

        await AtualizarTicket(this.ticket.id, data)

        this.$q.notify({
          type: 'positive',
          message: 'Atendimento encerrado com sucesso!',
          position: 'top',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })

        if (this.gerarKanban && this.motivoSelecionado?.canKanban) {
          this.modalCriarKanban = true
        } else {
          this.$emit('ticket-encerrado', this.ticket)
          this.fecharModal()
        }
      } catch (error) {
        console.error('Erro ao encerrar ticket:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao encerrar atendimento',
          position: 'top'
        })
      } finally {
        this.enviando = false
      }
    },
    fecharModal () {
      if (this.modalCriarKanban) {
        this.modalCriarKanban = false
      }
      this.aguardandoKanban = false
      this.show = false
      this.resetForm()
    },
    onKanbanCriado (kanban) {
      this.aguardandoKanban = false
      this.modalCriarKanban = false
      this.$emit('ticket-encerrado', this.ticket)
      this.fecharModal()
    },
    onKanbanModalFechado () {
      if (this.modalCriarKanban === false && this.aguardandoKanban) {
        this.aguardandoKanban = false
        this.$emit('ticket-encerrado', this.ticket)
        this.fecharModal()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-encerrar-ticket {
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
}

.modal-content {
  padding: 24px;
}

.ticket-info-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #1976d2;
}

.form-field {
  margin-bottom: 20px;
}

.modern-select {
  .q-field__control {
    border-radius: 8px;
  }
}

.modern-textarea {
  .q-field__control {
    border-radius: 8px;
  }
}

.modal-actions {
  padding: 20px 24px;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

.evaluation-checkbox {
  background: #fff8e1;
  border: 1px solid #ffb300;
  border-radius: 8px;
  padding: 12px;
  width: 100%;

  .checkbox-content {
    margin-left: 8px;
  }

  &:hover {
    background: #fff3e0;
  }
}

.kanban-checkbox {
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  padding: 12px;
  width: 100%;

  .checkbox-content {
    margin-left: 8px;
  }

  &:hover {
    background: #bbdefb;
  }
}

// Responsividade
@media (max-width: 600px) {
  .modal-encerrar-ticket {
    border-radius: 0;
  }

  .modal-header {
    border-radius: 0;
  }

  .modal-actions {
    border-radius: 0;
  }
}

// Animações
.q-dialog__inner {
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
