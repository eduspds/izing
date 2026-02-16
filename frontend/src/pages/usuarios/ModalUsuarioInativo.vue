<template>
  <q-dialog
    persistent
    :value="modalUsuarioInativo"
    @hide="fecharModal"
  >
    <q-card style="width: 500px">
      <q-card-section>
        <div class="text-h6">Marcar Usuário como Inativo</div>
      </q-card-section>
      <q-card-section class="q-col-gutter-sm">
        <div class="text-body2 q-mb-md">
          Selecione o tipo de inatividade:
        </div>

        <q-radio
          v-model="tipoInatividade"
          val="indeterminado"
          label="Inativo por tempo indeterminado"
          class="q-mb-md"
        />

        <q-radio
          v-model="tipoInatividade"
          val="dias"
          label="Inativo por X dias"
          class="q-mb-md"
        />

        <q-input
          v-if="tipoInatividade === 'dias'"
          outlined
          v-model.number="dias"
          type="number"
          label="Quantidade de dias"
          :rules="[val => val > 0 || 'Informe um número maior que zero']"
          class="q-mt-md"
        />

        <q-input
          outlined
          v-model="inactiveReason"
          label="Motivo (opcional)"
          type="textarea"
          rows="3"
          class="q-mt-md"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          label="Cancelar"
          class="q-px-md q-mr-sm"
          color="negative"
          v-close-popup
        />
        <q-btn
          label="Confirmar"
          class="q-px-md"
          color="primary"
          @click="handleInativar"
          :loading="loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { MarcarUsuarioInativo, VerificarPodeSerInativado } from 'src/service/user'

export default {
  name: 'ModalUsuarioInativo',
  props: {
    modalUsuarioInativo: {
      type: Boolean,
      default: false
    },
    usuarioSelecionado: {
      type: Object,
      default: () => ({})
    }
  },
  data () {
    return {
      tipoInatividade: 'indeterminado',
      dias: null,
      inactiveReason: '',
      loading: false
    }
  },
  methods: {
    fecharModal () {
      this.$emit('update:modalUsuarioInativo', false)
      this.tipoInatividade = 'indeterminado'
      this.dias = null
      this.inactiveReason = ''
      this.loading = false
    },
    async handleInativar () {
      if (this.tipoInatividade === 'dias' && (!this.dias || this.dias <= 0)) {
        return this.$q.notify({
          type: 'warning',
          progress: true,
          position: 'top',
          message: 'Informe a quantidade de dias',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      }

      this.loading = true

      try {
        // Primeiro verificar se pode ser inativado
        const checkResponse = await VerificarPodeSerInativado(this.usuarioSelecionado.id || this.usuarioSelecionado.userId)

        if (!checkResponse.data.canBeInactive) {
          const blockingInfo = checkResponse.data.blockingFlows
            ?.map(flow => {
              const flowName = flow.chatFlowName || 'Desconhecido'
              const stepName = flow.stepName || 'N/A'
              return 'Fluxo: ' + flowName + ', Etapa: ' + stepName
            })
            .join('\n')

          this.loading = false
          const defaultInfo = 'Informação não disponível'
          const infoText = blockingInfo || defaultInfo
          const messageText = 'O usuário está configurado como destino em fluxos de atendimento:\n\n' + infoText + '\n\nÉ necessário remover o usuário das configurações dos fluxos antes de inativá-lo.'
          return this.$q.dialog({
            title: 'Não é possível inativar o usuário',
            message: messageText,
            persistent: true,
            ok: {
              label: 'Entendi',
              color: 'primary'
            }
          })
        }

        // Preparar dados para inativação
        const data = {
          inactiveReason: this.inactiveReason || null
        }

        if (this.tipoInatividade === 'dias') {
          data.days = this.dias
        } else {
          data.inactiveUntil = null
        }

        // Marcar como inativo
        await MarcarUsuarioInativo(this.usuarioSelecionado.id || this.usuarioSelecionado.userId, data)

        this.$q.notify({
          type: 'positive',
          progress: true,
          position: 'top',
          message: 'Usuário marcado como inativo!',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })

        this.$emit('modalUsuarioInativo:usuario-inativado')
        this.fecharModal()
      } catch (error) {
        this.loading = false
        console.error(error)
        const errorMessage = error?.response?.data?.message || error?.message || 'Erro ao inativar usuário'

        this.$q.dialog({
          title: 'Erro',
          message: errorMessage,
          persistent: true,
          ok: {
            label: 'OK',
            color: 'primary'
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
