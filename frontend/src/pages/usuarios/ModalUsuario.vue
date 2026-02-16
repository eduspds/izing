<template>
  <q-dialog
    persistent
    :value="modalUsuario"
    @hide="fecharModal"
    @show="abrirModal"
  >
    <q-card class="rounded-xl" style="width: 600px">
      <q-card-section>
        <div class="text-h6">{{ usuario.id ? 'Editar Usuário' : (isProfile ? 'Meu perfil' : 'Convidar usuário') }}</div>
      </q-card-section>
      <q-card-section class="q-col-gutter-sm">
        <!-- Convidar: apenas e-mail, perfil e filas -->
        <template v-if="!usuario.id && !isProfile">
          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <c-input
                outlined
                :validator="$v.usuario.email"
                @blur="$v.usuario.email.$touch"
                v-model.trim="usuario.email"
                label="E-mail do convidado"
              />
            </div>
          </div>
          <div class="row q-col-gutter-sm q-mt-sm">
            <div class="col-12">
              <q-select
                outlined
                v-model="usuario.profile"
                :options="optionsProfile"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                label="Perfil"
              />
            </div>
          </div>
          <div v-if="usuario.profile === 'manager'" class="q-mt-md">
            <div class="text-subtitle2 q-mb-sm">Departamentos que o Gerente pode gerenciar:</div>
            <q-select
              outlined
              v-model="usuario.managerQueues"
              :options="filasAtivas"
              option-value="id"
              option-label="queue"
              emit-value
              map-options
              multiple
              chips
              label="Selecione os departamentos"
              :rules="[val => val && val.length > 0 || 'Selecione pelo menos um departamento']"
            />
          </div>
        </template>
        <!-- Editar ou Perfil: nome, e-mail, perfil, filas -->
        <template v-else>
          <div class="row q-col-gutter-sm">
            <div class="col-5">
              <c-input
                outlined
                v-model.trim="usuario.name"
                :validator="$v.usuario.name"
                @blur="$v.usuario.name.$touch"
                label="Nome"
              />
            </div>
            <div class="col-7">
              <c-input
                outlined
                :disable="isProfile"
                :validator="$v.usuario.email"
                @blur="$v.usuario.email.$touch"
                v-model.trim="usuario.email"
                label="E-mail"
              />
            </div>
          </div>
          <div class="row q-col-gutter-sm" v-if="!isProfile">
            <div class="col-5">
              <q-select
                outlined
                v-model="usuario.profile"
                :options="optionsProfile"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                label="Perfil"
              />
            </div>
            <div class="col-7" />
          </div>
          <!-- Alterar senha (apenas no perfil) -->
          <div v-if="isProfile" class="q-mt-md rounded-xl q-pa-md change-password-block">
            <div class="text-subtitle2 q-mb-sm">Alterar senha</div>
            <c-input
              outlined
              v-model="usuario.currentPassword"
              :type="isPwdCurrent ? 'password' : 'text'"
              label="Senha atual"
              class="q-mb-sm"
            >
              <template v-slot:append>
                <q-icon :name="isPwdCurrent ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwdCurrent = !isPwdCurrent" />
              </template>
            </c-input>
            <c-input
              outlined
              v-model="usuario.password"
              :validator="$v.usuario.passwordNew"
              @blur="$v.usuario.passwordNew.$touch"
              :type="isPwd ? 'password' : 'text'"
              label="Nova senha"
              class="q-mb-sm"
            >
              <template v-slot:append>
                <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd" />
              </template>
            </c-input>
            <c-input
              outlined
              v-model="usuario.confirmPassword"
              :validator="$v.usuario.confirmPassword"
              @blur="$v.usuario.confirmPassword.$touch"
              :type="isPwdConfirm ? 'password' : 'text'"
              label="Confirmar nova senha"
            >
              <template v-slot:append>
                <q-icon :name="isPwdConfirm ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwdConfirm = !isPwdConfirm" />
              </template>
            </c-input>
          </div>
          <!-- Seção para Gerente - Seleção de Filas -->
          <div v-if="!isProfile && usuario.profile === 'manager'" class="q-mt-md">
          <div class="text-subtitle2 q-mb-sm">Departamentos que o Gerente pode gerenciar:</div>
          <q-select
            outlined
            v-model="usuario.managerQueues"
            :options="filasAtivas"
            option-value="id"
            option-label="queue"
            emit-value
            map-options
            multiple
            chips
            label="Selecione os departamentos"
            :rules="[val => val && val.length > 0 || 'Selecione pelo menos um departamento']"
          />
          </div>
        </template>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="Sair" class="q-px-md q-mr-sm rounded-xl" color="negative" v-close-popup />
        <q-btn
          :label="(usuario.id || isProfile) ? 'Salvar' : 'Enviar convite'"
          class="q-px-md rounded-xl"
          color="primary"
          @click="handleUsuario"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { required, email, minLength, maxLength } from 'vuelidate/lib/validators'
