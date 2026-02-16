<template>
  <q-dialog
    persistent
    :value="modalRelease"
    @hide="fecharModal"
    @show="abrirModal"
  >
    <q-card style="min-width: 80vw; width: 80vw" class="q-pa-lg">
      <q-card-section>
        <div class="text-h6">
          {{ releaseEdicao.id ? 'Editar' : 'Criar' }} Release
        </div>
      </q-card-section>
      <q-card-section>
        <fieldset class="q-pa-md full-width">
          <legend class="q-px-sm">Dados da Release</legend>
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-sm-6">
              <q-input
                square
                outlined
                v-model="release.version"
                label="Versão (SemVer)"
                hint="Formato: 1.0.5, 2.1.0, etc."
                @blur="$v.release.version.$touch"
                :error="$v.release.version.$error"
                :error-message="
                  $v.release.version.$error
                    ? 'Versão deve seguir o formato SemVer (ex: 1.0.5)'
                    : ''
                "
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <q-input
                square
                outlined
                v-model="release.title"
                label="Título"
                @blur="$v.release.title.$touch"
                :error="$v.release.title.$error"
                error-message="Obrigatório"
              />
            </div>
            <div class="col-xs-12">
              <q-input
                square
                outlined
                v-model="release.description"
                label="Descrição"
                type="textarea"
                rows="5"
                hint="Pode usar HTML ou Markdown"
                @blur="$v.release.description.$touch"
                :error="$v.release.description.$error"
                error-message="Obrigatório"
              />
            </div>
            <div class="col-xs-12">
              <q-toggle
                v-model="release.forceRefresh"
                label="Forçar atualização imediata"
                hint="Se ativado, o usuário não poderá fechar o modal e será obrigado a atualizar"
              />
            </div>
          </div>
        </fieldset>
      </q-card-section>
      <q-card-actions align="right" class="q-mt-md">
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
          :loading="loading"
          @click="handleRelease"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { required } from 'vuelidate/lib/validators'

const semVerPattern = (value) => {
  if (!value) return false
  return /^\d+\.\d+\.\d+$/.test(value)
}

import { CriarRelease, AtualizarRelease } from 'src/service/releases'

export default {
  name: 'ModalRelease',
  props: {
    modalRelease: {
      type: Boolean,
      default: false
    },
    releaseEdicao: {
      type: Object,
      default: () => {
        return { id: null }
      }
    }
  },
  data () {
    return {
      loading: false,
      release: {
        id: null,
        version: null,
        title: null,
        description: null,
        forceRefresh: false
      }
    }
  },
  validations: {
    release: {
      version: { required, semVerPattern },
      title: { required },
      description: { required }
    }
  },
  methods: {
    resetarRelease () {
      this.release = {
        id: null,
        version: null,
        title: null,
        description: null,
        forceRefresh: false
      }
    },
    fecharModal () {
      this.resetarRelease()
      this.$emit('update:releaseEdicao', { id: null })
      this.$emit('update:modalRelease', false)
    },
    abrirModal () {
      if (this.releaseEdicao.id) {
        this.release = { ...this.releaseEdicao }
      } else {
        this.resetarRelease()
      }
    },
    async handleRelease () {
      this.$v.release.$touch()
      if (this.$v.release.$error) {
        this.$notificarErro(
          'Verifique os campos obrigatórios e inconsistências.'
        )
        return
      }
      try {
        this.loading = true
        if (this.release.id) {
          const { data } = await AtualizarRelease(this.release.id, this.release)
          this.$emit('modal-release:editada', data)
          this.$notificarSucesso('Release editada')
        } else {
          const { data } = await CriarRelease(this.release)
          this.$emit('modal-release:criada', data)
          this.$notificarSucesso('Release criada')
        }
        this.loading = false
        this.fecharModal()
      } catch (error) {
        console.error(error)
        this.$notificarErro('Ocorreu um erro!', error)
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped></style>
