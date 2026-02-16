<template>
  <q-dialog
    persistent
    :value="modalEtiqueta"
    @hide="fecharModal"
    @show="abrirModal"
  >
    <q-card
      style="width: 500px"
      class="q-pa-lg"
    >
      <q-card-section>
        <div class="text-h6">{{ etiquetaEdicao.id ? 'Editar': 'Criar' }} Etiqueta</div>
      </q-card-section>
      <q-card-section>
        <q-input
          class="row col"
          square
          outlined
          v-model="etiqueta.tag"
          label="Nome da Etiqueta"
        />
        <q-input
          filled
          hide-bottom-space
          :style="`background: ${etiqueta.color} `"
          v-model="etiqueta.color"
          :rules="['anyColor']"
          class="q-my-md"
          :dark="false"
        >
          <template v-slot:preappend>
          </template>
          <template v-slot:append>
            <q-icon
              name="colorize"
              class="cursor-pointer"
            >
              <q-popup-proxy
                transition-show="scale"
                transition-hide="scale"
              >
                <q-color
                  format-model="hex"
                  square
                  default-view="palette"
                  no-header
                  bordered
                  v-model="etiqueta.color"
                />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <q-checkbox
          v-model="etiqueta.isActive"
          label="Ativo"
        />

        <!-- Seleção de Departamentos -->
        <div class="q-mt-md">
        <q-select
          v-model="etiqueta.queueIds"
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
                <strong>Atenção:</strong> Esta etiqueta está associada a departamentos que você não gerencia.
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
              Deixe vazio para criar etiqueta global (disponível para todos)
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
          @click="handleEtiqueta"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

</template>

<script>
import { CriarEtiqueta, AlterarEtiqueta } from 'src/service/etiquetas'
import { ListarFilas } from 'src/service/filas'
import { mapGetters } from 'vuex'

export default {
  name: 'ModalEtiqueta',
  props: {
    modalEtiqueta: {
      type: Boolean,
      default: false
    },
    etiquetaEdicao: {
      type: Object,
      default: () => {
        return { id: null }
      }
    }
  },
  data () {
    return {
      etiqueta: {
        id: null,
        tag: null,
        color: '#ffffff',
        isActive: true,
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
      return this.etiquetaEdicao.queues?.filter(q =>
        this.outrosQueuesIds.includes(q.id)
      ) || []
    },
    filasDisponiveis () {
      // Para gerentes, retorna apenas os departamentos que eles gerenciam
      // Para admins, retorna todos os departamentos (incluindo opção "global" = sem departamentos)
      if (this.isManager) {
        // Gerentes NÃO devem ver a opção de criar etiquetas globais
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
      } catch (error) {
        console.error('Erro ao carregar filas:', error)
      }
    },
    resetarEtiqueta () {
      this.etiqueta = {
        id: null,
        tag: null,
        color: '#ffffff',
        isActive: true,
        queueIds: []
      }
    },
    fecharModal () {
      this.resetarEtiqueta()
      this.$emit('update:etiquetaEdicao', { id: null })
      this.$emit('update:modalEtiqueta', false)
    },
    abrirModal () {
      if (this.etiquetaEdicao.id) {
        // Separar departamentos que o gerente pode gerenciar dos demais
        if (this.isManager && this.etiquetaEdicao.queues) {
          const minhasFilasIds = this.filas.map(f => f.id)
          const todosQueuesIds = this.etiquetaEdicao.queues.map(q => q.id)

          // Departamentos que o gerente gerencia
          const meusQueuesIds = todosQueuesIds.filter(id => minhasFilasIds.includes(id))

          // Departamentos que outros gerentes gerenciam (usar dados do backend se disponível)
          if (this.etiquetaEdicao.unmanagedQueues) {
            this.outrosQueuesIds = this.etiquetaEdicao.unmanagedQueues.map(q => q.id)
          } else {
            this.outrosQueuesIds = todosQueuesIds.filter(id => !minhasFilasIds.includes(id))
          }

          console.log('MEUS DEPARTAMENTOS IDs:', minhasFilasIds)
          console.log('Todos queues IDs:', todosQueuesIds)
          console.log('Meus queues IDs:', meusQueuesIds)
          console.log('Outros queues IDs:', this.outrosQueuesIds)
          console.log('Unmanaged queues from backend:', this.etiquetaEdicao.unmanagedQueues)

          // Filtrar apenas os IDs que estão disponíveis no select (que o gerente gerencia)
          const queueIdsDisponiveis = meusQueuesIds.filter(id =>
            this.filas.some(fila => fila.id === id)
          )

          this.etiqueta = {
            ...this.etiquetaEdicao,
            queueIds: queueIdsDisponiveis
          }
        } else {
          this.outrosQueuesIds = []
          this.etiqueta = {
            ...this.etiquetaEdicao,
            queueIds: this.etiquetaEdicao.queues ? this.etiquetaEdicao.queues.map(q => q.id) : []
          }
        }
      } else {
        this.outrosQueuesIds = []
        this.resetarEtiqueta()
      }
    },
    async handleEtiqueta () {
      try {
        this.loading = true
        if (this.etiqueta.id) {
          // Se for gerente, combinar seus departamentos com os de outros gerentes
          const dadosEnvio = {
            ...this.etiqueta,
            queueIds: this.isManager
              ? [...this.etiqueta.queueIds, ...this.outrosQueuesIds]
              : this.etiqueta.queueIds
          }
          const { data } = await AlterarEtiqueta(dadosEnvio)
          this.$emit('modal-etiqueta:editada', data)
          this.$q.notify({
            type: 'info',
            progress: true,
            position: 'top',
            textColor: 'black',
            message: 'Etiqueta editada!',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        } else {
          const { data } = await CriarEtiqueta(this.etiqueta)
          this.$emit('modal-etiqueta:criada', data)
          this.$q.notify({
            type: 'positive',
            progress: true,
            position: 'top',
            message: 'Etiqueta criada!',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        }
        this.loading = false
        this.fecharModal()
      } catch (error) {
        console.error(error)
        this.$notificarErro('Ocorreu um erro ao criar a etiqueta', error)
      }
    }
  }

}
</script>

<style lang="scss" scoped>
</style>
