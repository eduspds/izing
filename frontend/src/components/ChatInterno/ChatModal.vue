<template>
  <q-dialog v-model="show" :maximized="maximized" @hide="handleClose" position="right">
    <q-card class="chat-card" :style="cardStyle">
      <!-- Header -->
      <q-card-section class="bg-primary text-white q-pa-md">
        <div class="row items-center">
          <q-icon name="chat" size="24px" class="q-mr-sm" />
          <div class="text-h6">Chat Interno</div>
          <q-space />
          <!-- Botão Criar Grupo -->
          <q-btn
            v-if="currentTab === 'groups'"
            flat
            round
            dense
            icon="add"
            @click="showCreateGroupDialog = true"
            class="q-ml-sm"
          >
            <q-tooltip>Criar Grupo</q-tooltip>
          </q-btn>
          <!-- Botão Detalhes do Grupo -->
          <q-btn
            v-if="selectedGroup"
            flat
            round
            dense
            icon="info"
            @click="openGroupDetails"
            class="q-ml-sm"
          >
            <q-tooltip>Detalhes do Grupo</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            icon="fullscreen"
            @click="maximized = !maximized"
            class="q-ml-sm"
          />
          <q-btn
            v-if="isAdmin"
            flat
            round
            dense
            icon="settings"
            @click="showConfigDialog = true"
            class="q-ml-xs"
          >
            <q-tooltip>Configurações</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            icon="minimize"
            @click="minimize"
            class="q-ml-xs"
          />
          <q-btn
            flat
            round
            dense
            icon="close"
            @click="close"
            class="q-ml-xs"
          />
        </div>
      </q-card-section>

      <!-- Body -->
      <q-card-section class="q-pa-none" style="height: calc(100% - 60px);">
        <q-splitter v-model="splitter" style="height: 100%;">
          <!-- Sidebar - Lista de Conversas -->
          <template v-slot:before>
            <div class="chat-sidebar">
              <!-- Tabs: Conversas / Grupos -->
              <q-tabs
                v-model="currentTab"
                dense
                class="text-primary"
                active-color="primary"
                indicator-color="primary"
                align="justify"
              >
                <q-tab name="chats" icon="chat">
                  <div class="row items-center">
                    <span>Conversas</span>
                    <q-badge
                      v-if="totalUnreadChats > 0"
                      color="red"
                      :label="totalUnreadChats"
                      class="q-ml-xs"
                      rounded
                    />
                  </div>
                </q-tab>
                <q-tab name="groups" icon="group">
                  <div class="row items-center">
                    <span>Grupos</span>
                    <q-badge
                      v-if="totalUnreadGroups > 0"
                      color="red"
                      :label="totalUnreadGroups"
                      class="q-ml-xs"
                      rounded
                    />
                  </div>
                </q-tab>
              </q-tabs>

              <q-separator />

              <!-- Busca -->
              <q-input
                v-model="searchQuery"
                :placeholder="currentTab === 'chats' ? 'Pesquisar contatos...' : 'Pesquisar grupos...'"
                dense
                outlined
                class="q-ma-sm"
              >
                <template v-slot:prepend>
                  <q-icon name="search" />
                </template>
              </q-input>

              <!-- Tab Panels -->
              <q-tab-panels v-model="currentTab" animated>
                <!-- Tab: Conversas -->
                <q-tab-panel name="chats" class="q-pa-none">
                  <q-list separator>
                <q-item
                  v-for="chat in filteredChats"
                  :key="chat.user.id"
                  clickable
                  :active="selectedChat && selectedChat.user.id === chat.user.id"
                  @click="selectChat(chat)"
                >
                  <q-item-section avatar>
                    <q-avatar color="primary" text-color="white">
                      {{ chat.user.name.charAt(0).toUpperCase() }}
                      <!-- Indicador de status online/offline -->
                      <q-badge
                        v-if="chat.user.isOnline"
                        color="positive"
                        floating
                        rounded
                        style="top: 2px; right: 2px;"
                      />
                      <q-badge
                        v-else
                        color="grey"
                        floating
                        rounded
                        style="top: 2px; right: 2px;"
                      />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ chat.user.name }}</q-item-label>
                    <q-item-label caption v-if="chat.lastMessage" class="row items-center no-wrap">
                      <!-- Ícone de visto se for mensagem enviada por mim -->
                      <q-icon
                        v-if="chat.lastMessage.senderId === currentUserId"
                        :name="chat.lastMessage.isRead ? 'done_all' : 'done'"
                        size="14px"
                        :color="chat.lastMessage.isRead ? 'blue' : 'grey'"
                        class="q-mr-xs"
                      />
                      <span class="ellipsis">{{ formatLastMessage(chat.lastMessage) }}</span>
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side v-if="chat.unreadCount > 0">
                    <q-badge color="red" :label="chat.unreadCount" />
                  </q-item-section>
                </q-item>

                    <q-item v-if="filteredChats.length === 0">
                      <q-item-section>
                        <q-item-label class="text-grey-6 text-center">
                          Nenhuma conversa encontrada
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-tab-panel>

                <!-- Tab: Grupos -->
                <q-tab-panel name="groups" class="q-pa-none">
                  <q-list separator>
                    <q-item
                      v-for="group in filteredGroups"
                      :key="'group-' + group.id"
                      clickable
                      :active="selectedGroup && selectedGroup.id === group.id"
                      @click="selectGroup(group)"
                    >
                      <q-item-section avatar>
                        <q-avatar color="orange" text-color="white">
                          <q-icon name="group" />
                        </q-avatar>
                      </q-item-section>

                      <q-item-section>
                        <q-item-label>{{ group.name }}</q-item-label>
                        <q-item-label caption v-if="group.lastMessage" class="row items-center no-wrap">
                          <span class="ellipsis">
                            <strong>{{ group.lastMessage.senderName }}:</strong>
                            {{ group.lastMessage.message }}
                          </span>
                        </q-item-label>
                        <q-item-label caption v-else class="text-grey-6">
                          <q-icon name="people" size="xs" class="q-mr-xs" />
                          {{ group.members.length }} membro(s)
                        </q-item-label>
                      </q-item-section>

                      <q-item-section side v-if="group.unreadCount > 0">
                        <q-badge color="red" :label="group.unreadCount" />
                      </q-item-section>
                    </q-item>

                    <q-item v-if="filteredGroups.length === 0">
                      <q-item-section>
                        <q-item-label class="text-grey-6 text-center">
                          Nenhum grupo encontrado
                        </q-item-label>
                        <q-item-label caption class="text-center q-mt-sm">
                          <q-btn
                            flat
                            dense
                            color="primary"
                            label="Criar Grupo"
                            icon="add"
                            @click="showCreateGroupDialog = true"
                          />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-tab-panel>
              </q-tab-panels>
            </div>
          </template>

          <!-- Área de Mensagens -->
          <template v-slot:after>
            <div v-if="!selectedChat && !selectedGroup" class="empty-state column items-center justify-center">
              <q-icon name="chat_bubble_outline" size="64px" color="grey-5" />
              <div class="text-grey-6 q-mt-md">
                {{ currentTab === 'chats' ? 'Selecione um contato para começar' : 'Selecione um grupo para começar' }}
              </div>
            </div>

            <div v-else class="chat-messages-area">
              <!-- Header do Chat/Grupo -->
              <div class="chat-header-info bg-grey-2 q-pa-md">
                <div class="row items-center">
                  <!-- Avatar Chat Privado -->
                  <q-avatar v-if="selectedChat" color="primary" text-color="white" size="40px">
                    {{ selectedChat.user.name.charAt(0).toUpperCase() }}
                    <!-- Indicador de status online/offline no header -->
                    <q-badge
                      v-if="selectedChat.user.isOnline"
                      color="positive"
                      floating
                      rounded
                      style="top: 2px; right: 2px;"
                    />
                    <q-badge
                      v-else
                      color="grey"
                      floating
                      rounded
                      style="top: 2px; right: 2px;"
                    />
                  </q-avatar>
                  <!-- Avatar Grupo -->
                  <q-avatar v-else-if="selectedGroup" color="orange" text-color="white" size="40px">
                    <q-icon name="group" />
                  </q-avatar>

                  <div class="q-ml-sm">
                    <div class="text-weight-bold">
                      {{ selectedChat ? selectedChat.user.name : selectedGroup.name }}
                    </div>
                    <div v-if="selectedChat" class="text-caption" :class="selectedChat.user.isOnline ? 'text-positive' : 'text-grey-6'">
                      <q-icon
                        :name="selectedChat.user.isOnline ? 'circle' : 'circle'"
                        size="8px"
                        class="q-mr-xs"
                      />
                      {{ selectedChat.user.isOnline ? 'Online' : formatLastSeen(selectedChat.user.lastOnline) }}
                    </div>
                    <div v-else-if="selectedGroup" class="text-caption text-grey-7">
                      <q-icon name="people" size="xs" class="q-mr-xs" />
                      {{ selectedGroup.members.length }} membro(s)
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mensagens -->
              <q-scroll-area
                ref="scrollArea"
                class="messages-container"
              >
                <div class="q-pa-md">
                  <!-- Botão Carregar Mais -->
                  <div v-if="hasMoreMessages && messages.length > 0" class="text-center q-mb-md">
                    <q-btn
                      flat
                      dense
                      color="primary"
                      :loading="loadingMore"
                      @click="loadMoreMessages"
                      icon="expand_less"
                      label="Carregar mensagens anteriores"
                    />
                  </div>

                  <!-- O container principal que se repete para cada mensagem -->
                  <div
                    v-for="message in messages"
                    :key="message.id"
                    class="message-container"
                    :class="message.senderId === currentUserId ? 'sent-container' : 'received-container'"
                  >
                    <!-- Este é o nosso "agrupador" de mensagem -->
                    <div>
                      <!-- Nome do remetente (a lógica v-if permanece a mesma) -->
                      <div
                        v-if="selectedGroup && message.senderId !== currentUserId"
                        class="message-sender-name"
                      >
                        <span class="text-caption text-weight-bold text-primary">
                          {{ message.sender?.name || 'Desconhecido' }}
                        </span>
                      </div>

                      <!-- O balão da mensagem (agora sem classes de alinhamento) -->
                      <div :class="['message-bubble', message.senderId === currentUserId ? 'sent' : 'received']">
                        <!-- Mídia (Imagem/Vídeo/Arquivo) -->
                        <div v-if="message.mediaUrl" class="message-media q-mb-sm">
                          <!-- Imagem -->
                          <q-img
                            v-if="message.mediaType && message.mediaType.startsWith('image/')"
                            :src="message.mediaUrl"
                            style="max-width: 100%; max-height: 300px; border-radius: 8px; width: 100%;"
                            fit="contain"
                            @click="openMediaViewer(message.mediaUrl, message.mediaType)"
                            class="cursor-pointer"
                          >
                            <template v-slot:error>
                              <div class="absolute-full flex flex-center bg-grey-3 text-grey-7">
                                <q-icon name="broken_image" size="32px" />
                              </div>
                            </template>
                          </q-img>

                          <!-- Vídeo -->
                          <video
                            v-else-if="message.mediaType && message.mediaType.startsWith('video/')"
                            :src="message.mediaUrl"
                            controls
                            style="max-width: 100%; max-height: 300px; border-radius: 8px; width: 100%;"
                          />

                          <!-- Arquivo Genérico -->
                          <q-card
                            v-else
                            flat
                            bordered
                            class="cursor-pointer q-pa-sm"
                            @click="downloadFile(message.mediaUrl, message.mediaName)"
                          >
                            <div class="row items-center no-wrap">
                              <q-icon name="insert_drive_file" size="32px" color="grey-6" class="q-mr-sm" />
                              <div class="col">
                                <div class="text-body2 text-weight-medium">{{ message.mediaName }}</div>
                                <div class="text-caption text-grey-6">Clique para baixar</div>
                              </div>
                              <q-icon name="download" size="24px" color="primary" />
                            </div>
                          </q-card>
                        </div>

                        <!-- Texto da mensagem -->
                        <div v-if="message.message" class="message-content">
                          {{ message.message }}
                        </div>

                        <div class="message-time">
                          {{ formatMessageTime(message.createdAt) }}
                          <q-icon
                            v-if="message.senderId === currentUserId"
                            :name="getReadIcon(message)"
                            size="14px"
                            :color="getReadColor(message)"
                            class="q-ml-xs"
                          >
                            <q-tooltip v-if="selectedGroup && message.readBy">
                              {{ getReadTooltip(message) }}
                            </q-tooltip>
                          </q-icon>
                        </div>
                      </div>
                    </div> <!-- Fim do "agrupador" -->
                  </div> <!-- Fim do container principal -->

                  <div v-if="loading" class="text-center q-pa-md">
                    <q-spinner color="primary" size="30px" />
                  </div>

                  <div v-if="messages.length === 0 && !loading" class="text-center q-pa-md text-grey-6">
                    Nenhuma mensagem ainda. Comece a conversar!
                  </div>
                </div>
              </q-scroll-area>

              <!-- Input de Mensagem -->
              <div class="message-input bg-white q-pa-md">
                <!-- Input de Arquivo (oculto) -->
                <input
                  ref="fileInput"
                  type="file"
                  multiple
                  style="display: none"
                  accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  @change="onFileSelect"
                />

                <!-- Preview de Arquivos Selecionados -->
                <div v-if="selectedFiles.length > 0" class="q-mb-sm">
                  <div class="row q-gutter-sm">
                    <div
                      v-for="(file, index) in selectedFiles"
                      :key="index"
                      class="file-preview-item"
                    >
                      <q-card flat bordered class="relative-position">
                        <q-btn
                          flat
                          dense
                          round
                          icon="close"
                          size="xs"
                          color="negative"
                          class="absolute-top-right z-top"
                          @click="removeFile(index)"
                        />
                        <!-- Preview de Imagem -->
                        <q-img
                          v-if="isImage(file)"
                          :src="previewUrls[index]"
                          style="width: 200px !important; height: 200px !important; min-width: 200px !important; min-height: 200px !important; max-width: 200px !important; max-height: 200px !important;"
                          fit="cover"
                          class="preview-image"
                        />
                        <!-- Preview de Vídeo -->
                        <video
                          v-else-if="isVideo(file)"
                          :src="previewUrls[index]"
                          style="width: 200px !important; height: 200px !important; min-width: 200px !important; min-height: 200px !important; max-width: 200px !important; max-height: 200px !important; object-fit: cover;"
                          class="preview-video"
                        />
                        <!-- Preview de Arquivo Genérico -->
                        <div v-else class="q-pa-md text-center" style="width: 200px; min-width: 200px;">
                          <q-icon name="insert_drive_file" size="48px" color="grey-6" />
                          <div class="text-caption text-grey-7" style="word-break: break-word;">
                            {{ file.name }}
                          </div>
                        </div>
                      </q-card>
                    </div>
                  </div>
                </div>

                <!-- Input de Mensagem -->
                <q-input
                  v-model="newMessage"
                  placeholder="Digite sua mensagem..."
                  outlined
                  dense
                  @keydown.enter.exact.prevent="sendMessage"
                  autofocus
                >
                  <template v-slot:prepend>
                    <q-btn
                      round
                      dense
                      flat
                      icon="attach_file"
                      color="grey-7"
                      @click="openFileSelector"
                    >
                      <q-tooltip>Anexar arquivo</q-tooltip>
                    </q-btn>
                  </template>
                  <template v-slot:append>
                    <q-btn
                      round
                      dense
                      flat
                      icon="send"
                      color="primary"
                      :disable="!newMessage.trim() && selectedFiles.length === 0"
                      @click="sendMessage"
                    />
                  </template>
                </q-input>
              </div>
            </div>
          </template>
        </q-splitter>
      </q-card-section>
    </q-card>

    <!-- Dialogs de Grupo -->
    <CreateGroupDialog
      v-model="showCreateGroupDialog"
      :available-users="contacts"
      @group-created="handleGroupCreated"
    />

    <GroupDetailsDialog
      v-if="selectedGroup"
      :key="`group-details-${selectedGroup.id}`"
      v-model="showGroupDetailsDialog"
      :group="selectedGroup"
      :available-users="contacts"
      @member-added="handleMemberAdded"
      @member-removed="handleMemberRemoved"
      @left-group="handleLeftGroup"
      @group-updated="handleGroupUpdated"
    />

    <ChatConfigDialog v-model="showConfigDialog" />

    <!-- Dialog de Visualização de Mídia -->
    <q-dialog v-model="showMediaViewer" maximized>
      <q-card class="media-viewer-card">
        <q-card-section class="row items-center q-pb-none media-viewer-header">
          <q-space />
          <q-btn icon="close" flat round dense color="white" @click="showMediaViewer = false" />
        </q-card-section>

        <q-card-section class="media-viewer-content">
          <img
            v-if="currentMedia && currentMediaType && currentMediaType.startsWith('image/')"
            :src="currentMedia"
            class="media-viewer-image"
            alt="Imagem"
            @load="console.log('Imagem carregada:', currentMedia)"
            @error="console.error('Erro ao carregar imagem:', currentMedia)"
          />
          <video
            v-else-if="currentMedia && currentMediaType && currentMediaType.startsWith('video/')"
            :src="currentMedia"
            controls
            class="media-viewer-video"
          />
          <div v-else class="text-white text-center">
            <q-icon name="broken_image" size="64px" />
            <div class="q-mt-md">Não foi possível carregar a mídia</div>
            <div class="text-caption q-mt-sm">{{ currentMedia }}</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script>
