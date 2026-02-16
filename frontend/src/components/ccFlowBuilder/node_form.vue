<template>
  <div class="q-px-md q-py-sm">
    <div class="justify-between col q-mb-md">
      <q-btn class="bg-padrao"
        flat
        color="primary"
        icon="mdi-plus"
        label="Nova Etapa"
        @click="addNode" />
      <q-btn class="bg-padrao q-ml-sm"
        flat
        color="primary"
        icon="mdi-content-duplicate"
        label="Dup. Etapa"
        :disable="!node.id || ['start', 'configurations'].includes(node.type)"
        @click="duplicateNode" />
      <q-btn class="bg-padrao"
        flat
        color="positive"
        icon="mdi-content-save-outline"
        label="Salvar"
        @click="$emit('saveFlow')" />
    </div>
    <q-card bordered
      flat
      class="fit">
      <div class="ef-node-form-header">
        Configuração Fluxo
      </div>
      <div class="q-pa-sm">
        <q-input outlined
          filled
          label="Nome"
          v-model="node.name"
          class="q-my-sm"
          :disable="['start', 'configurations'].includes(node.type) || isWelcomeNode" />
        <q-separator inset="" />
      </div>
      <q-card-section class="q-pa-none"
        v-if="node.type === 'node'">
        <div>
          <q-tabs v-model="tabNodeForm"
            narrow-indicator
            class="text-grey-8 bg-">
            <q-tab name="interacoes"
              label="Interações" />
            <q-tab name="condicoes"
              label="Condições" />
            <!-- <q-tab
              name="acoes"
              label="Ações"
            /> -->
          </q-tabs>
          <q-tab-panels v-model="tabNodeForm"
            animated
            keep-alive
            infinite
            class="q-pa-none rounded-borders">
            <q-tab-panel class="q-pa-none"
              name="interacoes">
              <div class="text-center ">
                <div class="row q-mt-sm col justify-center">
                  <q-btn flat
                    icon="mdi-message-text-outline"
                    class="bg-padrao btn-rounded q-mx-xs"
                    :color="$q.dark.isActive ? 'white' : ''"
                    @click="addMessage">
                    <q-tooltip content-class="text-bold">
                      Enviar Mensagem
                    </q-tooltip>
                  </q-btn>
                  <!-- <q-btn
                    flat
                    icon="mdi-message-settings-outline"
                    class="bg-padrao btn-rounded q-mx-xs"
                    :color="$q.dark.isActive ? 'white' : ''"
                    @click="addMessageOptions"
                  >
                    <q-tooltip content-class="text-bold">
                      Enviar Mensagem (Botões | Listas)
                    </q-tooltip>
                  </q-btn> -->
                  <q-btn @click="addMediaField"
                    flat
                    icon="mdi-file-document-outline"
                    class="bg-padrao btn-rounded q-mx-xs"
                    :color="$q.dark.isActive ? 'white' : ''">
                    <q-tooltip content-class="text-bold">
                      Enviar documentos, vídeo, aúdio e outros arquivos.
                    </q-tooltip>
                  </q-btn>
                </div>
                <div class="row bg-grey-3 q-pa-sm q-my-md justify-center scroll"
                  style="height: calc(100vh - 495px)">
                  <div class="col-xs-12">
                    <div v-for="(element, idx) in node.interactions"
                      :key="element.id"
                      v-bind="element">
                      <div class="q-my-md">
                        <div class="bg-white full-width row col justify-between ">
                          <q-btn round
                            dense
                            disable
                            :color="$q.dark.isActive ? 'grey-3' : 'black'"
                            :label="idx + 1"
                            style="z-index: 999; " />
                          <q-space />
                          <q-btn round
                            dense
                            icon="mdi-arrow-up-bold"
                            flat
                            color="positive"
                            class="bg-padrao q-mr-md"
                            style="z-index: 999"
                            :disable="idx === 0"
                            @click="changePosition(node.interactions, idx, idx - 1)">
                            <q-tooltip>
                              Reordenar
                            </q-tooltip>
                          </q-btn>
                          <q-btn round
                            dense
                            icon="mdi-arrow-down-bold"
                            flat
                            :color="$q.dark.isActive ? 'grey-3' : 'black'"
                            class="bg-padrao q-mr-md"
                            style="z-index: 999"
                            @click="changePosition(node.interactions, idx, idx + 1)">
                            <q-tooltip>
                              Reordenar
                            </q-tooltip>
                          </q-btn>
                          <q-btn round
                            dense
                            icon="mdi-close"
                            flat
                            color="negative"
                            class="bg-padrao"
                            style="z-index: 999;"
                            @click="removeItem(element, idx + 1)" />
                        </div>
                        <component :is="element.type"
                          :element="element">
                        </component>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </q-tab-panel>
            <q-tab-panel class="q-pa-none"
              name="condicoes">
              <div v-show="type === 'node'">
                <div class="row q-mt-md col justify-end">
                  <q-btn flat
                    icon="mdi-vector-polyline-plus"
                    class="bg-padrao btn-rounded q-mx-xs"
                    :color="$q.dark.isActive ? 'white' : ''"
                    @click="addCondiction">
                    <q-tooltip content-class="text-bold">
                      Nova condição
                    </q-tooltip>
                  </q-btn>
                </div>
                <div style="height: calc(100vh - 490px)"
                  class="row bg-grey-3 q-pa-sm scroll q-mt-md col justify-start">
                  <template v-for="(condition, idx) in node.conditions">
                    <q-card bordered
                      flat
                      :key="condition.id"
                      class="full-width q-my-sm"
                      style="min-height: 250px;">
                      <div class="full-width row col justify-between text-left q-pa-xs">
                        <q-btn round
                          dense
                          disable
                          :color="$q.dark.isActive ? 'grey-3' : 'black'"
                          :label="idx + 1" />
                        <q-space />
                        <q-btn round
                          dense
                          icon="mdi-arrow-up-bold"
                          flat
                          color="positive"
                          class="bg-padrao q-mr-md"
                          style="z-index: 999"
                          :disable="idx === 0"
                          @click="changePosition(node.conditions, idx, idx - 1)">
                          <q-tooltip>
                            Reordenar: Aumentar prioridade da regra de condição
                          </q-tooltip>
                        </q-btn>
                        <q-btn round
                          dense
                          icon="mdi-arrow-down-bold"
                          flat
                          :color="$q.dark.isActive ? 'grey-3' : 'black'"
                          class="bg-padrao q-mr-md"
                          style="z-index: 999"
                          @click="changePosition(node.conditions, idx, idx + 1)">
                          <q-tooltip>
                            Reordenar: Diminuir prioridade da regra de condição
                          </q-tooltip>
                        </q-btn>
                        <q-btn round
                          dense
                          icon="mdi-close"
                          flat
                          color="negative"
                          class="bg-padrao"
                          style="z-index: 999"
                          @click="removeConditionItem(condition, idx)" />
                      </div>
                      <q-card-section class="q-pa-sm q-gutter-sm">
                        <q-select outlined
                          dense
                          v-model="condition.type"
                          :options="getConditionOptions(condition)"
                          label="Se"
                          map-options
                          emit-value />
                        <q-select v-if="condition.type === 'R'"
                          dense
                          label="Respostas"
                          outlined
                          v-model="condition.condition"
                          use-input
                          use-chips
                          multiple
                          hide-dropdown-icon
                          input-debounce="0"
                          new-value-mode="add-unique"
                          hint="Digite o valor e aperte enter" />
                      </q-card-section>
                      <q-separator inset
                        spaced />
                      <q-card-section class="q-pa-sm">
                        <div class="text-bold q-px-sm"> Rotear para: </div>
                        <q-option-group class="text-center"
                          inline
                          v-model="condition.action"
                          :options="optionsAcao"
                          color="primary" />
                        <div class="row q-mt-sm">
                          <div class="col">
                            <q-select v-if="condition.action === 0"
                              dense
                              outlined
                              class="full-width"
                              :value="condition.nextStepId || ''"
                              :options="nodesList.nodeList.filter(n => n.type !== 'configurations')"
                              option-label="name"
                              option-value="id"
                              label="Etapa"
                              map-options
                              emit-value
                              clearable
                              @input="nextStepId => addLineStep(nextStepId, idx)" />
                            <q-select v-if="condition.action === 1"
                              dense
                              outlined
                              class="full-width"
                              v-model="condition.queueId"
                              :options="filas"
                              option-label="queue"
                              option-value="id"
                              label="Departamento"
                              :key="condition.queueId"
                              map-options
                              emit-value
                              clearable
                              @input="condition.nextStepId = null; condition.userIdDestination = null" />
                            <q-select v-if="condition.action === 2"
                              dense
                              outlined
                              class="full-width"
                              v-model="condition.userIdDestination"
                              :options="usuarios"
                              option-label="name"
                              option-value="id"
                              label="Usuário"
                              map-options
                              emit-value
                              clearable
                              @input="condition.nextStepId = null; condition.queueId = null" />
                            <div v-if="condition.action === 3"
                              class="q-pa-md">
                              <div class="text-center text-grey-6 q-mb-md">
                                <q-icon name="mdi-close-circle" size="2em" class="q-mb-sm" />
                                <div class="text-subtitle2">O ticket será encerrado automaticamente</div>
                                <div class="text-caption">Status: Fechado</div>
                              </div>
                              <div class="row q-gutter-sm">
                                <div class="col">
                                  <q-input
                                    outlined
                                    dense
                                    v-model="condition.closeMessage"
                                    label="Mensagem de encerramento"
                                    hint="Mensagem que será enviada antes de fechar o ticket"
                                    type="textarea"
                                    rows="3"
                                    autogrow
                                    @blur="autoSaveCloseMessage(condition)"
                                  />
                                </div>
                                <div class="col-auto flex flex-center">
                                  <q-btn
                                    round
                                    color="primary"
                                    icon="mdi-content-save"
                                    size="md"
                                    @click="saveCloseMessage(condition)"
                                    :disable="!condition.closeMessage || condition.closeMessage.trim() === ''"
                                    :loading="false"
                                  >
                                    <q-tooltip>
                                      Salvar mensagem de encerramento
                                    </q-tooltip>
                                  </q-btn>
                                </div>
                              </div>
                              <div v-if="condition.closeMessage && condition.closeMessage.trim()"
                                class="q-mt-sm text-positive text-caption">
                                <q-icon name="mdi-check-circle" size="1em" class="q-mr-xs" />
                                Mensagem salva: "{{ condition.closeMessage }}"
                              </div>
                            </div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </template>

                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>

          <div class="q-pa-sm q-gutter-md"
            v-show="type === 'line'">
            <q-input outlined
              label="Chave"
              v-model="line.label" />
            <q-btn icon="mdi-close"
              label="Redefinir" />
            <q-btn type="primary"
              icon="mdi-content-save"
              @click="saveLine"
              label="Salvar" />
          </div>
          <!--            <div class="el-node-form-tag"></div>-->
        </div>
      </q-card-section>

      <q-card-section style="height: calc(100vh - 380px)"
        class="row bg-grey-3 q-pa-sm scroll col justify-start"
        v-if="node.type === 'configurations'">
        <q-card class="full-width q-my-sm"
          style="height: 280px;">
          <div class="full-width bg-grey-3 text-bold row col justify-between text-left q-pa-md">
            Mensagem de saudação (Departamento/Usuário)
            <div class="row text-subtitle2">
              Quando o bot direcionar o atendimento para uma fila ou usuário,
              essa mensagem será enviada.
            </div>
          </div>
          <q-card-section class="q-pa-sm">
            <div class="row ">
              <div class="col">
                <label class="text-subtitle1 text-bold q-mb-sm"
                  for="inputEnvioMensagem"> Mensagem: </label>
                <div class="flex flex-inline full-width items-center">
                  <div class="flex flex-inline text-left"
                    style="width: 40px">
                    <q-btn round
                      flat
                      dense>
                      <q-icon size="2em"
                        name="mdi-emoticon-happy-outline" />
                      <q-tooltip>
                        Emoji
                      </q-tooltip>
                      <q-menu anchor="top right"
                        self="bottom middle"
                        :offset="[5, 40]">
                        <VEmojiPicker style="width: 40vw"
                          :showSearch="false"
                          :emojisByRow="20"
                          labelSearch="Localizar..."
                          lang="pt-BR"
                          @select="onInsertSelectEmojiSaudacao" />
                      </q-menu>
                    </q-btn>
                  </div>
                  <textarea ref="inputEnvioMensagemSaudacao"
                    id="inputEnvioMensagem"
                    style="min-height: 10vh; max-height: 15vh; flex: auto"
                    class="q-pa-sm bg-white"
                    placeholder="Digite a mensagem"
                    autogrow
                    dense
                    outlined
                    @input="(v) => node.configurations.welcomeMessage.message = v.target.value"
                    :value="node.configurations.welcomeMessage.message" />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="full-width q-my-sm"
          style="height: 300px;">
          <div class="full-width bg-grey-3 text-bold row col justify-between text-left q-pa-md">
            Se nenhuma resposta esperada for enviada
            <div class="row text-subtitle2">
              Essa exceção será aplicada caso a resposta enviada pelo cliente não corresponda
              aos valores esperados conforme condições da etapa.
            </div>
          </div>
          <q-card-section class="q-pa-sm">
            <div class="row ">
              <div class="col">
                <label class="text-subtitle1 text-bold q-mb-sm"
                  for="inputEnvioMensagem"> Mensagem de feedback: </label>
                <div class="flex flex-inline full-width items-center">
                  <div class="flex flex-inline text-left"
                    style="width: 40px">
                    <q-btn round
                      flat
                      dense>
                      <q-icon size="2em"
                        name="mdi-emoticon-happy-outline" />
                      <q-tooltip>
                        Emoji
                      </q-tooltip>
                      <q-menu anchor="top right"
                        self="bottom middle"
                        :offset="[5, 40]">
                        <VEmojiPicker style="width: 40vw"
                          :showSearch="false"
                          :emojisByRow="20"
                          labelSearch="Localizar..."
                          lang="pt-BR"
                          @select="onInsertSelectEmojiNotOptionsSelectMessage" />
                      </q-menu>
                    </q-btn>
                  </div>
                  <textarea ref="inputEnvioMensagemnotOptionsSelectMessage"
                    id="inputEnvioMensagem"
                    style="min-height: 10vh; max-height: 15vh; flex: auto"
                    class="q-pa-sm bg-white"
                    placeholder="Digite a mensagem"
                    autogrow
                    dense
                    outlined
                    @input="(v) => node.configurations.notOptionsSelectMessage.message = v.target.value"
                    :value="node.configurations.notOptionsSelectMessage.message" />
                </div>
              </div>
            </div>
            <!-- <div class="row q-mt-md">
              <div class="col">
                <label
                  class="text-subtitle1 text-bold q-mb-sm "
                  for="inputEnvioMensagem"
                > Enviar para: </label>

                <q-option-group
                  class="text-center"
                  inline
                  v-model="node.configurations.notOptionsSelectMessage.stepReturn"
                  :options="[
                  {label: 'Etapa atual', value: 'A'},
                  {label: 'Etapa inicial', value: 'S'}
                  ]"
                  color="primary"
                />
              </div>
            </div> -->
          </q-card-section>
        </q-card>

        <q-card class="full-width q-my-sm"
          style="height: 290px;">
          <div class="full-width bg-grey-3 text-bold text-body1 row col justify-between text-left q-pa-md">
            Ausência de resposta
            <div class="row text-subtitle2">
              Após o tempo determinado, se o cliente não responder,
              o bot realizará o encaminhamento para a Departamento/Usuário informados.
            </div>
          </div>
          <q-card-section class="q-pa-sm">
            <div class="row q-mt-sm">
              <div class="col">
                <q-input dense
                  outlined
                  mask="###"
                  v-model.number="node.configurations.notResponseMessage.time"
                  label="Tempo (minutos)" />
              </div>
            </div>
            <div class="row q-mt-sm">
              <div class="col">
                <q-option-group class="text-center"
                  inline
                  v-model="node.configurations.notResponseMessage.type"
                  :options="[
                    { value: 1, label: 'Departamento' },
                    { value: 2, label: 'Usuário' }
                  ]"
                  color="primary" />
              </div>
            </div>
            <div class="row q-mt-sm">
              <div class="col">
                <q-select v-if="node.configurations.notResponseMessage.type === 1"
                  dense
                  outlined
                  class="full-width"
                  v-model="node.configurations.notResponseMessage.destiny"
                  :options="filas"
                  option-label="queue"
                  option-value="id"
                  label="Fila"
                  map-options
                  emit-value
                  clearable />
                <q-select v-if="node.configurations.notResponseMessage.type === 2"
                  dense
                  outlined
                  class="full-width"
                  v-model="node.configurations.notResponseMessage.destiny"
                  :options="usuarios"
                  option-label="name"
                  option-value="id"
                  label="Usuário"
                  map-options
                  emit-value
                  clearable />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="full-width q-my-sm"
          style="height: 330px;">
          <div class="full-width bg-grey-3 text-bold text-body1 row col justify-between text-left q-pa-md">
            Máximo de Tentativas do Bot
            <div class="row text-subtitle2">
              Uma vez excedido o número máximo de retentativas de pergunta/resposta,
              caso o cliente não envie uma respota válida, o bot irá realizar o encaminhamento
              para a Departamento/Usuário configurados.
            </div>
          </div>
          <q-card-section class="q-pa-sm">
            <div class="row q-mt-sm">
              <div class="col">
                <q-input dense
                  outlined
                  mask="##"
                  v-model.number="node.configurations.maxRetryBotMessage.number"
                  label="Número de tentativas" />
              </div>
            </div>
            <div class="row q-mt-sm">
              <div class="col">
                <q-option-group class="text-center"
                  inline
                  v-model="node.configurations.maxRetryBotMessage.type"
                  :options="[
                    { value: 1, label: 'Departamento' },
                    { value: 2, label: 'Usuário' }
                  ]"
                  color="primary" />
              </div>
            </div>
            <div class="row q-mt-sm">
              <div class="col">
                <q-select v-if="node.configurations.maxRetryBotMessage.type === 1"
                  dense
                  outlined
                  class="full-width"
                  v-model="node.configurations.maxRetryBotMessage.destiny"
                  :options="filas"
                  option-label="queue"
                  option-value="id"
                  label="Fila"
                  map-options
                  emit-value
                  clearable />
                <q-select v-if="node.configurations.maxRetryBotMessage.type === 2"
                  dense
                  outlined
                  class="full-width"
                  v-model="node.configurations.maxRetryBotMessage.destiny"
                  :options="usuarios"
                  option-label="name"
                  option-value="id"
                  label="Usuário"
                  map-options
                  emit-value
                  clearable />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="full-width q-my-sm"
          style="height: 330px;">
          <div class="full-width bg-grey-3 text-bold text-body1 row col justify-between text-left q-pa-md">
            Auto Distribuir Atendimento
            <div class="row text-subtitle2">
              Não: Desativado. <br />
              Balancear: Definirá o usuário com base na quantidade de atendimentos de cada usuário do departamento. Usuário com
              menos atendimentos será escolhido.<br />
              Aleatória: Definirá o usuário de forma aleatória/randômica para os usuários do departamento.
            </div>
          </div>
          <q-card-section class="q-pa-sm">
            <div class="row q-mt-sm">
              <div class="col">
                <q-option-group class="text-center"
                  inline
                  v-model="node.configurations.autoDistributeTickets"
                  :options="[
                    { value: 'N', label: 'Não' },
                    { value: 'R', label: 'Aleatória' },
                    { value: 'B', label: 'Balanceada' }
                  ]"
                  color="primary" />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card class="full-width q-my-sm"
          style="height: 330px;">
          <div class="full-width bg-grey-3 text-bold text-body1 row col justify-between text-left q-pa-md">
            Encerrar Atendimento
            <div class="row text-subtitle2">
              Caso o cliente digite algumas das informações esperadas, o atendimento será encerrado.
            </div>
          </div>
          <q-card-section class="q-pa-sm">
            <div class="row q-mt-sm">
              <div class="col">
                <q-select dense
                  label="Parâmetros"
                  outlined
                  v-model="node.configurations.answerCloseTicket"
                  use-input
                  use-chips
                  multiple
                  hide-dropdown-icon
                  input-debounce="0"
                  new-value-mode="add-unique"
                  hint="Digite o valor e aperte enter" />
              </div>
            </div>
          </q-card-section>
        </q-card>

      </q-card-section>

      <q-card-section style="height: calc(100vh - 380px)"
        class="row bg-grey-3 q-pa-sm scroll col justify-start"
        v-if="node.type === 'start'">
        <q-card class="full-width q-my-sm">
          <div class="full-width bg-grey-3 text-bold row col justify-between text-left q-pa-md">
            Etapa representa o contato inicial.
            <div class="row text-subtitle2">
              - Caso seja o primeiro contato do cliente, o sistema
              salvará automaticamente na agenda as informações do cliente.
            </div>
            <div class="row text-subtitle2">
              - O Bot irá interagir nos atendimentos iniciados pelos clientes.
            </div>
            <div class="row text-subtitle2">
              - O Bot irá parar de interagir caso o atendimento seja assumido por um usuário.
            </div>
          </div>
        </q-card>
      </q-card-section>

    </q-card>
  </div>
