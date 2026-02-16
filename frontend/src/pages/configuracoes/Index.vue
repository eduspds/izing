<template>
  <div>
    <q-list class="text-weight-medium">
      <q-item-label
        header
        class="text-bold text-h6 q-mb-lg"
      >Configurações</q-item-label>

      <q-item-label
        caption
        class="q-mt-lg q-pl-sm"
      >Módulo: Atendimento</q-item-label>
      <q-separator spaced />

      <q-item
        tag="label"
        v-ripple
      >
        <q-item-section>
          <q-item-label>Não visualizar Tickets já atribuidos à outros usuários</q-item-label>
          <q-item-label caption>Somente o usuário responsável pelo ticket e/ou os administradores visualizarão a atendimento.</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-toggle
            v-model="NotViewAssignedTickets"
            false-value="disabled"
            true-value="enabled"
            checked-icon="check"
            keep-color
            :color="NotViewAssignedTickets === 'enabled' ? 'green' : 'negative'"
            size="md"
            unchecked-icon="clear"
            @input="atualizarConfiguracao('NotViewAssignedTickets')"
          />
        </q-item-section>
      </q-item>

      <q-item
        tag="label"
        v-ripple
      >
        <q-item-section>
          <q-item-label>Não visualizar Tickets no ChatBot</q-item-label>
          <q-item-label caption>Somente administradores poderão visualizar tickets que estivem interagindo com o ChatBot.</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-toggle
            v-model="NotViewTicketsChatBot"
            false-value="disabled"
            true-value="enabled"
            checked-icon="check"
            keep-color
            :color="NotViewTicketsChatBot === 'enabled' ? 'green' : 'negative'"
            size="md"
            unchecked-icon="clear"
            @input="atualizarConfiguracao('NotViewTicketsChatBot')"
          />
        </q-item-section>
      </q-item>

      <q-item
        tag="label"
        v-ripple
      >
        <q-item-section>
          <q-item-label>Forçar atendimento via Responsáveis</q-item-label>
          <q-item-label caption>Caso o contato tenha responsáveis vínculados, o sistema irá direcionar o atendimento somente para os donos da responsáveis de clientes.</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-toggle
            v-model="DirectTicketsToWallets"
            false-value="disabled"
            true-value="enabled"
            checked-icon="check"
            keep-color
            :color="DirectTicketsToWallets === 'enabled' ? 'green' : 'negative'"
            size="md"
            unchecked-icon="clear"
            @input="atualizarConfiguracao('DirectTicketsToWallets')"
          />
        </q-item-section>
      </q-item>

      <q-item
        tag="label"
        v-ripple
      >
        <q-item-section>
          <q-item-label>Fluxo padrão para o Bot de atendimento</q-item-label>
          <q-item-label caption>Fluxo padrão a ser utilizado pelo Bot para os novos atendimentos.</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-select
            style="width: 300px"
            outlined
            dense
            v-model="botTicketActive"
            :options="listaChatFlow"
            map-options
            emit-value
            option-value="id"
            option-label="name"
            @input="atualizarConfiguracao('botTicketActive')"
          />
        </q-item-section>
      </q-item>

      <q-item
        tag="label"
        v-ripple
      >
        <q-item-section>
          <q-item-label>Ignorar Mensagens de Grupo</q-item-label>
          <q-item-label caption>Habilitando esta opção o sistema não abrirá ticket para grupos</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-toggle
            v-model="ignoreGroupMsg"
            false-value="disabled"
            true-value="enabled"
            checked-icon="check"
            keep-color
            :color="ignoreGroupMsg === 'enabled' ? 'green' : 'negative'"
            size="md"
            unchecked-icon="clear"
            @input="atualizarConfiguracao('ignoreGroupMsg')"
          />
        </q-item-section>
      </q-item>
      <q-item
        tag="label"
        v-ripple
      >
        <q-item-section>
          <q-item-label>Assinatura</q-item-label>
          <q-item-label caption>Habilitando esta opção o sistema irá adicionar a assinatura ao final das mensagens enviadas.</q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <q-toggle
            v-model="sign"
            false-value="disabled"
            true-value="enabled"
            checked-icon="check"
            keep-color
            :color="sign === 'enabled' ? 'green' : 'negative'"
            size="md"
            unchecked-icon="clear"
            @input="atualizarConfiguracao('sign')"
          />
        </q-item-section>
      </q-item>

      <q-item-label
        caption
        class="q-mt-lg q-pl-sm"
      >Módulo: E-mail (convites)</q-item-label>
      <q-separator spaced />

      <q-item class="q-pb-none">
        <q-item-section>
          <q-item-label class="text-weight-medium">E-mail remetente</q-item-label>
          <q-item-label caption>Endereço que aparece como remetente nos convites por e-mail.</q-item-label>
          <q-input
            outlined
            dense
            v-model.trim="mailFrom"
            type="email"
            placeholder="ex: noreply@seusistema.com"
            class="q-mt-sm"
            style="max-width: 360px"
            @blur="atualizarConfiguracao('mailFrom')"
          />
        </q-item-section>
      </q-item>
      <q-item class="q-pb-none">
        <q-item-section>
          <q-item-label class="text-weight-medium">Host SMTP</q-item-label>
          <q-item-label caption>Servidor de envio (ex: smtp.gmail.com).</q-item-label>
          <q-input
            outlined
            dense
            v-model.trim="mailHost"
            placeholder="smtp.gmail.com"
            class="q-mt-sm"
            style="max-width: 360px"
            @blur="atualizarConfiguracao('mailHost')"
          />
        </q-item-section>
      </q-item>
      <q-item class="q-pb-none">
        <q-item-section>
          <q-item-label class="text-weight-medium">Porta SMTP</q-item-label>
          <q-item-label caption>Geralmente 587 (TLS) ou 465 (SSL).</q-item-label>
          <q-input
            outlined
            dense
            v-model.trim="mailPort"
            type="number"
            placeholder="587"
            class="q-mt-sm"
            style="max-width: 120px"
            @blur="atualizarConfiguracao('mailPort')"
          />
        </q-item-section>
      </q-item>
      <q-item class="q-pb-none">
        <q-item-section>
          <q-item-label class="text-weight-medium">Usuário SMTP</q-item-label>
          <q-item-label caption>Login do e-mail (ex: seu-email@gmail.com). No Gmail, use o e-mail completo.</q-item-label>
          <q-input
            outlined
            dense
            v-model.trim="mailUser"
            type="email"
            placeholder="seu-email@gmail.com"
            class="q-mt-sm"
            style="max-width: 360px"
            @blur="atualizarConfiguracao('mailUser')"
          />
        </q-item-section>
      </q-item>
      <q-item class="q-pb-none">
        <q-item-section>
          <q-item-label class="text-weight-medium">Senha SMTP</q-item-label>
          <q-item-label caption>Senha do e-mail ou senha de app (Gmail). Deixe em branco para não alterar.</q-item-label>
          <q-input
            outlined
            dense
            v-model="mailPass"
            :type="showMailPass ? 'text' : 'password'"
            placeholder="••••••••"
            class="q-mt-sm"
            style="max-width: 360px"
            @blur="salvarMailPassSeAlterado"
          >
            <template v-slot:append>
              <q-icon :name="showMailPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showMailPass = !showMailPass" />
            </template>
          </q-input>
        </q-item-section>
      </q-item>
      <q-item class="q-pb-none">
        <q-item-section>
          <q-item-label class="text-weight-medium">URL do sistema (link do convite)</q-item-label>
          <q-item-label caption>URL do frontend usada no link do convite (ex: https://seusistema.com ou http://localhost:8080).</q-item-label>
          <q-input
            outlined
            dense
            v-model.trim="frontUrl"
            placeholder="http://localhost:8080"
            class="q-mt-sm"
            style="max-width: 360px"
            @blur="atualizarConfiguracao('frontUrl')"
          />
        </q-item-section>
      </q-item>
      <q-item class="q-pt-md">
        <q-item-section>
          <q-btn
            color="primary"
            label="Salvar configurações de e-mail"
            class="rounded-xl"
            :loading="salvandoEmail"
            @click="salvarConfiguracoesEmail"
          />
          <q-item-label caption class="q-mt-sm">Preencha todos os campos e clique aqui para gravar (incluindo a senha SMTP).</q-item-label>
        </q-item-section>
      </q-item>

      <q-item-label
        caption
        class="q-mt-lg q-pl-sm"
      >Módulo: Avaliação</q-item-label>
      <q-separator spaced />

      <q-item
        tag="label"
        v-ripple
      >
        <q-item-section>
          <q-item-label>Tempo de espera da avaliação</q-item-label>
          <q-item-label caption>Tempo em minutos que o sistema aguarda a resposta do cliente após enviar o fluxo de avaliação. Após esse tempo, o ticket é fechado automaticamente.</q-item-label>
          <div class="q-mt-sm">
            <q-input
              outlined
              dense
              type="number"
              v-model.number="evaluationTimeoutMinutes"
              suffix="minutos"
              style="max-width: 200px"
              @blur="atualizarConfiguracao('evaluationTimeoutMinutes')"
              :rules="[val => val > 0 || 'Deve ser maior que 0']"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

  </div>
</template>

<script>
import { ListarChatFlow } from 'src/service/chatFlow'
import { ListarConfiguracoes, AlterarConfiguracao } from 'src/service/configuracoes'
export default {
  name: 'IndexConfiguracoes',
  data () {
    return {
      configuracoes: [],
      listaChatFlow: [],
      NotViewAssignedTickets: null,
      NotViewTicketsChatBot: null,
      DirectTicketsToWallets: null,
      botTicketActive: null,
      ignoreGroupMsg: null,
      sign: null,
      evaluationTimeoutMinutes: 60,
      mailFrom: '',
      mailHost: '',
      mailPort: '',
      mailUser: '',
      mailPass: '',
      frontUrl: '',
      showMailPass: false,
      salvandoEmail: false
    }
  },
  methods: {
    async salvarConfiguracoesEmail () {
      this.salvandoEmail = true
      const keys = [
        { key: 'mailFrom', value: this.mailFrom },
        { key: 'mailHost', value: this.mailHost },
        { key: 'mailPort', value: this.mailPort != null ? String(this.mailPort) : '' },
        { key: 'mailUser', value: this.mailUser },
        { key: 'frontUrl', value: this.frontUrl }
      ]
      if (this.mailPass && this.mailPass !== '••••••••') {
        keys.push({ key: 'mailPass', value: this.mailPass })
      }
      try {
        for (const { key, value } of keys) {
          await AlterarConfiguracao({ key, value: value != null ? value : '' })
        }
        this.$q.notify({
          type: 'positive',
          message: 'Configurações de e-mail salvas!',
          progress: true,
          position: 'top'
        })
      } catch (e) {
        console.error(e)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao salvar. Tente novamente.',
          position: 'top'
        })
      } finally {
        this.salvandoEmail = false
      }
    },
    async listarConfiguracoes () {
      const { data } = await ListarConfiguracoes()
      this.configuracoes = data
      this.configuracoes.forEach(el => {
        let value = el.value
        if (el.key === 'botTicketActive' && el.value) {
          value = +el.value
        }
        if (el.key === 'mailPass' && el.value) {
          this.mailPass = ''
          return
        }
        this.$data[el.key] = value
      })
    },
    async listarChatFlow () {
      const { data } = await ListarChatFlow()
      this.listaChatFlow = data.chatFlow
    },
    salvarMailPassSeAlterado () {
      if (this.mailPass && this.mailPass !== '••••••••') this.atualizarConfiguracao('mailPass')
    },
    async atualizarConfiguracao (key) {
      let val = this.$data[key]
      if (val != null && typeof val !== 'string') val = String(val)
      const params = {
        key,
        value: val != null ? val : ''
      }
      try {
        await AlterarConfiguracao(params)
        this.$q.notify({
          type: 'positive',
          message: 'Configuração alterada!',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      } catch (error) {
        console.error('error - AlterarConfiguracao', error)
        this.$data[key] = this.$data[key] === 'enabled' ? 'disabled' : 'enabled'
        this.$notificarErro('Ocorreu um erro!', error)
      }
    }
  },
  async mounted () {
    await this.listarConfiguracoes()
    await this.listarChatFlow()
  }
}
</script>

<style lang="scss" scoped>
</style>
