<template>
    <q-dialog
      persistent
      :value="modalMotivoEncerramento"
      @hide="fecharModal"
      @show="abrirModal"
    >
      <q-card
        style="width: 500px"
        class="q-pa-lg"
      >
        <q-card-section>
          <div class="text-h6">{{ motivo.id ? 'Editar' : 'Criar' }} Motivo de Encerramento</div>
        </q-card-section>
        <q-card-section>
          <q-input
            class="row col"
            square
            outlined
            v-model="motivo.message"
            label="Mensagem do Motivo"
            type="textarea"
            autogrow
            :rules="[val => !!val || 'Campo obrigatório']"
          />
          <q-checkbox
            v-model="motivo.canKanban"
            label="Permitir Kanban"
          />
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
            @click="handleMotivo"
            :disable="!motivo.message"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </template>

<script>
import { CriarMotivoEncerramento, AtualizarMotivoEncerramento } from 'src/service/motivoEncerramento'

export default {
  name: 'ModalMotivoEncerramento',
  props: {
    modalMotivoEncerramento: {
      type: Boolean,
      default: false
    },
    motivoEdicao: {
      type: Object,
      default: () => {
        return { id: null }
      }
    }
  },
  data () {
    return {
      motivo: {
        id: null,
        message: null,
        canKanban: false
      },
      loading: false
    }
  },
  methods: {
    resetarMotivo () {
      this.motivo = {
        id: null,
        message: null,
        canKanban: false
      }
    },
    fecharModal () {
      this.resetarMotivo()
      this.$emit('update:motivoEdicao', { id: null })
      this.$emit('update:modalMotivoEncerramento', false)
    },
    abrirModal () {
      if (this.motivoEdicao.id) {
        this.motivo = {
          id: this.motivoEdicao.id,
          message: this.motivoEdicao.message,
          canKanban: Boolean(this.motivoEdicao.canKanban)
        }
      } else {
        this.resetarMotivo()
      }
    },
    async handleMotivo () {
      try {
        this.loading = true

        if (this.motivo.id) {
          const { data } = await AtualizarMotivoEncerramento(this.motivo.id, this.motivo)
          this.$emit('motivo-encerramento:editado', data)
          this.$q.notify({
            type: 'info',
            progress: true,
            position: 'top',
            textColor: 'white',
            message: 'Motivo atualizado!',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        } else {
          const { data } = await CriarMotivoEncerramento(this.motivo)
          this.$emit('motivo-encerramento:criado', data)
          this.$q.notify({
            type: 'positive',
            progress: true,
            position: 'top',
            message: 'Motivo criado!',
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
        this.$notificarErro('Ocorreu um erro ao salvar o motivo', error)
        this.loading = false
      }
    }
  }
}
</script>

  <style lang="scss" scoped>
  </style>
