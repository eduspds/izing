<template>
  <q-dialog
    persistent
    :value="modalMensagemRapida"
    @hide="fecharModal"
    @show="abrirModal"
  >
    <q-card
      :style="$q.screen.width < 500 ? 'width: 95vw' : 'min-width: 700px; max-width: 700px'"
      class="q-pa-lg"
    >
      <q-card-section>
        <div class="text-h6">{{ mensagemRapida.id ? 'Editar': 'Criar' }} Mensagem Rápida {{ mensagemRapida.id  ? `(ID: ${mensagemRapida.id})` : '' }}</div>
      </q-card-section>
      <q-card-section class="q-pa-none">
        <div class="row q-my-md">
          <div class="col">
            <q-input
              style="width: 200px; margin-left: 62px"
              square
              outlined
              v-model="mensagemRapida.key"
              label="Chave"
            />
            <p style="margin-left: 62px; font-size: 10px; margin-top: 3px;">
              A chave é o atalho para pesquisa da mensagem pelos usuários.
            </p>
          </div>
        </div>
        <div class="row items-center">
          <div class="col-xs-3 col-sm-2 col-md-1">
            <q-btn
              round
              flat
              class="q-ml-sm"
            >
              <q-icon
                size="2em"
                name="mdi-emoticon-happy-outline"
              />
              <q-tooltip>
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
          </div>
          <div class="col-xs-8 col-sm-10 col-md-11 q-pl-sm">
            <label class="text-caption">Mensagem:</label>
            <textarea
              ref="inputEnvioMensagem"
              style="min-height: 15vh; max-height: 15vh;"
              class="q-pa-sm bg-white full-width"
              placeholder="Digite a mensagem"
              autogrow
              dense
              outlined
              @input="(v) => mensagemRapida.message = v.target.value"
              :value="mensagemRapida.message"
            />
          </div>
        </div>

        <!-- Seleção de Departamentos -->
        <div class="q-mt-md">
        <q-select
          v-model="mensagemRapida.queueIds"
          :options="filasDisponiveis"
          option-value="id"
          option-label="queue"
          label="Departamentos"
          multiple
          outlined
          use-chips
          stack-label
          emit-value
          map-options
          :rules="[val => isManager && (!val || val.length === 0) ? 'Gerentes devem associar a pelo menos um departamento' : true]"
        >
            <template v-slot:prepend>
              <q-icon name="business" />
            </template>
          </q-select>

          <!-- Departamentos de outros gerentes (somente leitura) -->
          <div v-if="isManager && outrosQueuesIds.length > 0" class="q-mt-sm">
            <q-banner class="bg-orange-1 text-orange-8 q-mb-md" rounded>
              <template v-slot:avatar>
                <q-icon name="info" color="orange" />
              </template>
              <div class="text-caption">
                <strong>Atenção:</strong> Esta mensagem rápida está associada a departamentos que você não gerencia.
                Você pode apenas modificar os departamentos que administra.
                <br><br>
                <strong>Departamentos gerenciados por outros:</strong>
              </div>
              <div class="row q-gutter-xs q-mt-sm">
                <q-chip
                  v-for="queue in outrosQueues"
                  :key="queue.id"
                  color="orange-3"
                  text-color="orange-8"
                  size="sm"
                  icon="lock"
                >
                  {{ queue.queue }}
                </q-chip>
              </div>
            </q-banner>
          </div>

          <div class="text-caption text-grey-6 q-mt-xs">
            <span v-if="isManager" class="text-red">
              * Gerentes devem associar a pelo menos um departamento
            </span>
            <span v-else>
              Deixe vazio para criar mensagem global (disponível para todos)
            </span>
          </div>
        </div>
      </q-card-section>
      <q-card-actions
        align="right"
        class="q-mt-md"
      >
        <q-btn
          flat
          label="Cancelar"
          color="negative"
          v-close-popup
          class="q-mr-md"
        />
        <q-btn
          flat
          label="Salvar"
          color="primary"
          @click="handleMensagemRapida"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { VEmojiPicker } from 'v-emoji-picker'
import { CriarMensagemRapida, AlterarMensagemRapida } from 'src/service/mensagensRapidas'
import { ListarFilas } from 'src/service/filas'
import { mapGetters } from 'vuex'

