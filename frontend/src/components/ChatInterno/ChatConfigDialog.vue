<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 600px; max-width: 800px">
      <q-card-section class="row items-center">
        <q-icon name="settings" size="md" class="q-mr-sm" />
        <span class="text-h6">Configurações do Chat Interno</span>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="q-gutter-md">
          <!-- Restrições de Comunicação -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="chat" class="q-mr-sm" />
                Restrições de Comunicação
              </div>

              <q-radio
                v-model="config.communicationRestriction"
                val="none"
                label="Sem restrições - Todos podem conversar"
                class="q-mb-sm"
              />
              <q-radio
                v-model="config.communicationRestriction"
                val="sameQueue"
                label="Apenas usuários do mesmo departamento"
                class="q-mb-sm"
              />
              <q-radio
                v-model="config.communicationRestriction"
                val="sameProfile"
                label="Apenas usuários do mesmo perfil"
                class="q-mb-sm"
              />
            </q-card-section>
          </q-card>

          <!-- Permissões de Grupos -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="group" class="q-mr-sm" />
                Permissões de Grupos
              </div>

              <div class="q-gutter-sm">
                <q-checkbox
                  v-model="config.allowUsersCreateGroups"
                  label="Permitir usuários criarem grupos"
                  class="q-mb-sm"
                />
                <q-checkbox
                  v-model="config.allowUsersAddMembers"
                  label="Permitir usuários adicionarem membros"
                  class="q-mb-sm"
                />
                <q-checkbox
                  v-model="config.onlyManagersCreateGroups"
                  label="Apenas gerentes podem criar grupos"
                  class="q-mb-sm"
                />
                <q-checkbox
                  v-model="config.onlyManagersAddMembers"
                  label="Apenas gerentes podem adicionar membros"
                  class="q-mb-sm"
                />
              </div>
            </q-card-section>
          </q-card>

          <!-- Restrições por Departamento -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="business" class="q-mr-sm" />
                Restrições por Departamento
              </div>

              <div class="q-gutter-sm">
                <q-checkbox
                  v-model="config.restrictGroupsByQueue"
                  label="Restringir grupos por departamento"
                  class="q-mb-sm"
                />
                <q-checkbox
                  v-model="config.restrictGroupsByProfile"
                  label="Restringir grupos por perfil"
                  class="q-mb-sm"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancelar" color="primary" v-close-popup />
        <q-btn
          label="Salvar"
          color="primary"
          :loading="loading"
          @click="saveConfig"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { obterConfiguracaoChatInterno, salvarConfiguracaoChatInterno } from 'src/service/internalChatConfig'

export default {
  name: 'ChatConfigDialog',
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      show: this.value,
      loading: false,
      config: {
        communicationRestriction: 'none',
        allowUsersCreateGroups: true,
        allowUsersAddMembers: true,
        onlyManagersCreateGroups: false,
        onlyManagersAddMembers: false,
        restrictGroupsByQueue: false,
        restrictGroupsByProfile: false
      }
    }
  },
  watch: {
    value (newVal) {
      this.show = newVal
      if (newVal) {
        this.loadConfig()
      }
    },
    show (newVal) {
      this.$emit('input', newVal)
    }
  },
  methods: {
    async loadConfig () {
      this.loading = true
      try {
        const { data } = await obterConfiguracaoChatInterno()
        this.config = { ...data }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao carregar configurações'
        })
      } finally {
        this.loading = false
      }
    },

    async saveConfig () {
      this.loading = true
      try {
        await salvarConfiguracaoChatInterno(this.config)
        this.$q.notify({
          type: 'positive',
          message: 'Configurações salvas com sucesso!'
        })
        this.show = false
      } catch (error) {
        console.error('Erro ao salvar configurações:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao salvar configurações'
        })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.q-card {
  border-radius: 8px;
}

.q-radio {
  display: block;
}
</style>