</template>

<script>
import { uid } from 'quasar'
// import { cloneDeep } from 'lodash'
import MessageField from './messageField'
// import MessageOptionsField from './messageOptionsField.vue'
import MediaField from './mediaField.vue'
import { VEmojiPicker } from 'v-emoji-picker'
export default {
  components: {
    MessageField,
    VEmojiPicker,
    // MessageOptionsField,
    MediaField
  },
  props: {
    nodesList: {
      type: Object,
      default: () => { }
    },
    filas: {
      type: Array,
      default: () => []
    },
    usuarios: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      visible: true,
      tabNodeForm: 'interacoes',
      elements: [],
      optionsAcao: [
        { value: 0, label: 'Etapa' },
        { value: 1, label: 'Departamento' },
        { value: 2, label: 'Usuário' },
        { value: 3, label: 'Encerramento' }
      ],
      optionsSe: [
        { label: 'Qualquer resposta', value: 'US' },
        { label: 'Respostas', value: 'R' }
      ],
      // node 或 line
      type: 'node',
      node: {},
      line: {},
      data: {},
      stateList: [{
        state: 'success',
        label: '成功'
      }, {
        state: 'warning',
        label: '警告'
      }, {
        state: 'error',
        label: '错误'
      }, {
        state: 'running',
        label: '运行中'
      }]
    }
  },
  computed: {
    isWelcomeNode () {
      return this.node && this.node.viewOnly && this.node.name === 'Boas vindas!'
    }
  },
  watch: {
    'node.conditions': {
      handler (newConditions, oldConditions) {
        // Só limpar campos quando a ação realmente mudar (não quando for criada)
        if (oldConditions) {
          newConditions.forEach((condition, idx) => {
            const oldCondition = oldConditions[idx]
            // Só limpar se a ação mudou de algo diferente de 3 para 3, ou se mudou de 3 para outra coisa
            if (condition.action === 3 && oldCondition && oldCondition.action !== 3) {
              // Ação mudou para Encerramento - limpar campos desnecessários mas manter closeMessage se já existir
              this.clearConditionFieldsExceptCloseMessage(idx)
            } else if (oldCondition && oldCondition.action === 3 && condition.action !== 3) {
              // Ação mudou de Encerramento para outra - limpar tudo
              this.clearConditionFields(idx)
            }
          })
        }
      },
      deep: true
    }
  },
  methods: {
    gerarUID () {
      return uid()
    },
    addMessage () {
      this.node.interactions.push({
        type: 'MessageField',
        data: { message: '' },
        id: this.gerarUID()
      })
    },
    // addMessageOptions () {
    //   this.node.interactions.push({
    //     type: 'MessageOptionsField',
    //     data: {
    //       message: '',
    //       values: []
    //     },
    //     id: this.gerarUID()
    //   })
    // },
    addMediaField () {
      this.node.interactions.push({
        type: 'MediaField',
        data: {
          ext: '',
          mediaUrl: '',
          media: '',
          type: '',
          name: '',
          caption: ''
        },
        id: this.gerarUID()
      })
    },
    addCondiction () {
      this.node.conditions.push({
        type: '',
        condition: [],
        action: 0,
        closeMessage: '',
        id: this.gerarUID()
      })
    },
    changePosition (arr, from, to) {
      arr.splice(to, 0, arr.splice(from, 1)[0])
      return arr
    },
    addNode () {
      // Se há uma etapa selecionada, criar próxima a ela, senão usar posição padrão
      let left = '100px'
      let top = '40px'

      if (this.node.id && !['start', 'configurations'].includes(this.node.type)) {
        left = (parseInt(this.node.left) + 200) + 'px'
        top = (parseInt(this.node.top) + 50) + 'px'
      }

      const nodeMenu = {
        id: this.gerarUID(),
        nodeId: this.gerarUID(),
        name: 'Nova etapa',
        type: 'node',
        left: left,
        top: top,
        interactions: [],
        conditions: [],
        actions: []
        // ico: 'el-icon-present'
      }
      const evt = {
        originalEvent: {
          clientX: parseInt(left) + 85, // +85 para centralizar como no addNode original
          clientY: parseInt(top) + 16 // +16 para centralizar como no addNode original
        }
      }

      this.$emit('addNode', evt, nodeMenu, null)
    },
    duplicateNode () {
      if (!this.node.id || ['start', 'configurations'].includes(this.node.type)) {
        return
      }

      const duplicatedNode = {
        id: this.gerarUID(),
        nodeId: this.gerarUID(),
        name: `${this.node.name} (Cópia)`,
        type: this.node.type,
        left: (parseInt(this.node.left) + 200) + 'px',
        top: (parseInt(this.node.top) + 50) + 'px',
        interactions: JSON.parse(JSON.stringify(this.node.interactions || [])),
        conditions: JSON.parse(JSON.stringify(this.node.conditions || [])),
        actions: JSON.parse(JSON.stringify(this.node.actions || []))
      }

      // Gerar novos IDs para interações e condições
      duplicatedNode.interactions = duplicatedNode.interactions.map(interaction => ({
        ...interaction,
        id: this.gerarUID()
      }))

      duplicatedNode.conditions = duplicatedNode.conditions.map(condition => ({
        ...condition,
        id: this.gerarUID(),
        nextStepId: null // Limpar referências de etapas conectadas
      }))

      const evt = {
        originalEvent: {
          clientX: parseInt(duplicatedNode.left) + 85, // +85 para centralizar como no addNode original
          clientY: parseInt(duplicatedNode.top) + 16 // +16 para centralizar como no addNode original
        }
      }

      this.$emit('addNode', evt, duplicatedNode, null)
    },
    removeConditionItem (condition, idx) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `Deseja realmente deletar a condição (${idx + 1})?`,
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
      }).onOk(async () => {
        const nConditions = this.node.conditions.filter(c => c.id !== condition.id)
        this.node.conditions = nConditions
      })
    },
    onInsertSelectEmojiSaudacao (emoji) {
      const self = this
      var tArea = this.$refs.inputEnvioMensagemSaudacao
      // get cursor's position:
      var startPos = tArea.selectionStart,
        endPos = tArea.selectionEnd,
        cursorPos = startPos,
        tmpStr = tArea.value
      // filter:
      if (!emoji.data) {
        return
      }
      // insert:
      self.txtContent = this.node.configurations.welcomeMessage.message
      self.txtContent = tmpStr.substring(0, startPos) + emoji.data + tmpStr.substring(endPos, tmpStr.length)
      this.node.configurations.welcomeMessage.message = self.txtContent
      // move cursor:
      setTimeout(() => {
        tArea.selectionStart = tArea.selectionEnd = cursorPos + emoji.data.length
      }, 10)
    },
    onInsertSelectEmojiNotOptionsSelectMessage (emoji) {
      const self = this
      var tArea = this.$refs.inputEnvioMensagemnotOptionsSelectMessage
      // get cursor's position:
      var startPos = tArea.selectionStart,
        endPos = tArea.selectionEnd,
        cursorPos = startPos,
        tmpStr = tArea.value
      // filter:
      if (!emoji.data) {
        return
      }
      // insert:
      self.txtContent = this.node.configurations.notOptionsSelectMessage.message
      self.txtContent = tmpStr.substring(0, startPos) + emoji.data + tmpStr.substring(endPos, tmpStr.length)
      this.node.configurations.notOptionsSelectMessage.message = self.txtContent
      // move cursor:
      setTimeout(() => {
        tArea.selectionStart = tArea.selectionEnd = cursorPos + emoji.data.length
      }, 10)
    },
    addLineStep (nextStepId, idx) {
      if (this.node.conditions[idx]?.queueId) {
        this.node.conditions[idx].queueId = null
      }
      if (this.node.conditions[idx]?.userIdDestination) {
        this.node.conditions[idx].userIdDestination = null
      }
      const oldToLine = this.node.conditions[idx].nextStepId
      this.node.conditions[idx].nextStepId = nextStepId
      // emitir evento somente se etapa destino mudar
      if (oldToLine != nextStepId) {
        this.$emit('addNewLineCondition', this.node.id, nextStepId, oldToLine)
      }
    },
    clearConditionFields (idx) {
      // Limpar campos quando ação for alterada
      this.node.conditions[idx].nextStepId = null
      this.node.conditions[idx].queueId = null
      this.node.conditions[idx].userIdDestination = null
      this.node.conditions[idx].closeMessage = ''
    },
    clearConditionFieldsExceptCloseMessage (idx) {
      // Limpar campos desnecessários mas manter closeMessage
      this.node.conditions[idx].nextStepId = null
      this.node.conditions[idx].queueId = null
      this.node.conditions[idx].userIdDestination = null
      // Não limpar closeMessage - manter o que o usuário digitou
    },
    getConditionOptions (condition) {
      // Se a ação for Encerramento, mostrar opções específicas
      if (condition.action === 3) {
        return [
          { label: 'Independe de resposta', value: 'US' },
          { label: 'Respostas', value: 'R' }
        ]
      }
      // Para outras ações, mostrar opções normais
      return [
        { label: 'Qualquer resposta', value: 'US' },
        { label: 'Respostas', value: 'R' }
      ]
    },
    saveCloseMessage (condition) {
      if (condition.closeMessage && condition.closeMessage.trim()) {
        try {
          // Salvar a mensagem de encerramento
          this.save()

          // Mostrar notificação de sucesso
          this.$q.notify({
            type: 'positive',
            message: 'Mensagem de encerramento salva!',
            position: 'top',
            timeout: 2000
          })

          console.log('Mensagem de encerramento salva:', condition.closeMessage)
        } catch (error) {
          console.error('Erro ao salvar mensagem de encerramento:', error)
          this.$q.notify({
            type: 'negative',
            message: 'Erro ao salvar mensagem de encerramento',
            position: 'top',
            timeout: 3000
          })
        }
      }
    },
    autoSaveCloseMessage (condition) {
      // Salvar automaticamente quando o usuário sair do campo (se houver conteúdo)
      if (condition.closeMessage && condition.closeMessage.trim()) {
        this.save()
        console.log('Mensagem de encerramento salva automaticamente:', condition.closeMessage)
      }
    },
    removeItem (el, idx) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `Deseja realmente deletar o elemento (${idx})?`,
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
      }).onOk(async () => {
        const idx = this.node.interactions.findIndex(e => e.id === el.id)
        this.node.interactions.splice(idx, 1)
      })
    },
    nodeInit (data, id) {
      this.type = 'node'
      this.data = data
      data.nodeList.filter((node) => {
        if (node.id === id) {
          // this.node = cloneDeep(node)
          this.node = node
        }
      })
    },
    lineInit (line) {
      this.type = 'line'
      this.line = line
    },
    // 修改连线
    saveLine () {
      this.$emit('setLineLabel', this.line.from, this.line.to, this.line.label)
    },
    save () {
      this.data.nodeList.filter((node) => {
        if (node.id === this.node.id) {
          node.name = this.node.name
          node.left = this.node.left
          node.top = this.node.top
          node.ico = this.node.ico
          node.state = this.node.state
          node.actions = this.node.actions
          node.conditions = this.node.conditions
          node.interactions = this.node.interactions

          // node
          this.$emit('repaintEverything')
        }
      })
    }
  },
  mounted () {
    console.log('node_form montou', this.node)
  }
}
</script>

<style>
.el-node-form-tag {
  position: absolute;
  top: 50%;
  margin-left: -15px;
  height: 40px;
  width: 15px;
  background-color: #fbfbfb;
  border: 1px solid rgb(220, 227, 232);
  border-right: none;
  z-index: 0;
}
</style>
