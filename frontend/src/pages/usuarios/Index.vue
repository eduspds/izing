<template>
  <div>
    <q-table
      class="my-sticky-dynamic q-ma-lg"
      title="Usuarios"
      :data="usuarios"
      :columns="columns"
      :loading="loading"
      row-key="id"
      :pagination.sync="pagination"
      :rows-per-page-options="[0]"
    >
      <template v-slot:top-right>
        <q-input
          style="width: 300px"
          filled
          dense
          class="col-grow"
          debounce="500"
          v-model="filter"
          clearable
          placeholder="Localize"
          @input="filtrarUsuario"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-btn
          class="q-ml-md col"
          :class="{
            'q-ml-none q-mt-md q-mr-md': $q.screen.width < 500
          }"
          color="primary"
          label="Adicionar"
          @click="usuarioSelecionado = {}; modalUsuario = true"
        />

      </template>
      <template v-slot:body-cell-status="props">
        <q-td class="text-center">
          <q-badge
            :color="props.row.isInactive ? 'negative' : 'positive'"
            :label="props.row.isInactive ? 'Inativo' : 'Ativo'"
          />
        </q-td>
      </template>
      <template v-slot:body-cell-acoes="props">
        <q-td class="text-center">
          <q-btn
            flat
            round
            icon="mdi-arrow-decision-outline"
            @click="gerirFilasUsuario(props.row)"
          >
            <q-tooltip>
              Gestão de departamentos do usuário
            </q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="edit"
            @click="editarUsuario(props.row)"
          />
          <q-btn
            v-if="!props.row.isInactive"
            flat
            round
            icon="mdi-pause-circle-outline"
            @click="abrirModalInativo(props.row)"
          >
            <q-tooltip>
              Marcar como inativo
            </q-tooltip>
          </q-btn>
          <q-btn
            v-if="props.row.isInactive && isAdmin"
            flat
            round
            icon="mdi-play-circle-outline"
            @click="reativarUsuario(props.row)"
          >
            <q-tooltip>
              Reativar usuário
            </q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="mdi-delete"
            @click="deletarUsuario(props.row)"
          />
        </q-td>
      </template>
      <template v-slot:pagination="{ pagination }">
        {{ usuarios.length }}/{{ pagination.rowsNumber }}
      </template>
    </q-table>
    <ModalUsuario
      :modalUsuario.sync="modalUsuario"
      @modalUsuario:usuario-editado="UPDATE_USUARIO"
      @modalUsuario:usuario-criado="usuarioCriado"
      :usuarioEdicao.sync="usuarioSelecionado"
    />
    <ModalFilaUsuario
      :modalFilaUsuario.sync="modalFilaUsuario"
      :usuarioSelecionado.sync="usuarioSelecionado"
      :filas="filas"
      @modalFilaUsuario:sucesso="UPDATE_USUARIO"
    />
    <ModalUsuarioInativo
      :modalUsuarioInativo.sync="modalUsuarioInativo"
      :usuarioSelecionado.sync="usuarioSelecionado"
      @modalUsuarioInativo:usuario-inativado="handleUsuarioInativado"
    />
  </div>
</template>