import { CriarUsuario, UpdateUsuarios } from 'src/service/user'
import { ListarFilas } from 'src/service/filas'
export default {
  name: 'ModalUsuario',
  props: {
    modalUsuario: {
      type: Boolean,
      default: false
    },
    isProfile: {
      type: Boolean,
      default: false
    },
    usuarioEdicao: {
      type: Object,
      default: () => { return { id: null } }
    }
  },
  data () {
    return {
      isPwd: false,
      isPwdCurrent: false,
      isPwdConfirm: false,
      filasAtivas: [],
      optionsProfile: [
        { value: 'user', label: 'Usuário' },
        { value: 'manager', label: 'Gerente' },
        { value: 'admin', label: 'Administrador' }
      ],
      usuario: {
        name: '',
        email: '',
        password: '',
        currentPassword: '',
        confirmPassword: '',
        profile: 'user',
        managerQueues: []
      }
    }
  },
  validations () {
    const base = {
      name: { required, minLength: minLength(3), maxLength: maxLength(50) },
      email: { required, email },
      profile: { required },
      password: {},
      currentPassword: {},
      confirmPassword: {},
      passwordNew: { minLength: minLength(6), maxLength: maxLength(50) }
    }
    if (!this.usuario.id && !this.isProfile) {
      return { usuario: { email: base.email, profile: base.profile } }
    }
    if (this.isProfile) {
      return {
        usuario: {
          name: base.name,
          email: base.email,
          passwordNew: base.passwordNew,
          confirmPassword: { sameAsPassword (v) { return v === this.usuario.password } }
        }
      }
    }
    return { usuario: { name: base.name, email: base.email, profile: base.profile } }
  },
  methods: {
    async carregarFilasAtivas () {
      try {
        const { data } = await ListarFilas()
        this.filasAtivas = data.filter(fila => fila.isActive)
      } catch (error) {
        console.error('Erro ao carregar departamentos:', error)
      }
    },
    abrirModal () {
      this.carregarFilasAtivas()
      if (this.usuarioEdicao.id) {
        this.usuario = {
          ...this.usuarioEdicao,
          managerQueues: this.usuarioEdicao.managerQueues || []
        }
      }
      if (this.usuarioEdicao.userId) {
        this.usuario = {
          ...this.usuarioEdicao,
          id: this.usuarioEdicao.userId,
          name: this.usuarioEdicao.username,
          profile: this.usuarioEdicao.profile,
          managerQueues: this.usuarioEdicao.managerQueues || []
        }
      }
    },
    fecharModal () {
      if (!this.isProfile) {
        this.$emit('update:usuarioEdicao', {})
      }
      this.$emit('update:modalUsuario', false)
      this.usuario = {
        name: '',
        email: '',
        password: '',
        currentPassword: '',
        confirmPassword: '',
        profile: 'user',
        managerQueues: []
      }
      this.isPwd = false
      this.isPwdCurrent = false
      this.isPwdConfirm = false
      this.$v.usuario.$reset()
    },
    async handleUsuario () {
      this.$v.usuario.$touch()
      if (this.$v.usuario.$error) {
        return this.$q.notify({
          type: 'warning',
          progress: true,
          position: 'top',
          message: 'Ops! Verifique os erros...',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      }

      // Validação específica para gerentes
      if (this.usuario.profile === 'manager' && (!this.usuario.managerQueues || this.usuario.managerQueues.length === 0)) {
        return this.$q.notify({
          type: 'warning',
          progress: true,
          position: 'top',
          textColor: 'black',
          message: 'Gerente deve ter pelo menos uma fila atribuída!',
          actions: [{ icon: 'close', round: true, color: 'white' }]
        })
      }

      // Alterar senha no perfil: exigir senha atual e nova + confirmação
      if (this.isProfile && (this.usuario.password || this.usuario.confirmPassword)) {
        if (!this.usuario.currentPassword) {
          return this.$q.notify({
            type: 'warning',
            progress: true,
            position: 'top',
            message: 'Informe a senha atual para alterar a senha.'
          })
        }
        this.$v.usuario.passwordNew.$touch()
        this.$v.usuario.confirmPassword.$touch()
        if (this.$v.usuario.passwordNew.$error || this.$v.usuario.confirmPassword.$error) {
          return this.$q.notify({
            type: 'warning',
            progress: true,
            position: 'top',
            message: 'Nova senha: mínimo 6 caracteres e confirmação deve coincidir.'
          })
        }
      }

      try {
        if (this.usuario.id) {
          const isAdmin = this.$store.state.user.isAdmin ||
                         this.$store.state.user.isSuporte ||
                         localStorage.getItem('profile') === 'admin'
          if (!isProfile && !isAdmin && !this.$store.state.user.isSuporte) {
            this.$q.notify({
              type: 'warning',
              progress: true,
              position: 'top',
              message: 'Sessão expirada. Redirecionando para login...'
            })
            localStorage.clear()
            this.$router.push('/login')
            return
          }

          const params = {
            email: this.usuario.email,
            name: this.usuario.name
          }
          if (isProfile) {
            if (this.usuario.password) {
              params.currentPassword = this.usuario.currentPassword
              params.password = this.usuario.password
            }
          } else if (isAdmin) {
            params.profile = this.usuario.profile
            params.managerQueues = this.usuario.profile === 'manager'
              ? (this.usuario.managerQueues || []).map(q => typeof q === 'object' ? q.id : q)
              : []
          }

          const { data } = await UpdateUsuarios(this.usuario.id, params)
          this.$emit('modalUsuario:usuario-editado', data)
          this.$q.notify({
            type: 'positive',
            progress: true,
            position: 'top',
            message: this.isProfile ? 'Perfil atualizado!' : 'Usuário editado!'
          })
        } else {
          const { data } = await CriarUsuario({
            email: this.usuario.email.trim(),
            profile: this.usuario.profile,
            managerQueues: (this.usuario.managerQueues || []).map(q => typeof q === 'object' ? q.id : q)
          })
          this.$emit('modalUsuario:usuario-criado', data)
          if (data.inviteLink) {
            const link = data.inviteLink
            const msg = 'Copie o link abaixo e envie ao convidado (por WhatsApp, e-mail, etc.).<br><br><strong>Link do convite:</strong><br><span style="word-break: break-all; font-size: 12px;">' + link + '</span>'
            this.$q.dialog({
              title: 'Convite criado',
              message: msg,
              html: true,
              ok: { label: 'Copiar link', color: 'primary' },
              cancel: 'Fechar',
              persistent: true
            }).onOk(() => {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(link)
                this.$q.notify({ type: 'positive', message: 'Link copiado!', position: 'top', timeout: 2000 })
              }
            })
            this.$q.notify({
              type: 'positive',
              progress: true,
              position: 'top',
              message: data.message || 'Convite criado. Copie o link e envie ao convidado.'
            })
          } else {
            this.$q.notify({
              type: 'positive',
              progress: true,
              position: 'top',
              message: data.message || 'Convite enviado por e-mail!'
            })
          }
        }
        this.$emit('update:modalUsuario', false)
      } catch (error) {
        const res = error?.response || error
        const msg = res?.data?.error || 'Erro ao salvar.'
        this.$q.notify({
          type: 'negative',
          progress: true,
          position: 'top',
          message: msg
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
