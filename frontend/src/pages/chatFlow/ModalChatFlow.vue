<template>
  <q-dialog
    :value="modalChatFlow"
    @hide="fecharModal"
    @show="abrirModal"
    persistent
  >
    <q-card
      style="width: 500px"
      class="q-pa-lg"
    >
      <q-card-section>
        <div class="text-h6">{{ chatFlow.isDuplicate ? 'Duplicar' : chatFlowEdicao.id ? 'Editar': 'Criar' }} Fluxo <span v-if="chatFlow.isDuplicate"> (Nome: {{ chatFlowEdicao.name }}) </span></div>
        <div
          v-if="chatFlow.isDuplicate"
          class="text-subtitle1"
        > Nome: {{ chatFlowEdicao.name }} </div>
      </q-card-section>
      <q-card-section>
        <q-input
          class="row col"
          square
          outlined
          v-model="chatFlow.name"
          label="Descrição"
        />
        <!-- <div class="row col q-mt-md">
          <q-option-group
            v-model="chatFlow.action"
            :options="options"
            color="primary"
          />
        </div> -->
        <div class="row col q-mt-md">
          <q-checkbox
            v-model="chatFlow.isActive"
            label="Ativo"
          />
        </div>
        <div class="row col q-mt-md">
          <q-input
            clearable
            class="full-width"
            square
            outlined
            v-model="chatFlow.celularTeste"
            label="Número para Teste"
            hint="Deixe limpo para que a Auto resposta funcione. Caso contrário, irá funcionar somente para o número informado aqui."
          />
        </div>
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
          @click="handleAutoresposta"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

</template>

<script>
const userId = +localStorage.getItem('userId')
import { CriarChatFlow, UpdateChatFlow } from 'src/service/chatFlow'
import { getDefaultFlow } from 'src/components/ccFlowBuilder/defaultFlow'

export default {
  name: 'ModalNovoChatFlow',
  props: {
    modalChatFlow: {
      type: Boolean,
      default: false
    },
    chatFlowEdicao: {
      type: Object,
      default: () => {
        return { id: null }
      }
    }
  },
  data () {
    return {
      chatFlow: {
        name: null,
        userId,
        celularTeste: null,
        isActive: true
      }
      // options: [
      //   { value: 0, label: 'Entrada (Criação do Ticket)' },
      //   { value: 1, label: 'Encerramento (Resolução Ticket)' }
      // ]
    }
  },
  methods: {
    abrirModal () {
      if (this.chatFlowEdicao.id) {
        this.chatFlow = {
          ...this.chatFlowEdicao,
          userId
        }
      } else {
        // Se é uma criação/importação/duplicação, preservar o flow se existir
        this.chatFlow = {
          name: this.chatFlowEdicao.name || null,
          action: this.chatFlowEdicao.action !== undefined ? this.chatFlowEdicao.action : 0,
          userId: this.chatFlowEdicao.userId || userId,
          celularTeste: this.chatFlowEdicao.celularTeste || null,
          isActive: this.chatFlowEdicao.isActive !== undefined ? this.chatFlowEdicao.isActive : true,
          flow: this.chatFlowEdicao.flow || null, // Preservar flow se existir (importação/duplicação)
          isDuplicate: this.chatFlowEdicao.isDuplicate || false
        }
      }
    },
    fecharModal () {
      this.chatFlow = {
        name: null,
        action: 0,
        userId,
        celularTeste: null,
        isActive: true
      }
      this.$emit('update:chatFlowEdicao', { id: null })
      this.$emit('update:modalChatFlow', false)
    },
    async handleAutoresposta () {
      if (this.chatFlow.id && !this.chatFlow?.isDuplicate) {
        const { data } = await UpdateChatFlow(this.chatFlow)
        this.$notificarSucesso('Fluxo editado.')
        this.$emit('chatFlow:editado', data)
      } else {
        // setar id = null para rotina de duplicação de fluxo
        // Se já existe um flow (importado ou duplicado), usa ele, senão usa o default
        let flowData

        if (this.chatFlow.flow) {
          // Se já tem flow aninhado (importado), usar essa estrutura
          flowData = {
            name: this.chatFlow.name,
            isActive: this.chatFlow.isActive !== undefined ? this.chatFlow.isActive : true,
            celularTeste: this.chatFlow.celularTeste || null,
            userId: this.chatFlow.userId || userId,
            flow: {
              ...this.chatFlow.flow,
              name: this.chatFlow.name,
              isActive: this.chatFlow.isActive !== undefined ? this.chatFlow.isActive : (this.chatFlow.flow.isActive !== undefined ? this.chatFlow.flow.isActive : true),
              celularTeste: this.chatFlow.celularTeste !== undefined ? this.chatFlow.celularTeste : (this.chatFlow.flow.celularTeste || null),
              userId: this.chatFlow.userId || this.chatFlow.flow.userId || userId,
              id: null
            }
          }
        } else {
          // Se não tem flow aninhado, usar getDefaultFlow e mesclar com os dados do chatFlow
          const defaultFlow = getDefaultFlow()
          flowData = {
            name: this.chatFlow.name,
            isActive: this.chatFlow.isActive !== undefined ? this.chatFlow.isActive : true,
            celularTeste: this.chatFlow.celularTeste || null,
            userId: this.chatFlow.userId || userId,
            flow: {
              ...defaultFlow,
              name: this.chatFlow.name,
              isActive: this.chatFlow.isActive !== undefined ? this.chatFlow.isActive : true,
              celularTeste: this.chatFlow.celularTeste || null,
              userId: this.chatFlow.userId || userId,
              id: null
            }
          }
        }

        const { data } = await CriarChatFlow(flowData)
        this.$notificarSucesso('Novo fluxo criado.')
        this.$emit('chatFlow:criada', data)
      }

      this.fecharModal()
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