<script>
// const userId = +localStorage.getItem('userId')
import { ListarUsuarios, DeleteUsuario, ReativarUsuario } from 'src/service/user'
import { ListarFilas } from 'src/service/filas'
import ModalUsuario from './ModalUsuario'
import ModalFilaUsuario from './ModalFilaUsuario'
import ModalUsuarioInativo from './ModalUsuarioInativo'
export default {
  name: 'IndexUsuarios',
  components: { ModalUsuario, ModalFilaUsuario, ModalUsuarioInativo },
  data () {
    return {
      usuarios: [],
      usuarioSelecionado: {},
      modalFilaUsuario: false,
      filas: [],
      optionsProfile: [
        { value: 'user', label: 'Usuário' },
        { value: 'manager', label: 'Gerente' },
        { value: 'admin', label: 'Administrador' }
      ],
      modalUsuario: false,
      modalUsuarioInativo: false,
      filter: null,
      pagination: {
        rowsPerPage: 40,
        rowsNumber: 0,
        lastIndex: 0
      },
      params: {
        pageNumber: 1,
        searchParam: null,
        hasMore: true
      },
      loading: false,
      columns: [
        { name: 'name', label: 'Nome', field: 'name', align: 'left' },
        { name: 'email', label: 'E-mail', field: 'email', align: 'left' },
        {
          name: 'queues',
          label: 'Departamentos',
          field: 'queues',
          align: 'left',
          format: (v) => !v ? '' : v.map(f => f.queue).join(', '),
          classes: 'ellipsis',
          style: 'max-width: 400px;'
        },
        {
          name: 'managerQueues',
          label: 'Gerenciar',
          field: 'managerQueues',
          align: 'left',
          format: (v, row) => this.formatManagerQueues(v, row),
          classes: 'ellipsis',
          style: 'max-width: 400px;'
        },
        { name: 'profile', label: 'Perfil', field: 'profile', align: 'left', format: (v) => this.optionsProfile.find(o => o.value == v).label },
        {
          name: 'status',
          label: 'Status',
          field: 'isInactive',
          align: 'center',
          format: (v, row) => this.formatStatus(v, row)
        },
        { name: 'acoes', label: 'Ações', field: 'acoes', align: 'center' }
      ]
    }
  },
  methods: {
    LOAD_USUARIOS (users) {
      const newUsers = []
      users.forEach(user => {
        const userIndex = this.usuarios.findIndex(c => c.id === user.id)
        if (userIndex !== -1) {
          this.usuarios[userIndex] = user
        } else {
          newUsers.push(user)
        }
      })
      const usersObj = [...this.usuarios, ...newUsers]
      this.usuarios = usersObj
    },
    UPDATE_USUARIO (usuario) {
      let newUsuarios = [...this.usuarios]
      const usuarioIndex = newUsuarios.findIndex(c => c.id === usuario.id)
      if (usuarioIndex !== -1) {
        newUsuarios[usuarioIndex] = usuario
      } else {
        newUsuarios = [usuario, ...newUsuarios]
      }
      this.usuarios = [...newUsuarios]
    },
    DELETE_USUARIO (userId) {
      const newObj = [...this.usuarios.filter(u => u.id !== userId)]
      this.usuarios = [...newObj]
    },
    async listarUsuarios () {
      this.loading = true
      const { data } = await ListarUsuarios(this.params)
      this.usuarios = data.users
      this.LOAD_USUARIOS(data.users)
      this.params.hasMore = data.hasMore
      this.pagination.lastIndex = this.usuarios.length - 1
      this.pagination.rowsNumber = data.count
      this.loading = false
    },
    filtrarUsuario (data) {
      this.usuarios = []
      this.params.pageNumber = 1
      this.params.searchParam = data
      this.listarUsuarios()
    },
    onScroll ({ to, ref, ...all }) {
      if (this.loading !== true && this.params.hasMore === true && to === this.pagination.lastIndex) {
        this.params.pageNumber++
        this.listarUsuarios()
      }
    },
    usuarioCriado () {
      this.listarUsuarios()
    },
    formatManagerQueues (managerQueues, row) {
      // Se for admin, mostra "Todas as filas"
      if (row.profile === 'admin') {
        return 'Todas os departamentos'
      }

      // Se for manager, mostra as filas que gerencia
      if (row.profile === 'manager' && managerQueues && managerQueues.length > 0) {
        return managerQueues.map(f => f.queue).join(', ')
      }

      // Se for user normal, não mostra nada
      return '-'
    },
    editarUsuario (usuario) {
      this.usuarioSelecionado = usuario
      this.modalUsuario = true
    },
    deletarUsuario (usuario) {
      this.$q.dialog({
        title: `Atenção!! Deseja realmente deletar o usuario "${usuario.name}"?`,
        // message: 'Mensagens antigas não serão apagadas no whatsapp.',
        cancel: {
          label: 'Não',
          color: 'primary',
          push: true
        },
        ok: {
          label: 'Sim',
          color: 'negative',
          push: true
        },
        persistent: true
      }).onOk(() => {
        this.loading = true
        DeleteUsuario(usuario.id)
          .then(res => {
            this.DELETE_USUARIO(usuario.id)
            this.$q.notify({
              type: 'positive',
              progress: true,
              position: 'top',
              message: `Usuario ${usuario.name} deletado!`,
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })
          })
          .catch(error => {
            console.error(error)
            this.$notificarErro('Não é possível deletar o usuário', error)
          })
        this.loading = false
      })
    },
    async listarFilas () {
      const { data } = await ListarFilas()
      // Filtrar apenas departamentos ativos
      this.filas = data.filter(fila => fila.isActive === true)
    },
    gerirFilasUsuario (usuario) {
      this.usuarioSelecionado = usuario
      this.modalFilaUsuario = true
    },
    formatStatus (isInactive, row) {
      if (isInactive) {
        if (row.inactiveUntil) {
          const date = new Date(row.inactiveUntil)
          return `Inativo até ${date.toLocaleDateString('pt-BR')}`
        }
        return 'Inativo (indeterminado)'
      }
      return 'Ativo'
    },
    abrirModalInativo (usuario) {
      this.usuarioSelecionado = usuario
      this.modalUsuarioInativo = true
    },
    async handleUsuarioInativado () {
      // Recarregar lista de usuários para atualizar status
      await this.listarUsuarios()
    },
    async reativarUsuario (usuario) {
      this.$q.dialog({
        title: `Reativar usuário "${usuario.name}"?`,
        message: 'O usuário será reativado e poderá receber tickets novamente.',
        cancel: {
          label: 'Cancelar',
          color: 'primary',
          push: true
        },
        ok: {
          label: 'Reativar',
          color: 'positive',
          push: true
        },
        persistent: true
      }).onOk(async () => {
        this.loading = true
        try {
          await ReativarUsuario(usuario.id)
          this.$q.notify({
            type: 'positive',
            progress: true,
            position: 'top',
            message: `Usuário ${usuario.name} reativado!`,
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
          await this.listarUsuarios()
        } catch (error) {
          console.error(error)
          this.$notificarErro('Não é possível reativar o usuário', error)
        }
        this.loading = false
      })
    }
  },
  computed: {
    isAdmin () {
      return this.$store.state.user.isAdmin ||
             this.$store.state.user.isSuporte ||
             localStorage.getItem('profile') === 'admin'
    }
  },
  async mounted () {
    await this.listarFilas()
    await this.listarUsuarios()
  }
}
</script>

<style lang="scss" scoped>
</style>
