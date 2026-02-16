<template>
  <div class="q-pa-lg">
    <q-card flat bordered class="rounded-borders q-pa-lg shadow-2" style="max-width: 1200px; margin: 0 auto;">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-grey-9 q-mb-md">Gestão de Permissões</div>
        <p class="text-body2 text-grey-7 q-mb-none">
          Selecione um usuário e marque as permissões que ele pode acessar. Administradores têm acesso total.
        </p>
      </q-card-section>

      <q-card-section class="row q-col-gutter-lg">
        <!-- Lista de usuários -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="rounded-borders overflow-hidden">
            <q-card-section class="bg-grey-2">
              <div class="text-subtitle1 text-weight-medium">Usuários</div>
              <q-input
                v-model="searchUser"
                dense
                outlined
                placeholder="Buscar usuário..."
                debounce="400"
                class="q-mt-sm"
                @input="carregarUsuarios"
              >
                <template v-slot:prepend>
                  <q-icon name="search" size="sm" />
                </template>
              </q-input>
            </q-card-section>
            <q-separator />
            <q-scroll-area style="height: 320px;">
              <q-list separator>
                <q-item
                  v-for="u in users"
                  :key="u.id"
                  clickable
                  :active="selectedUser && selectedUser.id === u.id"
                  active-class="bg-primary-1 text-primary"
                  @click="selecionarUsuario(u)"
                >
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white" size="36">
                      {{ (u.name || 'U').charAt(0).toUpperCase() }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ u.name }}</q-item-label>
                    <q-item-label caption>{{ u.email }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge :color="u.profile === 'admin' ? 'primary' : 'grey'" :label="u.profile" />
                  </q-item-section>
                </q-item>
                <q-item v-if="users.length === 0 && !loadingUsers">
                  <q-item-section class="text-grey-6 text-center">Nenhum usuário encontrado.</q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
            <q-inner-loading :showing="loadingUsers">
              <q-spinner size="40" color="primary" />
            </q-inner-loading>
          </q-card>
        </div>

        <!-- Grid de permissões do usuário selecionado -->
        <div class="col-12 col-md-8">
          <q-card v-if="selectedUser" flat bordered class="rounded-borders overflow-hidden">
            <q-card-section class="bg-grey-2 row items-center justify-between">
              <div>
                <span class="text-subtitle1 text-weight-medium">{{ selectedUser.name }}</span>
                <span class="text-caption text-grey-7 q-ml-sm">({{ selectedUser.email }})</span>
              </div>
              <q-btn
                color="primary"
                label="Salvar permissões"
                :loading="saving"
                unelevated
                @click="salvarPermissoes"
              />
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="text-caption text-grey-7 q-mb-sm">
                Marque as permissões que este usuário pode acessar. Perfil Admin não usa esta lista (acesso total).
              </div>
              <div class="row q-col-gutter-sm">
                <div
                  v-for="perm in allPermissions"
                  :key="perm.id"
                  class="col-12 col-sm-6 col-md-4"
                >
                  <q-item tag="label" v-ripple dense class="rounded-borders bg-grey-1 q-pa-sm">
                    <q-item-section side>
                      <q-checkbox
                        :value="userPermissionIds.includes(perm.id)"
                        @input="togglePermission(perm.id)"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-body2">{{ perm.name }}</q-item-label>
                      <q-item-label v-if="perm.description" caption class="text-grey-7">{{ perm.description }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </div>
              </div>
            </q-card-section>
            <q-inner-loading :showing="loadingUserPerms">
              <q-spinner size="40" color="primary" />
            </q-inner-loading>
          </q-card>
          <q-card v-else flat bordered class="rounded-borders flex flex-center" style="min-height: 320px;">
            <div class="text-grey-6 text-center q-pa-lg">
              <q-icon name="person_search" size="64px" class="q-mb-md block" />
              <div class="text-body1">Selecione um usuário ao lado para gerenciar permissões.</div>
            </div>
          </q-card>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { listPermissions, listUsers, getUserPermissions, updateUserPermissions } from 'src/service/permissions'
import { Notify } from 'quasar'

export default {
  name: 'PermissionsIndex',
  data () {
    return {
      users: [],
      allPermissions: [],
      selectedUser: null,
      userPermissionIds: [],
      searchUser: '',
      loadingUsers: false,
      loadingUserPerms: false,
      saving: false
    }
  },
  async mounted () {
    await this.carregarPermissoes()
    await this.carregarUsuarios()
  },
  methods: {
    async carregarPermissoes () {
      try {
        const res = await listPermissions()
        this.allPermissions = res.data || []
      } catch (e) {
        Notify.create({ type: 'negative', message: 'Erro ao carregar permissões.' })
      }
    },
    async carregarUsuarios () {
      this.loadingUsers = true
      try {
        const res = await listUsers({ searchParam: this.searchUser, pageNumber: '1' })
        this.users = res.data?.users || []
      } catch (e) {
        Notify.create({ type: 'negative', message: 'Erro ao carregar usuários.' })
      } finally {
        this.loadingUsers = false
      }
    },
    async selecionarUsuario (user) {
      this.selectedUser = user
      this.loadingUserPerms = true
      this.userPermissionIds = []
      try {
        const res = await getUserPermissions(user.id)
        const perms = res.data?.permissions || []
        this.userPermissionIds = perms.map(p => p.id)
      } catch (e) {
        Notify.create({ type: 'negative', message: 'Erro ao carregar permissões do usuário.' })
      } finally {
        this.loadingUserPerms = false
      }
    },
    togglePermission (permissionId) {
      const idx = this.userPermissionIds.indexOf(permissionId)
      if (idx === -1) {
        this.userPermissionIds.push(permissionId)
      } else {
        this.userPermissionIds.splice(idx, 1)
      }
    },
    async salvarPermissoes () {
      if (!this.selectedUser) return
      this.saving = true
      try {
        await updateUserPermissions(this.selectedUser.id, this.userPermissionIds)
        Notify.create({ type: 'positive', message: 'Permissões salvas com sucesso.' })
      } catch (e) {
        Notify.create({ type: 'negative', message: 'Erro ao salvar permissões.' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
