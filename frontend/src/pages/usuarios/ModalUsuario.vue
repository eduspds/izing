<template>
  <q-dialog
    persistent
    :value="modalUsuario"
    @hide="fecharModal"
    @show="abrirModal"
  >
    <q-card style="width: 600px">
      <q-card-section>
        <div class="text-h6">{{ usuario.id ? 'Editar Usuário' : 'Cadastrar Usuário' }}</div>
      </q-card-section>
      <q-card-section class="q-col-gutter-sm">
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
              :validator="$v.usuario.email"
              @blur="$v.usuario.email.$touch"
              v-model.trim="usuario.email"
              label="E-mail"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-5">
            <c-input
              outlined
              v-model="usuario.password"
              :validator="$v.usuario.password"
              @blur="$v.usuario.password.$touch"
              :type="isPwd ? 'password' : 'text'"
              label="Senha"
            >
              <template v-slot:append>
                <q-icon
                  :name="isPwd ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="isPwd = !isPwd"
                />
              </template>
            </c-input>
          </div>
          <div class="col-7">
            <q-select
              :disable="isProfile"
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
        <!-- Seção para Gerente - Seleção de Filas -->
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
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          label="Sair"
          class="q-px-md q-mr-sm"
          color="negative"
          v-close-popup
        />
        <q-btn
          label="Salvar"
          class="q-px-md"
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
        profile: 'user',
        managerQueues: []
      }
    }
  },
  validations () {
    let usuario = {
      name: { required, minLength: minLength(3), maxLength: maxLength(50) },
      email: { required, email },
      profile: { required },
      password: {}
    }
    if (!this.usuario.id) {
      usuario = {
        ...usuario,
        password: { required, minLength: minLength(6), maxLength: maxLength(50) }
      }
    }
    return { usuario }
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
        profile: 'user',
        managerQueues: []
      }
      this.isPwd = false
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

      // Validação específica para gerentes (apenas quando está criando/atribuindo como gerente)
      if (this.usuario.profile === 'manager' && (!this.usuario.managerQueues || this.usuario.managerQueues.length === 0)) {
        return this.$q.notify({
          type: 'warning',
          progress: true,
          position: 'top',
          textColor: 'black',
          message: 'Gerente deve ter pelo menos uma fila atribuída!',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      }

      try {
        if (this.usuario.id) {
          const {
            email, id, name, password
          } = this.usuario

          const params = {
            email,
            id,
            name,
            password
          }

          // Verificar se usuário tem permissão para alterar perfis
          const isAdmin = this.$store.state.user.isAdmin ||
                         this.$store.state.user.isSuporte ||
                         localStorage.getItem('profile') === 'admin'

          // Se não for admin e não for suporte, forçar relogin
          if (!isAdmin && !this.$store.state.user.isSuporte) {
            this.$q.notify({
              type: 'warning',
              progress: true,
              position: 'top',
              message: 'Sessão expirada. Redirecionando para login...',
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })

            // Limpar dados e redirecionar para login
            localStorage.clear()
            this.$router.push('/login')
            return
          }

          if (isAdmin) {
            params.profile = this.usuario.profile
            // Sempre enviar managerQueues, mesmo que seja lista vazia para limpar relacionamentos
            if (this.usuario.profile === 'manager') {
              // Extrair apenas os IDs das filas
              params.managerQueues = this.usuario.managerQueues.map(queue =>
                typeof queue === 'object' ? queue.id : queue
              )
              console.log('ManagerQueues originais:', this.usuario.managerQueues)
              console.log('ManagerQueues IDs extraídos:', params.managerQueues)
            } else {
              params.managerQueues = []
            }
          }
          const { data } = await UpdateUsuarios(this.usuario.id, params)
          this.$emit('modalUsuario:usuario-editado', data)
          this.$q.notify({
            type: 'info',
            progress: true,
            position: 'top',
            textColor: 'black',
            message: 'Usuário editado!',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        } else {
          const { data } = await CriarUsuario(this.usuario)
          this.$emit('modalUsuario:usuario-criado', data)
          this.$q.notify({
            type: 'positive',
            progress: true,
            position: 'top',
            message: 'Usuário criado!',
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
        }
        this.$emit('update:modalUsuario', false)
      } catch (error) {
        console.error(error)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
