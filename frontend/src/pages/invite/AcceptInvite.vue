<template>
  <div class="invite-page q-pa-md">
    <q-layout class="vertical-center">
      <q-page-container>
        <q-page class="flex justify-center items-center">
          <q-ajax-bar position="top" color="primary" size="5px" />
          <q-card
            bordered
            class="invite-card shadow-10 rounded-xl q-pa-lg"
            style="max-width: 440px; width: 100%"
          >
            <q-card-section class="text-center q-pb-none">
              <q-img
                src="/logo horizontal.png"
                spinner-color="primary"
                style="height: 64px; max-width: 280px"
                class="q-mb-md"
              />
              <div class="text-h6 text-weight-medium q-mt-md">
                Olá! Você foi convidado para o sistema.
              </div>
              <div class="text-body2 text-grey-7 q-mt-sm">
                Defina seu nome e senha abaixo para ativar sua conta.
              </div>
            </q-card-section>

            <q-card-section v-if="!tokenValid && !loadingValidate" class="text-center">
              <q-icon name="mdi-link-variant-off" size="48px" color="negative" />
              <div class="text-body1 q-mt-md">{{ invalidMessage }}</div>
              <q-btn
                flat
                color="primary"
                label="Ir para o login"
                class="q-mt-md"
                to="/login"
              />
            </q-card-section>

            <q-card-section v-else-if="tokenValid" class="q-pt-md">
              <q-form @submit="onSubmit" class="q-gutter-md">
                <q-input
                  v-model.trim="form.name"
                  outlined
                  label="Nome"
                  :error="$v.form.name.$error"
                  :error-message="nameError"
                  @blur="$v.form.name.$touch"
                  class="rounded-borders"
                  dense
                  hide-bottom-space
                >
                  <template v-slot:prepend>
                    <q-icon name="mdi-account-outline" color="primary" />
                  </template>
                </q-input>
                <q-input
                  v-model="form.password"
                  outlined
                  :type="showPwd ? 'text' : 'password'"
                  label="Senha"
                  :error="$v.form.password.$error"
                  :error-message="passwordError"
                  @blur="$v.form.password.$touch"
                  class="rounded-borders"
                  dense
                  hide-bottom-space
                >
                  <template v-slot:prepend>
                    <q-icon name="mdi-lock-outline" color="primary" />
                  </template>
                  <template v-slot:append>
                    <q-icon
                      :name="showPwd ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showPwd = !showPwd"
                    />
                  </template>
                </q-input>
                <q-input
                  v-model="form.confirmPassword"
                  outlined
                  :type="showConfirmPwd ? 'text' : 'password'"
                  label="Confirmar senha"
                  :error="$v.form.confirmPassword.$error"
                  :error-message="confirmError"
                  @blur="$v.form.confirmPassword.$touch"
                  class="rounded-borders"
                  dense
                  hide-bottom-space
                >
                  <template v-slot:prepend>
                    <q-icon name="mdi-lock-check-outline" color="primary" />
                  </template>
                  <template v-slot:append>
                    <q-icon
                      :name="showConfirmPwd ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showConfirmPwd = !showConfirmPwd"
                    />
                  </template>
                </q-input>
                <div class="row justify-end q-mt-md">
                  <q-btn
                    type="submit"
                    color="primary"
                    :loading="loadingSubmit"
                    label="Ativar conta"
                    class="rounded-xl q-px-lg"
                  />
                </div>
              </q-form>
            </q-card-section>

            <q-card-section v-else class="text-center">
              <q-spinner-dots color="primary" size="40px" />
              <div class="text-caption q-mt-sm">Validando convite...</div>
            </q-card-section>
          </q-card>
        </q-page>
      </q-page-container>
    </q-layout>
  </div>
</template>

<script>
import { required, minLength, maxLength } from 'vuelidate/lib/validators'
import { ValidarTokenConvite, AceitarConvite } from 'src/service/user'

export default {
  name: 'AcceptInvite',
  data () {
    return {
      token: '',
      tokenValid: false,
      loadingValidate: true,
      loadingSubmit: false,
      invalidMessage: 'Link de convite inválido ou expirado.',
      showPwd: false,
      showConfirmPwd: false,
      form: {
        name: '',
        password: '',
        confirmPassword: ''
      }
    }
  },
  validations: {
    form: {
      name: {
        required,
        minLength: minLength(3),
        maxLength: maxLength(50)
      },
      password: {
        required,
        minLength: minLength(6),
        maxLength: maxLength(50)
      },
      confirmPassword: {
        required,
        sameAsPassword (value) {
          return value === this.form.password
        }
      }
    }
  },
  computed: {
    nameError () {
      if (!this.$v.form.name.$error) return ''
      if (!this.$v.form.name.required) return 'Nome é obrigatório.'
      if (!this.$v.form.name.minLength) return 'Mínimo 3 caracteres.'
      if (!this.$v.form.name.maxLength) return 'Máximo 50 caracteres.'
      return 'Nome inválido.'
    },
    passwordError () {
      if (!this.$v.form.password.$error) return ''
      if (!this.$v.form.password.required) return 'Senha é obrigatória.'
      if (!this.$v.form.password.minLength) return 'Mínimo 6 caracteres.'
      return 'Senha inválida.'
    },
    confirmError () {
      if (!this.$v.form.confirmPassword.$error) return ''
      if (!this.$v.form.confirmPassword.required) return 'Confirme a senha.'
      if (!this.$v.form.confirmPassword.sameAsPassword) return 'As senhas não coincidem.'
      return 'Confirmação inválida.'
    }
  },
  async mounted () {
    const hash = this.$route.hash || ''
    const query = this.$route.query || {}
    this.token = query.token || (hash.split('?')[1] || '').split('&').find(s => s.startsWith('token='))?.split('=')[1] || ''
    if (!this.token) {
      this.loadingValidate = false
      this.tokenValid = false
      this.invalidMessage = 'Link de convite inválido. Token não informado.'
      return
    }
    try {
      const { data } = await ValidarTokenConvite(this.token)
      this.tokenValid = data.valid === true
      if (!this.tokenValid && data.message) this.invalidMessage = data.message
    } catch (e) {
      this.tokenValid = false
      const res = e?.response || e
      const msg = res?.data?.message || res?.data?.error
      if (msg) this.invalidMessage = msg
    } finally {
      this.loadingValidate = false
    }
  },
  methods: {
    async onSubmit () {
      this.$v.form.$touch()
      if (this.$v.form.$error) {
        this.$q.notify({
          type: 'warning',
          progress: true,
          position: 'top',
          message: 'Verifique os campos e tente novamente.'
        })
        return
      }
      this.loadingSubmit = true
      try {
        await AceitarConvite({
          token: this.token,
          name: this.form.name.trim(),
          password: this.form.password
        })
        this.$q.notify({
          type: 'positive',
          progress: true,
          position: 'top',
          message: 'Conta ativada! Faça login com seu e-mail e senha.'
        })
        this.$router.push('/login')
      } catch (err) {
        const res = err?.response || err
        const msg = res?.data?.error || res?.data?.message || 'Não foi possível ativar a conta.'
        this.$q.notify({
          type: 'negative',
          progress: true,
          position: 'top',
          message: msg
        })
      } finally {
        this.loadingSubmit = false
      }
    }
  }
}
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  background: var(--q-dark-page, #f5f5f5);
}
.invite-card {
  border-radius: 1rem;
  border-top: 4px solid var(--q-color-primary);
}
.rounded-borders :deep(.q-field__control) {
  border-radius: 0.75rem;
}
</style>
