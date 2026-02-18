<template>
  <div>
    <q-table
      class="my-sticky-dynamic"
      title="Contatos"
      :id="`tabela-contatos-${isChatContact ? 'atendimento' : ''}`"
      :data="contacts"
      :columns="columns"
      :loading="loading"
      row-key="id"
      virtual-scroll
      :virtual-scroll-item-size="48"
      :virtual-scroll-sticky-size-start="48"
      :pagination.sync="pagination"
      :rows-per-page-options="[0]"
      @virtual-scroll="onScroll"
      :bordered="isChatContact"
      :square="isChatContact"
      :flat="isChatContact"
      :separator="isChatContact ? 'vertical' : 'horizontal'"
      :class="{
        'q-ma-lg': !isChatContact,
        'q-ml-md heightChat': isChatContact
      }"
    >
      <template v-slot:top>
        <div class="row col-2 q-table__title items-center ">
          <q-btn
            v-if="isChatContact"
            class="q-mr-sm"
            color="black"
            round
            flat
            icon="mdi-close"
            @click="$router.push({ name: 'chat-empty' })"
          />
          Contatos
        </div>
        <q-space />
        <q-input
          v-if="!isImportXLSX"
          :class="{
          'order-last q-mt-md': $q.screen.width < 500
        }"
          style="width: 300px"
          filled
          dense
          debounce="500"
          v-model="filter"
          clearable
          placeholder="Pesquisar"
          @input="filtrarContato"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <!-- <q-btn class="q-ml-md"
          color="warning"
          label="Sincronizar"
          @click="sincronizarContatos" /> -->
        <q-btn
          class="q-ml-md"
          color="black"
          label="Importar"
          v-if="!isImportXLSX && !isChatContact"
          @click="abrirEnvioArquivo"
        />
        <q-btn
          class="q-ml-md"
          color="blue"
          label="Baixar Modelo"
          icon="download"
          v-if="!isImportXLSX && !isChatContact"
          @click="baixarModeloImportacao"
        />
        <q-btn
          class="q-ml-md"
          color="grey-8"
          v-if="!isImportXLSX && !isChatContact"
          label="Exportar"
          @click="handleExportContacts"
        />
        <q-btn
          class="q-ml-md"
          color="primary"
          label="Adicionar"
          v-if="!isImportXLSX"
          @click="selectedContactId = null; modalContato = true"
        />
        <q-file
          ref="PickerFileMessage"
          id="PickerFileMessage"
          v-show="isImportXLSX"
          bg-color="blue-grey-1"
          filled
          dense
          use-chips
          accept=".xlsx"
          v-model="file"
          label="Importar contatos"
          hint="O arquivo deve conter as colunas Nome e Numero (formato Excel). Baixe o modelo acima."
          style="width: 350px;"
        >
          <template v-slot:prepend>
            <q-icon name="cloud_upload" />
          </template>
        </q-file>
        <q-btn
          class="q-ml-md"
          color="positive"
          v-if="isImportXLSX"
          label="Confirmar"
          @click="handleImportXLSX"
        />
        <q-btn
          class="q-ml-md"
          color="negative"
          v-if="isImportXLSX"
          label="Cancelar"
          @click="isImportXLSX = false"
        />

      </template>
      <template v-slot:body-cell-profilePicUrl="props">
        <q-td>
          <q-avatar style="border: 1px solid #9e9e9ea1 !important">
            <q-icon
              name="mdi-account"
              size="1.5em"
              color="grey-5"
              v-if="!props.value"
            />
            <q-img
              :src="props.value"
              style="max-width: 150px"
            >
              <template v-slot:error>
                <q-icon
                  name="mdi-account"
                  size="1.5em"
                  color="grey-5"
                />
              </template>
            </q-img>
          </q-avatar>
        </q-td>
      </template>
      <template v-slot:body-cell-isBlocked="props">
        <q-td class="text-center">
          <q-badge v-if="props.row.isBlocked" color="negative" label="Bloqueado" />
        </q-td>
      </template>
      <template v-slot:body-cell-acoes="props">
        <q-td class="text-center">
          <q-btn
            flat
            round
            icon="img:whatsapp-logo.png"
            @click="handleSaveTicket(props.row, 'whatsapp')"
            v-if="props.row.number"
          />
          <q-btn
            flat
            round
            icon="img:instagram-logo.png"
            @click="handleSaveTicket(props.row, 'instagram')"
            v-if="props.row.instagramPK"
          />
          <q-btn
            flat
            round
            icon="img:telegram-logo.png"
            @click="handleSaveTicket(props.row, 'telegram')"
            v-if="props.row.telegramId"
          />
          <q-btn
            flat
            round
            icon="edit"
            @click="editContact(props.row.id)"
          />
          <q-btn
            v-if="isAdmin || isManager"
            flat
            round
            :icon="props.row.isBlocked ? 'mdi-lock-open' : 'mdi-block-helper'"
            :color="props.row.isBlocked ? 'positive' : 'negative'"
            @click="toggleBlockContact(props.row)"
          >
            <q-tooltip>{{ props.row.isBlocked ? 'Desbloquear contato' : 'Bloquear contato (não receberá mais mensagens)' }}</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            icon="mdi-delete"
            @click="deleteContact(props.row.id)"
          />
        </q-td>
      </template>
      <template v-slot:pagination="{ pagination }">
        {{ contacts.length }}/{{ pagination.rowsNumber }}
      </template>
    </q-table>
    <ContatoModal
      :contactId="selectedContactId"
      :modalContato.sync="modalContato"
      @contatoModal:contato-editado="UPDATE_CONTACTS"
      @contatoModal:contato-criado="UPDATE_CONTACTS"
    />
  </div>
