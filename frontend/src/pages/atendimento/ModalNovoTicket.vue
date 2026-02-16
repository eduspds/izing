<template>
  <q-dialog
    :value="modalNovoTicket"
    persistent
    @hide="fecharModal"
  >
    <q-card
      class="q-pa-md"
      style="width: 500px"
    >
      <q-card-section>
        <div class="text-h6">Criar Ticket</div>
      </q-card-section>
      <q-card-section>
        <q-select
          ref="selectAutoCompleteContato"
          autofocus
          square
          outlined
          filled
          hide-dropdown-icon
          :loading="loading"
          v-model="contatoSelecionado"
          :options="contatos"
          input-debounce="700"
          @filter="localizarContato"
          use-input
          hide-selected
          fill-input
          option-label="name"
          option-value="id"
          label="Localizar Contato"
          hint="Digite no mínimo duas letras para localizar o contato."
        >
          <template v-slot:before-options>
            <q-btn
              color="primary"
              no-caps
              padding
              ripple
              class="full-width no-border-radius"
              outline
              icon="add"
              label="Adicionar Contato"
              @click="modalContato = true"
            />

          </template>
          <template v-slot:option="scope">
            <q-item
              v-bind="scope.itemProps"
              v-on="scope.itemEvents"
              v-if="scope.opt.name"
            >
              <q-item-section>
                <q-item-label> {{ scope.opt.name }}</q-item-label>
                <q-item-label caption>{{ scope.opt.number }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </q-card-section>
      <q-card-actions
        align="right"
        class="q-pr-md"
      >
        <q-btn
          label="Sair"
          color="negative"
          v-close-popup
          class="q-px-md q-mr-lg"
        />
        <q-btn
          label="Salvar"
          class="q-px-md "
          color="primary"
          @click="criarTicket"
        />
      </q-card-actions>
    </q-card>
    <ContatoModal
      :modalContato.sync="modalContato"
      @contatoModal:contato-criado="contatoCriadoNotoTicket"
    />
  </q-dialog>

</template>

<script>
const userId = +localStorage.getItem('userId')
import { ListarContatos } from 'src/service/contatos'
import { CriarTicket } from 'src/service/tickets'
import ContatoModal from 'src/pages/contatos/ContatoModal'

export default {
  name: 'ModalNovoTicket',
  components: { ContatoModal },
  props: {
    modalNovoTicket: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      ticket: {},
      contatoSelecionado: null,
      contatos: [],
      modalContato: false,
      loading: false
    }
  },
  methods: {
    fecharModal () {
      this.ticket = {}
      this.contatoSelecionado = null
      this.$emit('update:modalNovoTicket', false)
    },
    // Função para gerar variações de busca quando detectar número com dígito 9
    gerarVariacoesBusca (searchParam) {
      if (!searchParam || typeof searchParam !== 'string') {
        return [searchParam]
      }

      // Remove caracteres não numéricos para verificar se é um número
      const apenasNumeros = searchParam.replace(/\D/g, '')

      // Se não tem números suficientes ou não parece ser uma busca por número, retorna original
      if (apenasNumeros.length < 8) {
        return [searchParam]
      }

      // Verifica se é um número brasileiro (começa com 55 ou tem 10-11 dígitos após DDD)
      const isNumeroBrasileiro = apenasNumeros.startsWith('55') ||
                                  (apenasNumeros.length >= 10 && apenasNumeros.length <= 13)

      if (!isNumeroBrasileiro) {
        return [searchParam]
      }

      // Detecta se tem o dígito 9 na posição correta (após DDD)
      // Formato esperado: 55DDD9XXXXXXXX ou DDD9XXXXXXXX
      let temNove = false
      let posicaoNove = -1

      if (apenasNumeros.startsWith('55')) {
        // Formato: 55DDD9XXXXXXXX
        // O 9 deve estar na posição 5 (índice 4) após 55 + DDD (3 dígitos)
        if (apenasNumeros.length >= 5) {
          posicaoNove = 4 // Posição do 9 após 55 + DDD
          temNove = apenasNumeros[posicaoNove] === '9'
        }
      } else {
        // Formato: DDD9XXXXXXXX
        // O 9 deve estar na posição 3 (índice 2) após DDD (2 dígitos)
        if (apenasNumeros.length >= 3) {
          posicaoNove = 2 // Posição do 9 após DDD
          temNove = apenasNumeros[posicaoNove] === '9'
        }
      }

      // Se não tem 9 na posição esperada, retorna busca original
      if (!temNove || posicaoNove === -1) {
        return [searchParam]
      }

      // Gera variação sem o dígito 9
      const numeroSemNove = apenasNumeros.substring(0, posicaoNove) +
                           apenasNumeros.substring(posicaoNove + 1)

      // Mantém caracteres não numéricos do original (espaços, parênteses, etc)
      let indiceNumeros = 0
      let resultado = ''

      for (let i = 0; i < searchParam.length; i++) {
        if (/\d/.test(searchParam[i])) {
          if (indiceNumeros < numeroSemNove.length) {
            resultado += numeroSemNove[indiceNumeros]
            indiceNumeros++
          }
        } else {
          resultado += searchParam[i]
        }
      }

      // Retorna ambas as variações: com 9 e sem 9
      return [searchParam, resultado]
    },
    async localizarContato (search, update, abort) {
      if (search.length < 2) {
        if (this.contatos.length) update(() => { this.contatos = [...this.contatos] })
        abort()
        return
      }
      this.loading = true

      // Gera variações de busca se detectar número com 9
      const variacoes = this.gerarVariacoesBusca(search)

      // Faz busca com a primeira variação (original)
      // Se não encontrar resultados e houver segunda variação (sem 9), tenta também
      const { data } = await ListarContatos({
        searchParam: variacoes[0]
      })

      // Se não encontrou resultados e tem variação sem 9, tenta buscar também
      if (data.contacts.length === 0 && variacoes.length > 1 && variacoes[1] !== variacoes[0]) {
        const { data: dataSemNove } = await ListarContatos({
          searchParam: variacoes[1]
        })

        // Combina resultados (remove duplicatas por ID)
        const idsEncontrados = new Set(data.contacts.map(c => c.id))
        data.contacts = [
          ...data.contacts,
          ...dataSemNove.contacts.filter(c => !idsEncontrados.has(c.id))
        ]
      }

      update(() => {
        if (data.contacts.length) {
          this.contatos = data.contacts
        } else {
          this.contatos = [{}]
          // this.$refs.selectAutoCompleteContato.toggleOption({}, true)
        }
      })
      this.loading = false
    },
    contatoCriadoNotoTicket (contato) {
      this.contatoSelecionado = contato
      this.criarTicket()
    },
    async criarTicket () {
      if (!this.contatoSelecionado.id) return
      this.loading = true
      try {
        const { data: ticket } = await CriarTicket({
          contactId: this.contatoSelecionado.id,
          isActiveDemand: true,
          userId: userId,
          status: 'open'
        })
        await this.$store.commit('SET_HAS_MORE', true)
        const payload = {
          ...ticket,
          accessSource: 'modal_novo_ticket',
          accessTab: 'novo_ticket',
          ticketStatusAtClick: ticket.status,
          queueIdAtClick: ticket.queueId,
          assignedUserId: ticket.userId || ticket.user?.id || null,
          assignedUserName: ticket.user?.name || null
        }
        await this.$store.dispatch('AbrirChatMensagens', payload)
        this.$q.notify({
          message: `Atendimento Iniciado || ${ticket.contact.name} - Ticket: ${ticket.id}`,
          type: 'positive',
          progress: true,
          position: 'top',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
        this.fecharModal()
        if (this.$route.name !== 'atendimento') {
          this.$router.push({ name: 'atendimento' })
        }
      } catch (error) {
        console.error(error)
        this.$notificarErro('Ocorreu um erro ao iniciar o atendimento!', error)
      }
      this.loading = false
    }
  },
  destroyed () {
    this.contatoSelecionado = null
  }
}
</script>

<style lang="scss" scoped>
</style>