import { enviarMensagem, listarMensagens, listarConversas, listarContatos, marcarComoLida } from 'src/service/internalChat'
import { listarGrupos } from 'src/service/internalGroups'
// import { socketIO } from 'src/utils/socket'
import { getSocket } from 'src/utils/socket' // ✅ IMPORT CORRETO
import { format /* formatDistanceToNow */ } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CreateGroupDialog from './CreateGroupDialog.vue'
import GroupDetailsDialog from './GroupDetailsDialog.vue'
import ChatConfigDialog from './ChatConfigDialog.vue'

const socket = getSocket()

export default {
  name: 'ChatInternalModal',

  components: {
    CreateGroupDialog,
    GroupDetailsDialog,
    ChatConfigDialog
  },

  props: {
    value: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      show: this.value,
      maximized: false,
      splitter: 30,
      searchQuery: '',
      currentTab: 'chats',
      chats: [],
      contacts: [], // Lista de todos os usuários disponíveis
      groups: [], // Lista de grupos
      selectedChat: null,
      selectedGroup: null,
      messages: [],
      newMessage: '',
      loading: false,
      loadingMore: false,
      hasMoreMessages: true,
      currentPage: 1,
      messagesPerPage: 20,
      currentUserId: Number(localStorage.getItem('userId')),
      tenantId: JSON.parse(localStorage.getItem('usuario') || '{}').tenantId,
      socketEvents: [], // Armazenar eventos para cleanup
      showCreateGroupDialog: false,
      showGroupDetailsDialog: false,
      showConfigDialog: false,
      selectedFiles: [], // Arquivos selecionados para envio
      previewUrls: [], // URLs de preview dos arquivos
      showMediaViewer: false,
      currentMedia: null,
      currentMediaType: null,
      socketInitialized: false
    }
  },

  computed: {
    isAdmin () {
      const profile = localStorage.getItem('profile')
      return profile === 'admin'
    },

    totalUnreadChats () {
      return this.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
    },

    totalUnreadGroups () {
      return this.groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0)
    },

    cardStyle () {
      if (this.maximized) {
        return {
          width: '100vw',
          height: '100vh'
        }
      }
      return {
        width: '900px',
        height: '600px',
        maxWidth: '90vw',
        maxHeight: '90vh'
      }
    },

    filteredGroups () {
      if (!this.searchQuery) {
        return this.groups
      }
      const search = this.searchQuery.toLowerCase()
      return this.groups.filter(group =>
        group.name.toLowerCase().includes(search) ||
        (group.description && group.description.toLowerCase().includes(search))
      )
    },

    filteredChats () {
      // Mesclar conversas existentes com todos os contatos disponíveis
      const allChats = this.mergeChatsWithContacts()

      if (!this.searchQuery) {
        return allChats
      }

      const query = this.searchQuery.toLowerCase()
      return allChats.filter(chat =>
        chat.user.name.toLowerCase().includes(query) ||
        chat.user.email.toLowerCase().includes(query)
      )
    },

    totalUnread () {
      return this.chats.reduce((sum, chat) => sum + chat.unreadCount, 0)
    }
  },

  watch: {
    value (val) {
      this.show = val
      if (val) {
        this.loadInitialData()
        this.setupSocket()
        // Emitir evento que chat foi aberto
        this.$root.$emit('chat-interno:aberto')
      } else {
        // Modal fechado - limpar estado
        this.selectedChat = null
        this.selectedGroup = null
        this.messages = []
        this.newMessage = ''

        // ✅ Limpar socket listeners
        this.cleanupSocket()

        // ✅ Emitir evento para limpar contato ativo
        this.$emit('chat-interno:contato-selecionado', null)

        console.log('🔒 Modal fechado, estado limpo')
      }
    },

    show (val) {
      this.$emit('input', val)
    }
  },

  beforeDestroy () {
    // ✅ Garantir limpeza ao destruir componente
    console.log('💥 ChatModal destruído, limpando listeners')
    this.cleanupSocket()
    // Limpar listeners de socket
    // const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
    // socket.off(`${usuario.tenantId}:internalChat`)
  },

  methods: {
    checkSocketConnection () {
      if (!socket.connected) {
        console.warn('🔌 Socket não conectado, tentando reconectar...')

        // Tentar reconectar
        socket.connect()

        // Reconfigurar listeners após conexão
        socket.once('connect', () => {
          console.log('🔌 Socket reconectado, reconfigurando listeners...')
          this.setupSocket()
        })
      }
    },

    async loadInitialData () {
      // Carregar conversas existentes, contatos disponíveis e grupos
      await Promise.all([
        this.loadChats(),
        this.loadContacts(),
        this.loadGroups()
      ])
    },

    async loadChats () {
      try {
        const { data } = await listarConversas()
        this.chats = data
      } catch (error) {
        console.error('Erro ao carregar conversas:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao carregar conversas',
          position: 'top'
        })
      }
    },

    async loadContacts () {
      try {
        const { data } = await listarContatos()
        console.log('👥 Contatos carregados:', data)
        this.contacts = data

        // Debug: verificar status online dos contatos
        data.forEach(contact => {
          console.log(`📡 ${contact.name}: isOnline=${contact.isOnline}, lastOnline=${contact.lastOnline}`)
        })
      } catch (error) {
        console.error('Erro ao carregar contatos:', error)
      }
    },

    async loadGroups () {
      try {
        const { data } = await listarGrupos()
        console.log('📁 Grupos carregados:', data)
        this.groups = data
      } catch (error) {
        console.error('Erro ao carregar grupos:', error)
      }
    },

    mergeChatsWithContacts () {
      // Criar map de conversas existentes por userId
      const chatsMap = new Map()
      this.chats.forEach(chat => {
        chatsMap.set(chat.user.id, chat)
      })

      // Adicionar todos os contatos, mesclando com conversas existentes
      const merged = this.contacts.map(contact => {
        const existingChat = chatsMap.get(contact.id)

        if (existingChat) {
          // Conversa já existe, retornar com dados atualizados
          return existingChat
        } else {
          // Novo contato sem conversa ainda
          return {
            user: contact,
            lastMessage: null,
            unreadCount: 0
          }
        }
      })

      // Ordenar: conversas com mensagens no topo, depois alfabético
      return merged.sort((a, b) => {
        if (a.lastMessage && !b.lastMessage) return -1
        if (!a.lastMessage && b.lastMessage) return 1
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
        }
        return a.user.name.localeCompare(b.user.name)
      })
    },

    async selectChat (chat) {
      this.selectedChat = chat
      this.selectedGroup = null // Limpar grupo selecionado
      this.loading = true

      // ✅ Emitir evento para o MainLayout saber qual contato está ativo
      this.$emit('chat-interno:contato-selecionado', chat.user.id)

      // Marcar como lidas ANTES de carregar mensagens
      if (chat.unreadCount > 0) {
        try {
          const unreadCount = chat.unreadCount
          console.log('📖 Marcando como lidas:', unreadCount, 'mensagens de', chat.user.name)
          await marcarComoLida({ recipientId: chat.user.id })

          // Forçar reatividade do Vue
          this.$set(chat, 'unreadCount', 0)

          // Emitir evento para MainLayout decrementar contador
          this.$root.$emit('chat-interno:mensagens-lidas', unreadCount)
          console.log('✅ Mensagens marcadas como lidas, badge removido')
        } catch (error) {
          console.error('Erro ao marcar como lida:', error)
        }
      }

      try {
        // Reset paginação
        this.currentPage = 1
        this.hasMoreMessages = true
        this.messages = []

        const { data } = await listarMensagens({
          recipientId: chat.user.id,
          limit: this.messagesPerPage,
          offset: 0
        })

        this.messages = data.messages || []
        this.hasMoreMessages = data.hasMore !== undefined ? data.hasMore : (data.messages && data.messages.length === this.messagesPerPage)

        // Mensagens já foram marcadas como lidas no selectChat
        // Atualizar lista de conversas para refletir mudanças
        this.$nextTick(() => {
          this.loadChats()
        })

        // Scroll para o final (mensagem mais recente)
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error)
      } finally {
        this.loading = false
      }
    },

    openFileSelector () {
      if (this.$refs.fileInput) {
        this.$refs.fileInput.click()
      }
    },

    onFileSelect (event) {
      const files = Array.from(event.target.files)
      if (files.length === 0) return

      // Adicionar arquivos à lista
      this.selectedFiles = [...this.selectedFiles, ...files]

      // Criar URLs de preview
      files.forEach(file => {
        if (this.isImage(file) || this.isVideo(file)) {
          const url = URL.createObjectURL(file)
          this.previewUrls.push(url)
        } else {
          this.previewUrls.push(null)
        }
      })

      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      event.target.value = ''
    },

    removeFile (index) {
      // Revogar URL de preview se existir
      if (this.previewUrls[index]) {
        URL.revokeObjectURL(this.previewUrls[index])
      }

      this.selectedFiles.splice(index, 1)
      this.previewUrls.splice(index, 1)
    },

    isImage (file) {
      return file.type.startsWith('image/')
    },

    isVideo (file) {
      return file.type.startsWith('video/')
    },

    clearFileSelection () {
      // Limpar URLs de preview
      this.previewUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })

      this.selectedFiles = []
      this.previewUrls = []
    },

    async sendMessage () {
      // ✅ Verificar conexão antes de enviar
      this.checkSocketConnection()

      if (!this.newMessage.trim() && this.selectedFiles.length === 0) return
      if (!this.selectedChat && !this.selectedGroup) return

      const messageText = this.newMessage.trim()
      this.newMessage = ''
      const hasFiles = this.selectedFiles.length > 0

      try {
        // Preparar dados base
        const baseData = this.selectedGroup
          ? { groupId: this.selectedGroup.id }
          : { recipientId: this.selectedChat.user.id }

        // Se tiver arquivos, enviar com FormData
        if (hasFiles) {
          const formData = new FormData()

          // Adicionar destinatário
          if (this.selectedGroup) {
            formData.append('groupId', String(this.selectedGroup.id))
            console.log('📤 Enviando arquivos para grupo:', this.selectedGroup.name)
          } else {
            formData.append('recipientId', String(this.selectedChat.user.id))
            console.log('📤 Enviando arquivos para:', this.selectedChat.user.name)
          }

          // Adicionar mensagem de texto (se houver)
          if (messageText) {
            formData.append('message', messageText)
          }

          // Adicionar arquivos
          this.selectedFiles.forEach(file => {
            formData.append('medias', file)
          })

          await enviarMensagem(formData)

          // Limpar seleção de arquivos
          this.clearFileSelection()
        } else {
          // Se for apenas texto, enviar como JSON
          await enviarMensagem({
            ...baseData,
            message: messageText
          })
        }

        // Mensagem será adicionada via socket
        this.scrollToBottom()
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Erro ao enviar mensagem',
          position: 'top'
        })
      }
    },

    setupSocket () {
    // ✅ EVITAR MÚLTIPLAS INICIALIZAÇÕES
      if (this.socketInitialized) {
        console.log('🔌 Socket já inicializado, ignorando setup duplicado')
        return
      }

      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
      const userId = Number(localStorage.getItem('userId'))

      console.log('🔌 Inicializando socket listeners do chat interno')

      // ✅ LIMPAR listeners antigos antes de criar novos
      this.cleanupSocket()

      // Armazenar nomes dos eventos para cleanup
      this.socketEvents = [
      `${usuario.tenantId}:internalChat`,
      `${usuario.tenantId}:chat:updateOnlineBubbles`,
      `${usuario.tenantId}:users`
      ]

      // ✅ CONFIGURAR LISTENERS APENAS UMA VEZ
      this.socketEvents.forEach(event => {
        socket.off(event) // Limpar antes de adicionar
      })

      // Escutar eventos do chat interno
      socket.on(`${usuario.tenantId}:internalChat`, (data) => {
        console.log('📨 Evento de chat interno:', data)

        if (data.type === 'internalChat:message') {
          this.handleNewMessage(data.payload)
        } else if (data.type === 'internalChat:update') {
          this.handleMessageUpdate(data.payload)
        } else if (data.type === 'internalChat:groupCreated') {
          this.handleGroupCreatedEvent(data.payload)
        } else if (data.type === 'internalChat:groupMembersAdded') {
          this.handleGroupMembersAddedEvent(data.payload)
        } else if (data.type === 'internalChat:groupMemberRemoved') {
          this.handleGroupMemberRemovedEvent(data.payload)
        } else if (data.type === 'internalChat:groupDeleted') {
          this.handleGroupDeletedEvent(data.payload)
        } else if (data.type === 'internalChat:groupUpdated') {
          this.handleGroupUpdatedEvent(data.payload)
        }
      })

      // Escutar eventos de status online/offline
      socket.on(`${usuario.tenantId}:chat:updateOnlineBubbles`, (data) => {
        console.log('👥 Atualização de status online:', data)
        if (data && typeof data === 'object') {
          this.handleOnlineStatusUpdate(data)
        }
      })

      // Escutar eventos de usuários (status geral)
      socket.on(`${usuario.tenantId}:users`, (data) => {
        console.log('👤 Evento de usuários recebido:', data)
        if (data.action === 'update' && data.data) {
          if (data.data.usersOnline) {
            this.handleOnlineStatusUpdate(data.data.usersOnline)
          }
        }
      })

      // ✅ Entrar na sala do usuário para receber mensagens privadas
      if (socket.connected) {
        socket.emit('joinInternalChat', { userId, tenantId: usuario.tenantId })
      } else {
      // Se não estiver conectado, esperar pela conexão
        socket.once('connect', () => {
          socket.emit('joinInternalChat', { userId, tenantId: usuario.tenantId })
        })
      }

      this.socketInitialized = true
      console.log('✅ Socket listeners configurados com sucesso')
    },

    cleanupSocket () {
      console.log('🧹 Limpando socket listeners do chat interno')

      if (this.socketEvents && this.socketEvents.length > 0) {
        this.socketEvents.forEach(event => {
          socket.off(event)
          console.log('🗑️ Removido listener:', event)
        })
      }

      this.socketInitialized = false
    },

    handleNewMessage (message) {
      console.log('💬 handleNewMessage chamado:', message)
      console.log('📋 CurrentUserId:', this.currentUserId)
      console.log('📋 SelectedChat:', this.selectedChat)
      console.log('📋 SelectedGroup:', this.selectedGroup)

      // Verificar se mensagem já existe (evitar duplicatas)
      const exists = this.messages.find(m => m.id === message.id)
      if (exists) {
        console.log('⚠️ Mensagem já existe, ignorando')
        return
      }

      // ✅ Se for mensagem de grupo, tratar separadamente
      if (message.groupId) {
        this.handleGroupMessage(message)
        return
      }

      // Se é mensagem do chat atual, adicionar à lista
      if (this.selectedChat) {
        const isCurrentChat =
          (message.senderId === this.selectedChat.user.id && message.recipientId === this.currentUserId) ||
          (message.senderId === this.currentUserId && message.recipientId === this.selectedChat.user.id)

        console.log('🔍 Verificando se é mensagem do chat atual:')
        console.log('   message.senderId:', message.senderId, '=== selectedChat.user.id:', this.selectedChat.user.id, '?', message.senderId === this.selectedChat.user.id)
        console.log('   message.recipientId:', message.recipientId, '=== currentUserId:', this.currentUserId, '?', message.recipientId === this.currentUserId)
        console.log('   message.senderId:', message.senderId, '=== currentUserId:', this.currentUserId, '?', message.senderId === this.currentUserId)
        console.log('   message.recipientId:', message.recipientId, '=== selectedChat.user.id:', this.selectedChat.user.id, '?', message.recipientId === this.selectedChat.user.id)
        console.log('   isCurrentChat:', isCurrentChat)

        if (isCurrentChat) {
          console.log('✅ Mensagem do chat atual, adicionando')
          this.messages.push(message)
          this.$nextTick(() => {
            this.scrollToBottom()
          })

          // Marcar como lida automaticamente se for mensagem recebida no chat ativo
          if (message.senderId !== this.currentUserId && !message.isRead) {
            marcarComoLida({ recipientId: message.senderId })
              .then(() => {
                // Atualizar contador local com reatividade
                const chat = this.chats.find(c => c.user.id === message.senderId)
                if (chat && chat.unreadCount > 0) {
                  this.$set(chat, 'unreadCount', Math.max(0, chat.unreadCount - 1))
                }
              })
              .catch(err => console.error('Erro ao marcar como lida:', err))
          }
        } else {
          console.log('❌ Mensagem NÃO é do chat atual')

          // Se não é do chat atual, mas é mensagem recebida (não enviada por mim)
          // incrementar contador de não lidas
          if (message.senderId !== this.currentUserId) {
            console.log('📬 Mensagem de outro chat, incrementando contador')
            const chat = this.chats.find(c => c.user.id === message.senderId)
            if (chat) {
              console.log('➕ Incrementando unreadCount de', chat.user.name)
              this.$set(chat, 'unreadCount', (chat.unreadCount || 0) + 1)

              // ✅ Emitir evento para MainLayout incrementar contador global
              this.$root.$emit('chat-interno:incrementar-contador', 1)
            }
          }
        }
      } else {
        console.log('⚠️ Nenhum chat selecionado')

        // Mesmo sem chat selecionado, se for mensagem recebida, incrementar contador
        if (message.senderId !== this.currentUserId) {
          console.log('📬 Mensagem recebida sem chat selecionado, incrementando contador')
          const chat = this.chats.find(c => c.user.id === message.senderId)
          if (chat) {
            console.log('➕ Incrementando unreadCount de', chat.user.name)
            this.$set(chat, 'unreadCount', (chat.unreadCount || 0) + 1)

            // ✅ Emitir evento para MainLayout incrementar contador global
            this.$root.$emit('chat-interno:incrementar-contador', 1)
          }
        }
      }

      // Atualizar lista de conversas
      this.updateChatsList(message)

      // NÃO mostrar notificação aqui - o MainLayout cuida disso
      // Só mostrar se o modal estiver fechado (MainLayout já verifica isso)
    },

    handleUserStatusUpdate (userData) {
      console.log('🔄 Atualizando status de usuário específico:', userData)

      // Encontrar usuário por email (mais confiável que ID)
      const updateUser = (users, userData) => {
        users.forEach((user, index) => {
          if (user.email === userData.email || user.name === userData.username) {
            console.log(`📡 Atualizando ${user.name}: ${user.isOnline} → ${userData.isOnline}`)
            this.$set(users[index], 'isOnline', userData.isOnline)
            if (userData.lastLogin) {
              this.$set(users[index], 'lastOnline', new Date(userData.lastLogin))
            } else if (userData.lastLogout) {
              this.$set(users[index], 'lastOnline', new Date(userData.lastLogout))
            }
          }
        })
      }

      // Atualizar contatos
      updateUser(this.contacts, userData)

      // Atualizar chats
      this.chats.forEach((chat, index) => {
        updateUser([chat.user], userData)
      })

      // Atualizar chat selecionado
      if (this.selectedChat) {
        updateUser([this.selectedChat.user], userData)
      }
    },

    handleOnlineStatusUpdate (onlineUsers) {
      console.log('🔄 Atualizando status online dos usuários')
      console.log('🔄 Dados recebidos:', onlineUsers)

      if (!onlineUsers || typeof onlineUsers !== 'object') {
        console.log('⚠️ Dados inválidos para updateOnlineBubbles')
        return
      }

      // onlineUsers é um objeto com userId como chave
      const onlineUserIds = Object.keys(onlineUsers).map(id => parseInt(id))
      console.log('🔄 IDs online:', onlineUserIds)

      let updatedAny = false

      // Atualizar status de todos os contatos
      this.contacts.forEach((contact, index) => {
        const isOnline = onlineUserIds.includes(contact.id)
        if (contact.isOnline !== isOnline) {
          console.log(`📡 ${contact.name}: ${contact.isOnline ? 'online' : 'offline'} → ${isOnline ? 'online' : 'offline'}`)
          this.$set(this.contacts[index], 'isOnline', isOnline)
          if (isOnline) {
            this.$set(this.contacts[index], 'lastOnline', new Date())
          }
          updatedAny = true
        }
      })

      // Atualizar status nos chats
      this.chats.forEach((chat, index) => {
        const isOnline = onlineUserIds.includes(chat.user.id)
        if (chat.user.isOnline !== isOnline) {
          console.log(`📡 Chat ${chat.user.name}: ${chat.user.isOnline ? 'online' : 'offline'} → ${isOnline ? 'online' : 'offline'}`)
          this.$set(this.chats[index].user, 'isOnline', isOnline)
          if (isOnline) {
            this.$set(this.chats[index].user, 'lastOnline', new Date())
          }
          updatedAny = true
        }
      })

      // Atualizar status do chat selecionado
      if (this.selectedChat) {
        const isOnline = onlineUserIds.includes(this.selectedChat.user.id)
        if (this.selectedChat.user.isOnline !== isOnline) {
          console.log(`📡 Chat selecionado ${this.selectedChat.user.name}: ${this.selectedChat.user.isOnline ? 'online' : 'offline'} → ${isOnline ? 'online' : 'offline'}`)
          this.$set(this.selectedChat.user, 'isOnline', isOnline)
          if (isOnline) {
            this.$set(this.selectedChat.user, 'lastOnline', new Date())
          }
          updatedAny = true
        }
      }

      if (updatedAny) {
        console.log('✅ Status online atualizado com sucesso!')
      }
    },

    handleGroupCreatedEvent (payload) {
      console.log('🎉 Grupo criado via socket:', payload)

      // Adicionar grupo à lista
      this.loadGroups()

      // Notificar
      this.$q.notify({
        message: `Você foi adicionado ao grupo "${payload.group.name}"`,
        color: 'positive',
        icon: 'group_add',
        position: 'top'
      })
    },

    handleGroupMembersAddedEvent (payload) {
      console.log('👥 Membros adicionados via socket:', payload)

      const group = this.groups.find(g => g.id === payload.groupId)
      if (group) {
        // Adicionar novos membros
        payload.newMembers.forEach(member => {
          if (!group.members.some(m => m.id === member.id)) {
            group.members.push(member)
          }
        })
      }

      // Atualizar selectedGroup se for o grupo ativo
      if (this.selectedGroup && this.selectedGroup.id === payload.groupId) {
        payload.newMembers.forEach(member => {
          if (!this.selectedGroup.members.some(m => m.id === member.id)) {
            this.selectedGroup.members.push(member)
          }
        })

        this.$q.notify({
          message: `${payload.newMembers.map(m => m.name).join(', ')} foi adicionado ao grupo`,
          color: 'info',
          icon: 'person_add',
          position: 'top'
        })
      }
    },

    handleGroupMemberRemovedEvent (payload) {
      console.log('👤 Membro removido via socket:', payload)

      // Se EU fui removido/saí
      if (payload.removedMember.id === this.currentUserId) {
        this.groups = this.groups.filter(g => g.id !== payload.groupId)

        if (this.selectedGroup && this.selectedGroup.id === payload.groupId) {
          this.selectedGroup = null
          this.messages = []
          this.$emit('chat-interno:contato-selecionado', null)
        }

        this.$q.notify({
          message: payload.action === 'left'
            ? `Você saiu do grupo "${payload.groupName}"`
            : `Você foi removido do grupo "${payload.groupName}"`,
          color: 'warning',
          icon: 'exit_to_app',
          position: 'top'
        })
      } else {
        // Outro membro foi removido
        const group = this.groups.find(g => g.id === payload.groupId)
        if (group) {
          group.members = group.members.filter(m => m.id !== payload.removedMember.id)
        }

        // Atualizar selectedGroup se for o grupo ativo
        if (this.selectedGroup && this.selectedGroup.id === payload.groupId) {
          this.selectedGroup.members = this.selectedGroup.members.filter(m => m.id !== payload.removedMember.id)

          this.$q.notify({
            message: `${payload.removedMember.name} ${payload.action === 'left' ? 'saiu' : 'foi removido'} do grupo`,
            color: 'info',
            icon: 'person_remove',
            position: 'top'
          })
        }
      }
    },

    handleGroupDeletedEvent (payload) {
      console.log('🗑️ Grupo deletado via socket:', payload)

      this.groups = this.groups.filter(g => g.id !== payload.groupId)

      if (this.selectedGroup && this.selectedGroup.id === payload.groupId) {
        this.selectedGroup = null
        this.messages = []
        this.$emit('chat-interno:contato-selecionado', null)
      }

      this.$q.notify({
        message: `O grupo "${payload.groupName}" foi deletado`,
        color: 'info',
        icon: 'delete',
        position: 'top'
      })
    },

    handleGroupUpdatedEvent (payload) {
      console.log('✏️ Grupo atualizado via socket:', payload)

      // Atualizar na lista de grupos
      const groupIndex = this.groups.findIndex(g => g.id === payload.groupId)
      if (groupIndex !== -1) {
        this.$set(this.groups[groupIndex], 'name', payload.name)
        this.$set(this.groups[groupIndex], 'description', payload.description)
        this.$set(this.groups[groupIndex], 'department', payload.department)
        this.$set(this.groups[groupIndex], 'allowedProfile', payload.allowedProfile)
      }

      // Atualizar se for o grupo selecionado
      if (this.selectedGroup && this.selectedGroup.id === payload.groupId) {
        this.$set(this.selectedGroup, 'name', payload.name)
        this.$set(this.selectedGroup, 'description', payload.description)
        this.$set(this.selectedGroup, 'department', payload.department)
        this.$set(this.selectedGroup, 'allowedProfile', payload.allowedProfile)
      }

      this.$q.notify({
        message: `O grupo "${payload.name}" foi atualizado`,
        color: 'info',
        icon: 'edit',
        position: 'top'
      })
    },

    handleMessageUpdate (update) {
      console.log('🔄 handleMessageUpdate chamado:', update)

      if (update.action === 'markAsRead') {
        console.log('📖 Mensagens marcadas como lidas:', update.count, 'mensagens')

        // Atualizar contador local do chat correspondente
        if (update.recipientId) {
          const chat = this.chats.find(c => c.user.id === update.recipientId)
          if (chat && chat.unreadCount > 0) {
            console.log('📉 Atualizando contador local de', chat.user.name, 'de', chat.unreadCount, 'para 0')
            this.$set(chat, 'unreadCount', 0)
          }
        }

        // Atualizar status isRead das mensagens na conversa ativa
        if (this.selectedChat && update.userId === this.selectedChat.user.id) {
          console.log('💬 Atualizando status isRead das mensagens em tempo real')
          this.messages.forEach((msg, index) => {
            if (msg.senderId === this.currentUserId && !msg.isRead) {
              console.log('✅ Marcando mensagem como lida:', msg.id)
              this.$set(this.messages[index], 'isRead', true)
            }
          })
        }

        // Recarregar lista de conversas para sincronizar com backend
        this.$nextTick(() => {
          this.loadChats()
        })
      } else if (update.action === 'groupMessageRead') {
        // ✅ Atualizar status de leitura de grupo
        console.log('👥 Mensagem de grupo lida:', update)

        // Encontrar mensagem e atualizar readBy
        const msgIndex = this.messages.findIndex(m => m.id === update.messageId)
        if (msgIndex !== -1) {
          this.$set(this.messages[msgIndex], 'readBy', update.readBy)
          console.log(`✅ ${update.readBy.length} membro(s) visualizaram. Todos? ${update.allRead}`)
        }

        // ✅ Atualizar contador do grupo se todas as mensagens foram lidas
        if (update.groupId) {
          const group = this.groups.find(g => g.id === update.groupId)
          if (group && group.unreadCount > 0) {
            console.log('📉 Atualizando contador do grupo após leitura')
            this.$set(group, 'unreadCount', Math.max(0, group.unreadCount - 1))
          }
        }
      } else if (update.id) {
        // Atualizar mensagem na lista se existir
        const index = this.messages.findIndex(m => m.id === update.id)
        if (index !== -1) {
          this.$set(this.messages, index, { ...this.messages[index], ...update })
        }
      }
    },

    handleGroupMessage (message) {
      console.log('👥 Mensagem de grupo recebida:', message)

      // Se estiver no grupo ativo
      if (this.selectedGroup && this.selectedGroup.id === message.groupId) {
        console.log('✅ Mensagem é do grupo atual, adicionando à lista')
        this.messages.push(message)
        this.$nextTick(() => this.scrollToBottom())

        // Marcar como lida automaticamente
        marcarComoLida({ groupId: message.groupId })
          .then(() => {
            // ✅ Garantir que o contador do grupo está zerado
            const group = this.groups.find(g => g.id === message.groupId)
            if (group && group.unreadCount > 0) {
              console.log('📖 Zerando contador do grupo após marcar como lida')
              this.$set(group, 'unreadCount', 0)
            }
          })
          .catch(err => console.error('Erro ao marcar como lida:', err))
      } else {
        console.log('📬 Mensagem de outro grupo, incrementando contador')

        // Incrementar contador do grupo se não for mensagem própria
        if (message.senderId !== this.currentUserId) {
          const group = this.groups.find(g => g.id === message.groupId)
          if (group) {
            console.log('➕ Incrementando unreadCount do grupo', group.name)
            this.$set(group, 'unreadCount', (group.unreadCount || 0) + 1)

            // ✅ Emitir evento para MainLayout incrementar contador global
            this.$root.$emit('chat-interno:incrementar-contador', 1)
          }
        }
      }

      // Atualizar lista de grupos
      this.updateGroupsList(message)
    },

    updateGroupsList (message) {
      const group = this.groups.find(g => g.id === message.groupId)

      if (group) {
        group.lastMessage = {
          message: message.message,
          createdAt: message.createdAt,
          senderId: message.senderId,
          senderName: message.sender?.name || 'Desconhecido',
          isRead: message.isRead || false
        }

        console.log('📊 Atualizando lastMessage do grupo', group.name)

        // Mover para o topo
        this.groups = [group, ...this.groups.filter(g => g.id !== message.groupId)]
      } else {
        // Recarregar lista de grupos
        this.loadGroups()
      }
    },

    updateChatsList (message) {
      const otherUserId = message.senderId === this.currentUserId ? message.recipientId : message.senderId

      const chat = this.chats.find(c => c.user.id === otherUserId)

      if (chat) {
        chat.lastMessage = {
          message: message.message,
          createdAt: message.createdAt,
          senderId: message.senderId,
          isRead: message.isRead || false
        }

        // ❌ REMOVIDO: Não incrementar aqui, pois handleNewMessage já faz isso
        // Incrementar SOMENTE atualiza o lastMessage e move para o topo

        console.log('📊 Atualizando lastMessage de', chat.user.name)

        // Mover para o topo
        this.chats = [chat, ...this.chats.filter(c => c.user.id !== otherUserId)]
      } else {
        // Recarregar lista de chats
        this.loadChats()
      }
    },

    openChatFromNotification (message) {
      const otherUserId = message.senderId === this.currentUserId ? message.recipientId : message.senderId
      const chat = this.chats.find(c => c.user.id === otherUserId)
      if (chat) {
        this.selectChat(chat)
      }
    },

    async loadMoreMessages () {
      if (this.loadingMore || !this.hasMoreMessages || (!this.selectedChat && !this.selectedGroup)) {
        return
      }

      this.loadingMore = true
      this.currentPage++

      try {
        const params = {
          limit: this.messagesPerPage,
          offset: (this.currentPage - 1) * this.messagesPerPage
        }

        // Se for chat privado
        if (this.selectedChat) {
          params.recipientId = this.selectedChat.user.id
        }

        // Se for grupo
        if (this.selectedGroup) {
          params.groupId = this.selectedGroup.id
        }

        const { data } = await listarMensagens(params)

        if (data.messages && data.messages.length > 0) {
          // Adicionar mensagens antigas no início
          this.messages = [...data.messages, ...this.messages]
          this.hasMoreMessages = data.hasMore !== undefined ? data.hasMore : (data.messages.length === this.messagesPerPage)
        } else {
          this.hasMoreMessages = false
        }
      } catch (error) {
        console.error('Erro ao carregar mais mensagens:', error)
        this.currentPage-- // Reverter página em caso de erro
      } finally {
        this.loadingMore = false
      }
    },
    scrollToBottom () {
      if (this.$refs.scrollArea) {
        const scrollTarget = this.$refs.scrollArea.getScrollTarget()
        const duration = 300
        this.$refs.scrollArea.setScrollPosition('vertical', scrollTarget.scrollHeight, duration)
      }
    },

    formatLastMessage (lastMessage) {
      if (!lastMessage) return ''
      const preview = lastMessage.message.substring(0, 30)
      return lastMessage.message.length > 30 ? `${preview}...` : preview
    },

    async selectGroup (group) {
      console.log('📂 Grupo selecionado:', group)

      // Limpar chat privado
      this.selectedChat = null
      this.selectedGroup = group
      this.newMessage = ''
      this.loading = true
      this.showGroupDetailsDialog = false // Fechar modal de detalhes ao selecionar grupo

      // ✅ Emitir evento para MainLayout saber qual grupo está ativo
      this.$emit('chat-interno:contato-selecionado', `group-${group.id}`)

      // Marcar como lidas ANTES de carregar mensagens
      if (group.unreadCount > 0) {
        try {
          const unreadCount = group.unreadCount
          console.log('📖 Marcando como lidas:', unreadCount, 'mensagens do grupo', group.name)
          await marcarComoLida({ groupId: group.id })

          // Forçar reatividade do Vue
          this.$set(group, 'unreadCount', 0)

          // Emitir evento para MainLayout decrementar contador
          this.$root.$emit('chat-interno:mensagens-lidas', unreadCount)
          console.log('✅ Mensagens do grupo marcadas como lidas, badge removido')
        } catch (error) {
          console.error('Erro ao marcar como lida:', error)
        }
      }

      // Resetar paginação
      this.currentPage = 1
      this.hasMoreMessages = true
      this.messages = []

      try {
        // Carregar mensagens do grupo
        const { data } = await listarMensagens({
          groupId: group.id,
          limit: this.messagesPerPage,
          offset: 0
        })

        this.messages = data.messages || []
        this.hasMoreMessages = data.hasMore

        // Atualizar lista de grupos para refletir mudanças
        this.$nextTick(() => {
          this.loadGroups()
        })

        this.loading = false

        await this.$nextTick()
        this.scrollToBottom()
      } catch (error) {
        console.error('Erro ao carregar mensagens do grupo:', error)
        this.loading = false
      }
    },

    handleGroupCreated (group) {
      console.log('✅ Grupo criado:', group)
      this.loadGroups()
      this.currentTab = 'groups'
      this.showCreateGroupDialog = false
    },

    handleMemberAdded ({ groupId, user }) {
      console.log('👤 Membro adicionado:', user)
      const group = this.groups.find(g => g.id === groupId)
      if (group) {
        group.members.push(user)
      }

      // Atualizar selectedGroup se for o grupo ativo
      if (this.selectedGroup && this.selectedGroup.id === groupId) {
        this.selectedGroup.members.push(user)
      }
    },

    handleMemberRemoved ({ groupId, memberId }) {
      console.log('👤 Membro removido:', memberId)
      const group = this.groups.find(g => g.id === groupId)
      if (group) {
        group.members = group.members.filter(m => m.id !== memberId)
      }

      // Atualizar selectedGroup se for o grupo ativo
      if (this.selectedGroup && this.selectedGroup.id === groupId) {
        this.selectedGroup.members = this.selectedGroup.members.filter(m => m.id !== memberId)
      }
    },

    handleLeftGroup (groupId) {
      console.log('👋 Saiu do grupo:', groupId)

      // Remover grupo da lista
      this.groups = this.groups.filter(g => g.id !== groupId)

      // Limpar seleção se for o grupo ativo
      if (this.selectedGroup && this.selectedGroup.id === groupId) {
        this.selectedGroup = null
        this.messages = []
        this.$emit('chat-interno:contato-selecionado', null)
      }

      this.showGroupDetailsDialog = false
    },

    handleGroupUpdated (updatedGroup) {
      console.log('✏️ Grupo atualizado localmente:', updatedGroup)

      // Atualizar na lista de grupos
      const groupIndex = this.groups.findIndex(g => g.id === updatedGroup.id)
      if (groupIndex !== -1) {
        this.$set(this.groups, groupIndex, {
          ...this.groups[groupIndex],
          ...updatedGroup
        })
      }

      // Atualizar se for o grupo selecionado
      if (this.selectedGroup && this.selectedGroup.id === updatedGroup.id) {
        this.selectedGroup = {
          ...this.selectedGroup,
          ...updatedGroup
        }
      }

      // Recarregar grupos para garantir sincronização
      this.loadGroups()
    },

    openGroupDetails () {
      console.log('🔍 Abrindo detalhes do grupo:', this.selectedGroup)
      this.$nextTick(() => {
        this.showGroupDetailsDialog = true
        console.log('📊 showGroupDetailsDialog:', this.showGroupDetailsDialog)
      })
    },

    formatMessageTime (date) {
      return format(new Date(date), 'HH:mm', { locale: ptBR })
    },

    getReadIcon (message) {
      // Chat privado: done_all se lido, done se não
      if (!this.selectedGroup) {
        return message.isRead ? 'done_all' : 'done'
      }

      // Grupo: verificar se todos viram
      if (message.readBy && message.readBy.length > 0) {
        const totalMembers = this.selectedGroup.members.length - 1 // Excluir o próprio remetente
        const readCount = message.readBy.length

        // Todos viram
        if (readCount >= totalMembers) {
          return 'done_all'
        }
        // Alguns viram
        return 'done'
      }

      // Ninguém viu ainda
      return 'done'
    },

    getReadColor (message) {
      // Chat privado: azul se lido, cinza se não
      if (!this.selectedGroup) {
        return message.isRead ? 'blue' : 'grey'
      }

      // Grupo: verificar se todos viram
      if (message.readBy && message.readBy.length > 0) {
        const totalMembers = this.selectedGroup.members.length - 1 // Excluir o próprio remetente
        const readCount = message.readBy.length

        // Todos viram = azul
        if (readCount >= totalMembers) {
          return 'blue'
        }
        // Alguns viram = cinza
        return 'grey'
      }

      // Ninguém viu = cinza
      return 'grey'
    },

    getReadTooltip (message) {
      if (!message.readBy || message.readBy.length === 0) {
        return 'Ninguém visualizou ainda'
      }

      const totalMembers = this.selectedGroup.members.length - 1
      const readCount = message.readBy.length
      const names = message.readBy.map(r => r.userName).join(', ')

      if (readCount >= totalMembers) {
        return `Visto por todos: ${names}`
      }

      return `Visto por ${readCount}/${totalMembers}: ${names}`
    },
    formatLastSeen (lastOnline) {
      if (!lastOnline) return 'Offline'

      const now = new Date()
      const lastSeenDate = new Date(lastOnline)
      const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60))

      if (diffInMinutes < 1) return 'Agora há pouco'
      if (diffInMinutes < 60) return `Visto há ${diffInMinutes} min`

      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `Visto há ${diffInHours}h`

      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays === 1) return 'Visto ontem'
      if (diffInDays < 7) return `Visto há ${diffInDays} dias`

      return format(lastSeenDate, 'dd/MM/yyyy', { locale: ptBR })
    },

    minimize () {
      this.$emit('minimize')
      this.show = false
    },

    close () {
      this.show = false
    },

    openMediaViewer (mediaUrl, mediaType) {
      console.log('Abrindo visualizador de mídia:', { mediaUrl, mediaType })
      this.currentMedia = mediaUrl
      this.currentMediaType = mediaType
      this.showMediaViewer = true
    },

    downloadFile (mediaUrl, mediaName) {
      const link = document.createElement('a')
      link.href = mediaUrl
      link.download = mediaName || 'arquivo'
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },

    handleClose () {
      this.$emit('close')
    }
  },

  mounted () {
    if (this.show) {
      this.loadInitialData()
      this.setupSocket()
    }
  }
}
</script>