</template>

<script>
const userId = +localStorage.getItem('userId')
import { CriarTicket, AtualizarStatusTicket } from 'src/service/tickets'
import { ListarContatos, ImportarArquivoContato, DeletarContato, SyncronizarContatos, ExportarArquivoContato, BloquearContato } from 'src/service/contatos'
import ContatoModal from './ContatoModal'
import { mapGetters } from 'vuex'
import { formatPhoneDisplay } from 'src/utils/formatPhoneDisplay'
export default {
  name: 'IndexContatos',
  components: { ContatoModal },
  userProfile: 'user',
  usuario: {},
  props: {
    isChatContact: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapGetters(['whatsapps', 'isAdmin', 'isManager'])
  },
  data () {
    return {
      contacts: [],
      modalContato: false,
      file: [],
      isImportXLSX: false,
      filter: null,
      selectedContactId: null,
      params: {
        pageNumber: 1,
        searchParam: null,
        searchVariations: null, // Variações de busca para números com 9
        hasMore: true
      },
      pagination: {
        rowsPerPage: 100,
        rowsNumber: 0,
        lastIndex: 0
      },
      loading: false,
      columns: [
        { name: 'profilePicUrl', label: '', field: 'profilePicUrl', style: 'width: 50px', align: 'center' },
        {
          name: 'name',
          label: 'Nome',
          field: 'name',
          align: 'left',
          style: 'width: 300px',
          format: (v, r) => {
            if (r.number && r.name == r.number && r.pushname) {
              return r.pushname
            }
            if (r.number && r.name == r.number) {
              return formatPhoneDisplay(r.number)
            }
            return r.name
          }
        },
        {
          name: 'number',
          label: 'WhatsApp',
          field: 'number',
          align: 'center',
          style: 'width: 300px',
          format: (v) => formatPhoneDisplay(v || '')
        },
        {
          name: 'wallets',
          label: 'Responsáveis',
          field: 'wallets',
          align: 'center',
          style: 'width: 300px',
          format: v => v ? v.map(n => n.name)?.join(', ') : ''
        },
        {
          name: 'instagramPK',
          label: 'Instagram',
          field: 'instagramPK',
          align: 'center',
          style: 'width: 300px',
          format: (v, r) => {
            return r.instagramPK ? r.pushname : ''
          }
        },
        {
          name: 'telegramId',
          label: 'Id Telegram',
          field: 'telegramId',
          align: 'center',
          style: 'width: 300px',
          format: (v, r) => {
            return r.telegramId ? r.pushname : ''
          }
        },
        { name: 'email', label: 'Email', field: 'email', style: 'width: 500px', align: 'left' },
        { name: 'isBlocked', label: 'Status', field: 'isBlocked', align: 'center', style: 'width: 90px', format: (v) => v ? 'Bloqueado' : '' },
        { name: 'acoes', label: 'Ações', field: 'acoes', align: 'center' }
      ]
    }
  },
  methods: {
    abrirEnvioArquivo (event) {
      this.isImportXLSX = true
      this.$refs.PickerFileMessage.pickFiles(event)
    },
    async atenderTicketContato (contato, ticket) {
      this.loading = true
      try {
        const response = await AtualizarStatusTicket(
          ticket.id,
          'open',
          userId,
          {
            origin: 'contacts'
          }
        )
        const ticketAtualizado = response?.data || {}

        this.$store.commit('SET_MODO_ESPIAR', false)
        this.$store.commit('TICKET_FOCADO', {})
        this.$store.commit('SET_HAS_MORE', true)

        const payload = {
          ...ticketAtualizado,
          accessSource: 'contatos_lista',
          accessTab: 'contacts',
          ticketStatusAtClick: ticket.status,
          queueIdAtClick: ticket.queueId,
          assignedUserId: ticketAtualizado.userId || userId,
          assignedUserName: ticketAtualizado.user?.name || this.usuario?.name || null
        }
        await this.$store.dispatch('AbrirChatMensagens', payload)

        this.$q.notify({
          message: `Atendimento iniciado via contatos || ${contato.name} - Ticket: ${ticketAtualizado.id || ticket.id}`,
          type: 'positive',
          position: 'top',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })

        this.$router.push({ name: 'chat', params: { ticketId: ticketAtualizado.id || ticket.id } })
      } catch (error) {
        console.error(error)
        this.$notificarErro('Não foi possível iniciar o atendimento pelo contato', error)
      } finally {
        this.loading = false
      }
    },
    async handleImportXLSX () {
      try {
        this.$q.notify({
          type: 'warning',
          message: 'Isso pode demorar um pouco.',
          caption: 'Após finalizar, a página será atualizada.',
          position: 'top'
        })
        const formData = new FormData()
        formData.append('file', this.file)
        await ImportarArquivoContato(formData)
        this.$notificarSucesso('Contatos importados com sucesso!')
        this.$router.go(0)
      } catch (err) {
        this.$notificarErro(err)
      }
    },
    downloadFile (downloadLink) {
      const link = document.createElement('a')
      link.href = downloadLink
      link.setAttribute('download', 'contatos.xlsx')
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    baixarModeloImportacao () {
      try {
        // Cria um link para baixar o modelo que está na pasta public
        const link = document.createElement('a')
        link.href = '/Modelo de importação Contato.xlsx'
        link.setAttribute('download', 'Modelo de importação Contato.xlsx')
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        this.$q.notify({
          type: 'positive',
          message: 'Modelo baixado com sucesso!',
          caption: 'Use este arquivo como base para importar seus contatos',
          position: 'top',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      } catch (error) {
        console.error('Erro ao baixar modelo:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao baixar modelo',
          caption: 'Tente novamente ou verifique sua conexão',
          position: 'top',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      }
    },
    handleExportContacts () {
      ExportarArquivoContato()
        .then(res => {
          const downloadLink = res.data.downloadLink
          this.downloadFile(downloadLink)
        })
        .catch(error => {
          console.error('Erro ao exportar contatos:', error)
        })
    },
    LOAD_CONTACTS (contacts) {
      const newContacts = []
      contacts.forEach(contact => {
        const contactIndex = this.contacts.findIndex(c => c.id === contact.id)
        if (contactIndex !== -1) {
          this.contacts[contactIndex] = contact
        } else {
          newContacts.push(contact)
        }
      })
      const contactsObj = [...this.contacts, ...newContacts]
      this.contacts = contactsObj
    },
    UPDATE_CONTACTS (contact) {
      const newContacts = [...this.contacts]
      const contactIndex = newContacts.findIndex(c => c.id === contact.id)
      if (contactIndex !== -1) {
        newContacts[contactIndex] = contact
      } else {
        newContacts.unshift(contact)
      }
      this.contacts = [...newContacts]
    },
    DELETE_CONTACT (contactId) {
      const newContacts = [...this.contacts]
      const contactIndex = newContacts.findIndex(c => c.id === contactId)
      if (contactIndex !== -1) {
        newContacts.splice(contactIndex, 1)
      }
      this.contacts = [...newContacts]
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
    async filtrarContato (data) {
      this.contacts = []
      this.params.pageNumber = 1

      // Gera variações de busca se detectar número com 9
      const variacoes = this.gerarVariacoesBusca(data)

      // Armazena as variações para usar na busca
      this.params.searchParam = variacoes[0]
      this.params.searchVariations = variacoes.length > 1 ? variacoes : null
      this.loading = true
      this.listarContatos()
    },
    async listarContatos () {
      this.loading = true

      // Faz busca com a primeira variação
      const { data } = await ListarContatos(this.params)

      // Se tem variações e não encontrou resultados suficientes, tenta também com a variação sem 9
      if (this.params.searchVariations && this.params.searchVariations.length > 1 &&
          this.params.searchVariations[1] !== this.params.searchVariations[0]) {
        const paramsSemNove = {
          ...this.params,
          searchParam: this.params.searchVariations[1],
          pageNumber: 1 // Busca apenas primeira página da variação sem 9
        }

        const { data: dataSemNove } = await ListarContatos(paramsSemNove)

        // Combina resultados (remove duplicatas por ID)
        const idsEncontrados = new Set(data.contacts.map(c => c.id))
        const novosContatos = dataSemNove.contacts.filter(c => !idsEncontrados.has(c.id))

        // Adiciona novos contatos encontrados
        data.contacts = [...data.contacts, ...novosContatos]

        // Atualiza contagem total (soma aproximada, pode ter duplicatas entre páginas)
        data.count = Math.max(data.count, dataSemNove.count)
      }

      // const user = this.usuario
      // console.log(data)
      // data.contacts = data.contacts.filter(function (element) {
      //   return (user.profile == 'admin' || element.tickets[0].userId == user.userId)
      // })
      this.params.hasMore = data.hasMore
      this.LOAD_CONTACTS(data.contacts)
      this.loading = false
      this.pagination.lastIndex = this.contacts.length - 1
      this.pagination.rowsNumber = data.count
    },
    onScroll ({ to, ref, ...all }) {
      if (this.loading !== true && this.params.hasMore === true && to === this.pagination.lastIndex) {
        this.loading = true
        this.params.pageNumber++
        this.listarContatos()
      }
    },
    async handleSaveTicket (contact, channel) {
      if (!contact.id) return

      const itens = []
      const channelId = null
      this.whatsapps.forEach(w => {
        if (w.type === channel) {
          itens.push({ label: w.name, value: w.id })
        }
      })

      this.$q.dialog({
        title: `Contato: ${contact.name}`,
        message: 'Selecione o canal para iniciar o atendimento.',
        options: {
          type: 'radio',
          model: channelId,
          // inline: true
          isValid: v => !!v,
          items: itens
        },
        ok: {
          push: true,
          color: 'positive',
          label: 'Iniciar'
        },
        cancel: {
          push: true,
          label: 'Cancelar',
          color: 'negative'
        },
        persistent: true
      }).onOk(async channelId => {
        if (!channelId) return
        this.loading = true
        try {
          const { data: ticket } = await CriarTicket({
            contactId: contact.id,
            isActiveDemand: true,
            userId: userId,
            channel,
            channelId,
            status: 'open',
            origin: 'contacts'
          })
          await this.$store.commit('SET_HAS_MORE', true)
          const payload = {
            ...ticket,
            accessSource: 'contatos_novo_ticket',
            accessTab: 'contacts',
            ticketStatusAtClick: ticket.status,
            queueIdAtClick: ticket.queueId,
            assignedUserId: ticket.userId || ticket.user?.id || null,
            assignedUserName: ticket.user?.name || null
          }
          await this.$store.dispatch('AbrirChatMensagens', payload)
          this.$q.notify({
            message: `Atendimento Iniciado || ${ticket.contact.name} - Ticket: ${ticket.id}`,
            type: 'positive',
            position: 'top',
            progress: true,
            actions: [{
              icon: 'close',
              round: true,
              color: 'white'
            }]
          })
          this.$router.push({ name: 'chat', params: { ticketId: ticket.id } })
        } catch (error) {
          if (error.status === 409) {
            const ticketAtual = JSON.parse(error.data.error)
            this.abrirAtendimentoExistente(contact, ticketAtual)
            return
          }
          this.$notificarErro('Ocorreu um erro!', error)
        }
        this.loading = false
      })
    },
    editContact (contactId) {
      this.selectedContactId = contactId
      this.modalContato = true
    },
    async toggleBlockContact (row) {
      const novoEstado = !row.isBlocked
      const acao = novoEstado ? 'bloquear' : 'desbloquear'
      try {
        await BloquearContato(row.id, novoEstado)
        const idx = this.contacts.findIndex(c => c.id === row.id)
        if (idx !== -1) this.contacts.splice(idx, 1, { ...row, isBlocked: novoEstado })
        this.$q.notify({
          type: 'positive',
          progress: true,
          position: 'top',
          message: novoEstado ? 'Contato bloqueado. Mensagens desse número não abrirão atendimentos.' : 'Contato desbloqueado.'
        })
      } catch (error) {
        this.$notificarErro(`Não foi possível ${acao} o contato`, error)
      }
    },
    deleteContact (contactId) {
      this.$q.dialog({
        title: 'Atenção!! Deseja realmente deletar o contato? ',
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
        DeletarContato(contactId)
          .then(res => {
            this.DELETE_CONTACT(contactId)
            this.$q.notify({
              type: 'positive',
              progress: true,
              position: 'top',
              message: 'Contato deletado!',
              actions: [{
                icon: 'close',
                round: true,
                color: 'white'
              }]
            })
          })
          .catch(error => {
            console.error(error)
            this.$notificarErro('Não é possível deletar o contato', error)
          })
        this.loading = false
      })
    },
    abrirChatContato (ticket) {
      // caso esteja em um tamanho mobile, fechar a drawer dos contatos
      if (this.$q.screen.lt.md && ticket.status !== 'pending') {
        this.$root.$emit('infor-cabecalo-chat:acao-menu')
      }
      if (!(ticket.status !== 'pending' && (ticket.id !== this.$store.getters.ticketFocado.id || this.$route.name !== 'chat'))) return
      this.$store.commit('SET_HAS_MORE', true)
      const payload = {
        ...ticket,
        accessSource: 'contatos_lista',
        accessTab: 'contacts',
        ticketStatusAtClick: ticket.status,
        queueIdAtClick: ticket.queueId,
        assignedUserId: ticket.userId || ticket.user?.id || null,
        assignedUserName: ticket.user?.name || null
      }
      this.$store.dispatch('AbrirChatMensagens', payload)
    },
    abrirAtendimentoExistente (contato, ticket) {
      this.$q.dialog({
        title: 'Atenção!!',
        message: `${contato.name} possui um atendimento em curso (Atendimento: ${ticket.id}). Deseja abrir o atendimento?`,
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
        try {
          if (ticket.status === 'pending') {
            await this.atenderTicketContato(contato, ticket)
          } else {
            this.abrirChatContato(ticket)
          }
        } catch (error) {
          this.$notificarErro(
            'Não foi possível abrir o atendimento',
            error
          )
        }
      })
    },
    confirmarSincronizarContatos () {
      this.$q.dialog({
        title: 'Atenção!! Deseja realmente sincronizar os contatos? ',
        message: 'Todas os contatos com os quais você já conversou pelo Whatsapp serão criados. Isso pode demorar um pouco...',
        cancel: {
          label: 'Não',
          color: 'primary',
          push: true
        },
        ok: {
          label: 'Sim',
          color: 'warning',
          push: true
        },
        persistent: true
      }).onOk(async () => {
        this.loading = true
        await this.sincronizarContatos()
        this.loading = false
      })
    },
    async sincronizarContatos () {
      try {
        this.loading = true
        await SyncronizarContatos()
        this.$q.notify({
          type: 'info',
          progress: true,
          position: 'top',
          textColor: 'black',
          message: 'Contatos estão sendo atualizados. Isso pode levar um tempo...',
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
      } catch (error) {
        console.error(error)
        this.$notificarErro('Ocorreu um erro ao sincronizar os contatos', error)
        this.loading = true
      }
      this.loading = true
    }

  },
  mounted () {
    this.usuario = JSON.parse(localStorage.getItem('usuario'))
    this.userProfile = localStorage.getItem('profile')
    this.listarContatos()
  }
}
</script>

<style lang="sass" >
.my-sticky-dynamic
  /* height or max-height is important */
  height: 85vh

  .q-table__top,
  .q-table__bottom,
  thead tr:first-child th /* bg color is important for th; just specify one */
    background-color: #fff

  thead tr th
    position: sticky
    z-index: 1
  /* this will be the loading indicator */
  thead tr:last-child th
    /* height of all previous header rows */
    top: 63px
  thead tr:first-child th
    top: 0

.heightChat
  height: calc(100vh - 0px)
  .q-table__top
    padding: 8px

#tabela-contatos-atendimento
  thead
    th
      height: 55px
</style>