export default {
  name: 'ModalMensagemRapida',
  components: { VEmojiPicker },
  props: {
    modalMensagemRapida: {
      type: Boolean,
      default: false
    },
    mensagemRapidaEmEdicao: {
      type: Object,
      default: () => {
        return { id: null, key: '', message: '' }
      }
    }
  },
  data () {
    return {
      mensagemRapida: {
        key: null,
        message: null,
        queueIds: []
      },
      filas: [],
      outrosQueuesIds: [], // IDs dos departamentos de outros gerentes
      loading: false
    }
  },
  computed: {
    ...mapGetters(['isManager']),
    outrosQueues () {
      // Retorna os objetos completos dos departamentos de outros gerentes
      return this.mensagemRapidaEmEdicao.queues?.filter(q =>
        this.outrosQueuesIds.includes(q.id)
      ) || []
    },
    filasDisponiveis () {
      // Para gerentes, retorna apenas os departamentos que eles gerenciam
      // Para admins, retorna todos os departamentos (incluindo opção "global" = sem departamentos)
      if (this.isManager) {
        // Gerentes NÃO devem ver a opção de criar mensagens globais
        // Filtrar apenas filas com ID válido (remover opção "Nenhum/Global" se existir)
        return this.filas.filter(fila => fila.id)
      }
      return this.filas
    }
  },
  async mounted () {
    await this.carregarFilas()
  },
  methods: {
    async carregarFilas () {
      try {
        const { data } = await ListarFilas()
        // Filtrar apenas departamentos ativos
        this.filas = data.filter(fila => fila.isActive === true)
        console.log('Filas carregadas para gerente:', this.filas)
      } catch (error) {
        console.error('Erro ao carregar filas:', error)
      }
    },
    onInsertSelectEmoji (emoji) {
      const self = this
      var tArea = this.$refs.inputEnvioMensagem
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
      self.txtContent = this.mensagemRapida.message
      self.txtContent = tmpStr.substring(0, startPos) + emoji.data + tmpStr.substring(endPos, tmpStr.length)
      this.mensagemRapida.message = self.txtContent
      // move cursor:
      setTimeout(() => {
        tArea.selectionStart = tArea.selectionEnd = cursorPos + emoji.data.length
      }, 10)
    },
    fecharModal () {
      this.$emit('update:mensagemRapidaEmEdicao', { id: null })
      this.$emit('update:modalMensagemRapida', false)
    },
    abrirModal () {
      if (this.mensagemRapidaEmEdicao.id) {
        console.log('Mensagem Rápida em edição:', this.mensagemRapidaEmEdicao)
        console.log('isManager:', this.isManager)
        console.log('Store state.user:', this.$store.state.user)
        console.log('Store getter isManager:', this.$store.getters.isManager)
        console.log('localStorage profile:', localStorage.getItem('profile'))

        // Separar departamentos que o gerente pode gerenciar dos demais
        if (this.isManager && this.mensagemRapidaEmEdicao.queues) {
          console.log('Entrou no if da manager')
          const minhasFilasIds = this.filas.map(f => f.id)
          const todosQueuesIds = this.mensagemRapidaEmEdicao.queues.map(q => q.id)

          // Departamentos que o gerente gerencia
          const meusQueuesIds = todosQueuesIds.filter(id => minhasFilasIds.includes(id))

          // Departamentos que outros gerentes gerenciam (usar dados do backend se disponível)
          if (this.mensagemRapidaEmEdicao.unmanagedQueues) {
            this.outrosQueuesIds = this.mensagemRapidaEmEdicao.unmanagedQueues.map(q => q.id)
          } else {
            this.outrosQueuesIds = todosQueuesIds.filter(id => !minhasFilasIds.includes(id))
          }

          console.log('Minhas filas IDs:', minhasFilasIds)
          console.log('Todos queues IDs:', todosQueuesIds)
          console.log('Meus queues IDs:', meusQueuesIds)
          console.log('Outros queues IDs:', this.outrosQueuesIds)
          console.log('Unmanaged queues from backend:', this.mensagemRapidaEmEdicao.unmanagedQueues)

          // Filtrar apenas os IDs que estão disponíveis no select (que o gerente gerencia)
          const queueIdsDisponiveis = meusQueuesIds.filter(id =>
            this.filas.some(fila => fila.id === id)
          )

          this.mensagemRapida = {
            ...this.mensagemRapidaEmEdicao,
            queueIds: queueIdsDisponiveis
          }
        } else {
          console.log('NÃO entrou no if da manager - isManager:', this.isManager, 'queues:', this.mensagemRapidaEmEdicao.queues)
          this.outrosQueuesIds = []
          this.mensagemRapida = {
            ...this.mensagemRapidaEmEdicao,
            queueIds: this.mensagemRapidaEmEdicao.queues ? this.mensagemRapidaEmEdicao.queues.map(q => q.id) : []
          }
        }
      } else {
        this.outrosQueuesIds = []
        this.mensagemRapida = {
          key: null,
          message: null,
          queueIds: []
        }
      }
    },
    async handleMensagemRapida () {
      this.loading = true
      try {
        if (this.mensagemRapida.id) {
          // Se for gerente, combinar seus departamentos com os de outros gerentes
          const dadosEnvio = {
            ...this.mensagemRapida,
            queueIds: this.isManager
              ? [...this.mensagemRapida.queueIds, ...this.outrosQueuesIds]
              : this.mensagemRapida.queueIds
          }
          const { data } = await AlterarMensagemRapida(dadosEnvio)
          this.$emit('mensagemRapida:editada', { ...this.mensagemRapida, ...data })
          this.$q.notify({
            type: 'info',
            progress: true,
            position: 'top',
            textColor: 'black',
            message: 'Mensagem Rápida editada!',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        } else {
          const { data } = await CriarMensagemRapida(this.mensagemRapida)
          this.$emit('mensagemRapida:criada', data)
          this.$q.notify({
            type: 'positive',
            progress: true,
            position: 'top',
            message: 'Mensagem rápida criada!',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        }
        this.fecharModal()
      } catch (error) {
        console.error(error)
      }
      this.loading = false
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