<style lang="scss" scoped>
/* Estilos gerais do componente */
.chat-card {
  display: flex;
  flex-direction: column;
}
.chat-sidebar {
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid #e0e0e0;
}
.empty-state {
  height: 100%;
}
.chat-messages-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-x: hidden; /* Previne scroll horizontal na área de mensagens */
}
.chat-header-info, .message-input {
  flex-shrink: 0;
}
.messages-container {
  flex: 1; /* Ocupa todo o espaço vertical disponível */
  overflow-x: hidden; /* Garante que o conteúdo interno não crie scroll */
}
.message-input {
  border-top: 1px solid #e0e0e0;
}

/* --- LAYOUT DE MENSAGENS CORRIGIDO --- */

/* 1. Contêiner da linha da mensagem */
.message-container {
  display: flex;
  width: 100%;
  max-width: 100%; /* Garante que não ultrapassa */
  margin-bottom: 2px;
  overflow-x: hidden; /* Previne scroll horizontal individual */

  &.sent-container {
    justify-content: flex-end;
  }
  &.received-container {
    justify-content: flex-start;
  }
}

/* 2. Agrupador do balão e nome (para limitar a largura) */
.message-container > div {
  max-width: 80%; /* IMPORTANTE: Limita a largura máxima do balão */
  min-width: 0; /* Permite encolher além do conteúdo */
  display: flex;
  flex-direction: column;
}

