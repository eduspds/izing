<template>
  <q-dialog
    :value="modalEnvioTeste"
    @hide="fecharModal"
    persistent
  >
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Envio de Teste - {{ campanha.name }}</div>
        <q-space />
        <q-btn
          icon="close"
          flat
          round
          dense
          @click="fecharModal"
        />
      </q-card-section>

      <q-card-section>
        <div class="text-caption text-grey-7 q-mb-md">
          Envie uma mensagem de teste para verificar como a campanha ficará antes de programar o envio.
        </div>

        <q-input
          v-model="numeroTeste"
          outlined
          label="Número de Telefone"
          placeholder="Ex: 5511999999999"
          hint="Digite o número com código do país e DDD"
          :error="$v.numeroTeste.$error"
          error-message="Digite um número válido"
          @blur="$v.numeroTeste.$touch"
          clearable
          :loading="loading"
        >
          <template v-slot:prepend>
            <q-icon name="mdi-phone" />
          </template>
        </q-input>

        <div class="q-mt-md">
          <div class="text-subtitle2 text-grey-8 q-mb-xs">Prévia da mensagem:</div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="text-body2" style="white-space: pre-wrap">{{ previewMensagem }}</div>
            <div v-if="campanha.mediaUrl" class="q-mt-sm">
              <q-chip color="primary" text-color="white" icon="mdi-paperclip" size="sm">
                Mídia anexada
              </q-chip>
            </div>
          </q-card>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          label="Cancelar"
          color="grey"
          @click="fecharModal"
          :disable="loading"
        />
        <q-btn
          unelevated
          label="Enviar Teste"
          color="primary"
          icon="mdi-send"
          @click="enviarTeste"
          :loading="loading"
          :disable="$v.$invalid"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { required, minLength, maxLength } from 'vuelidate/lib/validators'
import { EnviarTesteCampanha } from 'src/service/campanhas'

export default {
  name: 'ModalEnvioTeste',
  props: {
    modalEnvioTeste: {
      type: Boolean,
      required: true
    },
    campanha: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      numeroTeste: '',
      loading: false
    }
  },
  validations: {
    numeroTeste: {
      required,
      minLength: minLength(10),
      maxLength: maxLength(15)
    }
  },
  computed: {
    previewMensagem () {
      // Pega a primeira mensagem disponível (message1, message2 ou message3)
      return this.campanha.message1 || this.campanha.message2 || this.campanha.message3 || 'Sem mensagem configurada'
    }
  },
  methods: {
    fecharModal () {
      this.$emit('update:modalEnvioTeste', false)
      this.numeroTeste = ''
      this.$v.$reset()
    },
    async enviarTeste () {
      this.$v.$touch()
      if (this.$v.$invalid) {
        return
      }

      this.loading = true
      try {
        await EnviarTesteCampanha({
          campaignId: this.campanha.id,
          testNumber: this.numeroTeste
        })

        this.$q.notify({
          type: 'positive',
          message: 'Mensagem de teste enviada com sucesso!',
          position: 'top',
          progress: true,
          actions: [{ icon: 'close', round: true, color: 'white' }]
        })

        this.fecharModal()
      } catch (error) {
        console.error('Erro ao enviar teste:', error)
        this.$q.notify({
          type: 'negative',
          message: error.response?.data?.error || 'Erro ao enviar mensagem de teste',
          position: 'top',
          progress: true,
          actions: [{ icon: 'close', round: true, color: 'white' }]
        })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
</style>