/* 3. O Balão da Mensagem */
.message-bubble {
  padding: 6px 12px;
  border-radius: 12px;
  position: relative;
  max-width: 100%; /* Garante que não ultrapassa o container */
  min-width: 0; /* Permite encolher */
  overflow: hidden; /* Esconde qualquer overflow */

  /* FORÇA A QUEBRA DE PALAVRAS LONGAS - Múltiplas propriedades para garantir compatibilidade */
  word-wrap: break-word; /* Suporte para navegadores antigos */
  overflow-wrap: break-word; /* Padrão moderno - quebra em qualquer ponto */
  word-break: break-word; /* Força quebra mesmo no meio de palavras */
  hyphens: auto; /* Adiciona hífens quando possível */

  &.sent {
    background-color: #dcf8c6;
    color: #000;
  }

  &.received {
    background-color: #fff;
    border: 1px solid #e0e0e0;
  }
}

/* 4. Conteúdo de texto da mensagem */
.message-content {
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap; /* Mantém espaços e quebra as linhas */
  text-align: left; /* Alinha o texto à esquerda dentro do balão */
  padding-bottom: 15px; /* Deixa espaço para o horário não sobrepor o texto */
  max-width: 100%; /* Garante que não ultrapassa */
  overflow-wrap: break-word; /* Força quebra de palavras longas */
  word-break: break-word; /* Quebra até no meio da palavra se necessário */
}

/* 5. Horário da Mensagem */
.message-time {
  position: absolute;
  bottom: 5px;
  right: 12px; /* Posiciona sempre à direita do balão */
  font-size: 0.7rem;
  color: #666;
  display: flex;
  align-items: center;
}

/* 6. Nome do Remetente em Grupos */
.message-sender-name {
  margin-bottom: 2px;
  padding-left: 4px;
  text-align: left;
}

/* Estilos para Preview de Arquivos - APENAS para preview */
.file-preview-item {
  position: relative;

  .q-card {
    overflow: hidden;
    border-radius: 8px;
  }

  /* Garantir que apenas preview tenha tamanho fixo */
  .preview-image,
  .preview-image img,
  .preview-image .q-img__container {
    width: 200px !important;
    height: 200px !important;
    min-width: 200px !important;
    min-height: 200px !important;
    max-width: 200px !important;
    max-height: 200px !important;
    display: block;
    border-radius: 8px;
  }

  .preview-video {
    width: 200px !important;
    height: 200px !important;
    min-width: 200px !important;
    min-height: 200px !important;
    max-width: 200px !important;
    max-height: 200px !important;
    display: block;
    border-radius: 8px;
  }
}

/* Estilos para imagens no chat - NÃO afetar preview */
.message-media {
  max-width: 100%; /* Garante que mídia não ultrapassa o balão */
  overflow: hidden; /* Previne overflow de mídia */

  /* Garantir que imagens do chat mantenham tamanho responsivo */
  .q-img,
  img,
  video {
    max-width: 100% !important;
    max-height: 300px !important;
    width: 100% !important;
    height: auto !important;
    cursor: pointer;
    transition: opacity 0.2s;
    display: block;

    &:hover {
      opacity: 0.9;
    }
  }
}

.z-top {
  z-index: 9999;
}

/* Estilos para Modal de Visualização de Mídia */
.media-viewer-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.95) !important;
}

.media-viewer-header {
  flex-shrink: 0;
  padding: 8px 16px;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 1;
}

.media-viewer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
  min-height: 0;
  background-color: rgba(0, 0, 0, 0.95);
}

.media-viewer-image {
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 100px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  margin: auto;
}

.media-viewer-video {
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 100px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  margin: auto;
}
</style>
