<template>
  <div
    class="WAL position-relative bg-grey-3"
    :style="style"
  >
    <q-layout
      class="WAL__layout shadow-3"
      container
      view="lHr LpR lFr"
    >
      <!-- view="lHr LpR lFr" -->
      <!-- :behavior="!ticketFocado.id ? 'desktop' : 'default'" -->
      <q-drawer
        v-model="drawerTickets"
        @hide="drawerTickets = false"
        show-if-above
        :overlay="$q.screen.lt.md"
        persistent
        :breakpoint="769"
        bordered
        :width="$q.screen.lt.md ? $q.screen.width : 400"
        content-class="hide-scrollbar full-width"
      >
        <!-- :behavior="$q.screen.lt.sm && (drawerTickets || !ticketFocado.id) ? 'desktop' : 'default'" -->
        <q-toolbar
          class="q-pr-none q-gutter-xs full-width"
          style="height: 64px"
        >
          <q-btn-dropdown
            no-caps
            flat
            class="bg-padrao text-bold btn-rounded"
            ripple
          >
            <template v-slot:label>
              <div
                :style="{ maxWidth: $q.screen.lt.sm ? '120px' : '' }"
                class="ellipsis"
              >
                {{ username }}
              </div>
            </template>
            <q-list style="min-width: 100px">
              <!-- <q-item
                clickable
                v-close-popup
              >
                <q-item-section>
                  <q-toggle
                    color="blue"
                    :value="$q.dark.isActive"
                    label="Modo escuro"
                    @input="$setConfigsUsuario({isDark: !$q.dark.isActive})"
                  />
                </q-item-section>
              </q-item> -->
              <q-item
                clickable
                v-close-popup
                @click="abrirModalUsuario"
              >
                <q-item-section>Perfil</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="efetuarLogout"
              >
                <q-item-section>Sair</q-item-section>
              </q-item>
              <q-separator />

            </q-list>
          </q-btn-dropdown>
          <q-space />
          <q-btn
            flat
            class="bg-padrao btn-rounded"
            icon="mdi-home"
            @click="() => $router.push({ name: 'home-dashboard' })"
          >
            <q-tooltip content-class="bg-padrao text-grey-9 text-bold">
              Retornar ao menu
            </q-tooltip>
          </q-btn>
          <!-- <StatusWhatsapp
            class="q-mr-sm"
            isIconStatusMenu
          /> -->
        </q-toolbar>
        <StatusWhatsapp
          v-if="false"
          class="q-mx-sm full-width"
        />
        <q-toolbar
          v-show="toolbarSearch"
          class="row q-gutter-sm q-py-sm items-center"
        >
          <q-separator class="absolute-top" />
          <q-btn
            :icon="!cFiltroSelecionado ? 'mdi-filter-outline' : 'mdi-filter-plus'"
            flat
            class="bg-padrao btn-rounded "
            :color="cFiltroSelecionado ? 'deep-orange-9' : 'primary'"
          >
            <q-menu
              content-class="shadow-10 no-scroll"
              square
            >
              <div
                class="row q-pa-sm"
                style="min-width: 350px; max-width: 350px"
              >
                <div class="q-ma-sm">
                  <div class="text-h6 q-mb-md">Filtros Avançados</div>
                  <q-toggle
                    v-if="profile === 'admin'"
                    class="q-ml-lg"
                    v-model="pesquisaTickets.showAll"
                    label="(Admin) - Visualizar Todos"
                    :class="{ 'q-mb-lg': pesquisaTickets.showAll }"
                    @input="debounce(BuscarTicketFiltro(), 700)"
                  />
                  <q-toggle
                    v-if="profile === 'manager'"
                    class="q-ml-lg"
                    v-model="pesquisaTickets.showAll"
                    label="(Gerente) - Visualizar Todos os Departamentos"
                    :class="{ 'q-mb-lg': pesquisaTickets.showAll }"
                    @input="debounce(BuscarTicketFiltro(), 700)"
                  >
                    <q-tooltip class="bg-primary">
                      Visualizar todos os tickets dos departamentos que você gerencia, independente do atendente
                    </q-tooltip>
                  </q-toggle>
                  <q-separator
                    class="q-mb-md"
                    v-if="!pesquisaTickets.showAll"
                  />
                  <div v-if="!pesquisaTickets.showAll">
                    <q-select
                      :key="`departamentos-${userQueues.length}-${userQueues.map(q => q.id).join('-')}`"
                      :disable="pesquisaTickets.showAll"
                      square
                      dense
                      outlined
                      hide-bottom-space
                      emit-value
                      map-options
                      multiple
                      options-dense
                      use-chips
                      label="Departamentos"
                      color="primary"
                      v-model="pesquisaTickets.queuesIds"
                      :options="cUserQueues"
                      :input-debounce="700"
                      option-value="id"
                      option-label="queue"
                      @input="debounce(BuscarTicketFiltro(), 700)"
                      input-style="width: 300px; max-width: 300px;"
                    />

                    <q-list
                      dense
                      class="q-my-md"
                    >
                      <q-item
                        tag="label"
                        v-ripple
                      >
                        <q-item-section avatar>
                          <q-checkbox
                            v-model="pesquisaTickets.status"
                            val="pending"
                            color="primary"
                            keep-color
                            @input="debounce(BuscarTicketFiltro(), 700)"
                          />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Em fila</q-item-label>
                        </q-item-section>
                      </q-item>
                      <q-item
                        tag="label"
                        v-ripple
                      >
                        <q-item-section avatar>
                          <q-checkbox
                            v-model="pesquisaTickets.status"
                            val="open"
                            color="negative"
                            keep-color
                            @input="debounce(BuscarTicketFiltro(), 700)"
                          />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Em atendimento</q-item-label>
                        </q-item-section>
                      </q-item>
                      <q-item
                        tag="label"
                        v-ripple
                      >
                        <q-item-section avatar>
                          <q-checkbox
                            v-model="pesquisaTickets.status"
                            val="closed"
                            color="positive"
                            keep-color
                            @input="debounce(BuscarTicketFiltro(), 700)"
                          />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>Encerrados</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                    <q-separator class="q-mb-md" />
                    <q-toggle
                      v-model="pesquisaTickets.withUnreadMessages"
                      label="Somente Tickets com mensagens não lidas"
                      @input="debounce(BuscarTicketFiltro(), 700)"
                    />
                    <q-toggle
                      v-model="pesquisaTickets.isNotAssignedUser"
                      label="Somente Tickets não atribuidos (sem usuário definido)"
                      @input="debounce(BuscarTicketFiltro(), 700)"
                    />
                  </div>
                  <q-separator
                    class="q-my-md"
                    spaced
                    v-if="!pesquisaTickets.showAll"
                  />
                  <q-btn
                    class="float-right q-my-md"
                    color="primary"
                    label="Fechar"
                    push
                    v-close-popup
                  />
                </div>
              </div>
            </q-menu>
            <q-tooltip content-class="bg-padrao text-grey-9 text-bold">
              Filtro Avançado
            </q-tooltip>
          </q-btn>
          <q-btn
            flat
            class="bg-padrao btn-rounded"
            :color="pesquisaTickets.orderBy === 'priority' ? 'deep-orange-9' : 'primary'"
          >
            <q-icon
              :name="pesquisaTickets.orderBy === 'priority' ? 'mdi-sort-clock-descending' : 'mdi-sort-calendar-descending'"
              size="20px"
            />
            <q-menu
              content-class="shadow-10"
              square
            >
              <q-list style="min-width: 200px">
                <q-item-label header>Ordenar por</q-item-label>
                <q-item
                  clickable
                  v-close-popup
                  @click="alterarOrdenacao('recent')"
                  :active="pesquisaTickets.orderBy === 'recent'"
                >
                  <q-item-section avatar>
                    <q-icon name="mdi-sort-calendar-descending" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Mais Recentes</q-item-label>
                    <q-item-label caption>Última mensagem</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  @click="alterarOrdenacao('priority')"
                  :active="pesquisaTickets.orderBy === 'priority'"
                >
                  <q-item-section avatar>
                    <q-icon name="mdi-sort-clock-descending" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Por Prioridade</q-item-label>
                    <q-item-label caption>Maior tempo de espera</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
            <q-tooltip content-class="bg-padrao text-grey-9 text-bold">
              Ordenação: {{ pesquisaTickets.orderBy === 'priority' ? 'Prioridade' : 'Mais Recentes' }}
            </q-tooltip>
          </q-btn>
          <q-input
            v-model="pesquisaTickets.searchParam"
            dense
            outlined
            rounded
            type="search"
            style="max-width: 200px; flex: 1 1 200px;"
            :debounce="700"
            @input="BuscarTicketFiltro()"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn
            flat
            class=" bg-padrao btn-rounded"
            icon="mdi-book-account-outline"
            @click="$q.screen.lt.md ? modalNovoTicket = true : $router.push({ name: 'chat-contatos' })"
          >
            <q-tooltip content-class="bg-padrao text-grey-9 text-bold">
              Contatos
            </q-tooltip>
          </q-btn>
          <q-separator class="absolute-bottom" />
        </q-toolbar>

        <q-scroll-area
          ref="scrollAreaTickets"
          style="height: calc(100% - 180px)"
          @scroll="onScroll"
        >
          <!-- <q-separator /> -->
          <div style="width:400px">
            <div class="tab-container">
              <q-tabs v-model="selectedTab" class="tab-scroll">
                <q-tab name="pending">
                  Em fila
                  <q-badge v-if="ticketsPagination.pending.count > 0" color="red" textColor="white">{{ ticketsPagination.pending.count }}</q-badge>
                </q-tab>
                <q-tab name="open">
                  Atendimento
                  <q-badge v-if="ticketsPagination.open.count > 0" color="red" textColor="white">{{ ticketsPagination.open.count }}</q-badge>
                </q-tab>
                <q-tab name="closed">
                  Encerrados
                  <q-badge v-if="ticketsPagination.closed.count > 0" color="red" textColor="white">{{ ticketsPagination.closed.count }}</q-badge>
                </q-tab>
                <q-tab name="group">
                  Grupos
                  <q-badge v-if="ticketsPagination.group.count > 0" color="red" textColor="white">{{ ticketsPagination.group.count }}</q-badge>
                </q-tab>
              </q-tabs>
            </div>
            <div v-if="selectedTab === 'open'">
              <ItemTicket
                v-for="ticket in openTickets"
                :key="ticket.id"
                :ticket="ticket"
                :filas="filas"
                origemAba="open"
              />
              <div v-if="ticketsPagination.open.loading" class="q-pa-md text-center">
                <q-spinner color="primary" size="2em" />
                <div class="q-mt-sm text-white">Carregando mais tickets...</div>
              </div>
            </div>
            <div v-if="selectedTab === 'pending'">
              <ItemTicket
                v-for="ticket in pendingTickets"
                :key="ticket.id"
                :ticket="ticket"
                :filas="filas"
                origemAba="pending"
                @ticket-atendido="onTicketAtendido"
              />
              <div v-if="ticketsPagination.pending.loading" class="q-pa-md text-center">
                <q-spinner color="primary" size="2em" />
                <div class="q-mt-sm text-white">Carregando mais tickets...</div>
              </div>
            </div>
            <div v-if="selectedTab === 'closed'">
              <ItemTicket
                v-for="ticket in closedTickets"
                :key="ticket.id"
                :ticket="ticket"
                :filas="filas"
                origemAba="closed"
              />
              <div v-if="ticketsPagination.closed.loading" class="q-pa-md text-center">
                <q-spinner color="primary" size="2em" />
                <div class="q-mt-sm text-white">Carregando mais tickets...</div>
              </div>
            </div>
            <div v-if="selectedTab === 'group'">
              <ItemTicket
                v-for="ticket in groupTickets"
                :key="ticket.id"
                :ticket="ticket"
                :filas="filas"
                origemAba="group"
              />
              <div v-if="ticketsPagination.group.loading" class="q-pa-md text-center">
                <q-spinner color="primary" size="2em" />
                <div class="q-mt-sm text-white">Carregando mais tickets...</div>
              </div>
            </div>
          </div>
        </q-scroll-area>
        <!-- <q-separator /> -->
        <div
          class="absolute-bottom row justify-between"
          style="height: 50px"
        >
          <!-- <q-toggle
            size="xl"
            keep-color
            dense
            class="text-bold q-ml-md flex flex-block"
            :icon-color="$q.dark.isActive ? 'black' : 'white'"
            :value="$q.dark.isActive"
            :color="$q.dark.isActive ? 'grey-3' : 'black'"
            checked-icon="mdi-white-balance-sunny"
            unchecked-icon="mdi-weather-sunny"
            @input="$setConfigsUsuario({ isDark: !$q.dark.isActive })"
          >
            <q-tooltip content-class="text-body1">
              {{ $q.dark.isActive ? 'Desativar' : 'Ativar' }} Modo Escuro
            </q-tooltip>
          </q-toggle> -->
          <div class="flex flex-inline q-pt-xs">
            <!-- Conexões WhatsApp -->
            <q-scroll-area
              horizontal
              style="height: 100%; width: 300px;"
            >
              <q-btn
                v-for="item in whatsapps"
                :key="item.id"
                rounded
                flat
                dense
                size="18px"
                class="q-mx-xs q-pa-none"
                :class="{ 'conexao-filtrada': pesquisaTickets.whatsappIdFiltrado === item.id }"
                :style="`opacity: ${item.status === 'CONNECTED' ? 1 : 0.2}`"
                :icon="`img:${item.type}-logo.png`"
                @click="filtrarPorConexao(item.id)"
              >
                <!-- :color="item.status === 'CONNECTED' ? 'positive' : 'negative'"
                :icon-right="item.status === 'CONNECTED' ? 'mdi-check-all' : 'mdi-alert-circle-outline'" -->
                <q-tooltip
                  max-height="300px"
                  content-class="bg-blue-1 text-body1 text-grey-9 hide-scrollbar"
                >
                  <div v-if="pesquisaTickets.whatsappIdFiltrado === item.id" class="text-center q-pb-sm">
                    <q-icon name="mdi-filter" color="primary" size="16px" class="q-mr-xs" />
                    <span class="text-primary text-weight-bold">Filtrando esta conexão</span>
                  </div>
                  <ItemStatusChannel :item="item" />
                </q-tooltip>
              </q-btn>
            </q-scroll-area>

            <!-- Chat Interno -->
            <q-btn
              rounded
              flat
              dense
              size="18px"
              class="q-mx-xs q-pa-none"
              icon="mdi-chat"
              color="primary"
              @click="abrirChatInterno"
            >
              <q-badge v-if="chatInternoUnread > 0" color="red" text-color="white" floating>
                {{ chatInternoUnread }}
              </q-badge>
              <q-tooltip content-class="bg-blue-1 text-body1 text-grey-9">
                <div class="text-center">
                  <q-icon name="mdi-chat" color="primary" size="16px" class="q-mr-xs" />
                  <span class="text-primary text-weight-bold">Chat Interno</span>
                </div>
              </q-tooltip>
            </q-btn>

          </div>
        </div>
      </q-drawer>

      <q-page-container>
        <router-view
          :mensagensRapidas="mensagensRapidas"
          :key="ticketFocado.id"
        ></router-view>
      </q-page-container>

      <!-- Chat Interno -->
      <ChatModal
        v-model="chatInternoAberto"
        @minimize="fecharChatInterno"
        @close="fecharChatInterno"
        @chat-interno:contato-selecionado="handleChatInternoContatoSelecionado"
      />

      <audio ref="audioChatInterno">
        <source :src="chatInternoSound" type="audio/mp3">
      </audio>

      <q-drawer
        v-if="!cRouteContatos && ticketFocado.id"
        v-model="drawerContact"
        show-if-above
        bordered
        side="right"
        content-class="bg-grey-1"
      >
        <q-scroll-area style="height: 100vh">
          <div class="q-pa-sm">
            <!-- <q-card
              class="bg-white btn-rounded"
              style="width: 100%"
              bordered
              flat
            >
              <q-card-section class="text-center">
                <q-avatar style="border: 1px solid #9e9e9ea1 !important; width: 100px; height: 100px">
                  <q-icon
                    name="mdi-account"
                    style="width: 100px; height: 100px"
                    size="6em"
                    color="grey-5"
                    v-if="!ticketFocado.contact.profilePicUrl"
                  />
                  <q-img
                    :src="ticketFocado.contact.profilePicUrl"
                    style="width: 100px; height: 100px"
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
                <div
                  class="text-caption q-mt-md"
                  style="font-size: 14px"
                >
                  {{ ticketFocado.contact.name || '' }}
                </div>
                <div
                  class="text-caption q-mt-sm"
                  style="font-size: 14px"
                  id="number"
                  @click="copyContent(ticketFocado.contact.number || '')"
                >
                  {{ ticketFocado.contact.number || '' }}
                </div>
                <div
                  class="text-caption q-mt-md"
                  style="font-size: 14px"
                  id="email"
                  @click="copyContent(ticketFocado.contact.email || '')"
                >
                  {{ ticketFocado.contact.email || '' }}
                </div>
                <q-btn
                  color="primary"
                  class="q-mt-sm bg-padrao btn-rounded"
                  flat
                  icon="edit"
                  label="Editar Contato"
                  @click="editContact(ticketFocado.contact.id)"
                />
              </q-card-section>
            </q-card> -->
            <!-- Victor: Retirei o modal logs do right side, agora está no topo -->
            <!-- <q-card
              class="bg-white btn-rounded q-mt-sm"
              style="width: 100%"
              bordered
              flat
            >
              <q-card-section class="text-bold q-pa-sm ">
                <q-btn
                  flat
                  class="bg-padrao btn-rounded"
                  :color="!$q.dark.isActive ? 'grey-9' : 'white'"
                  label="Logs"
                  icon="mdi-timeline-text-outline"
                  @click="abrirModalLogs"
                />
              </q-card-section>
            </q-card> -->
            <!-- Retirei o botao de editar etiquetas pois vai para o topo
            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid()"
            >
              <div class="q-pa-md text-center">
                <q-btn @click="openTagModal" label="Editar Etiquetas" />
              </div>
            </q-card> -->
            <!-- Retirei o modal de editar etiquetas pois vai para o topo
            <q-dialog v-model="tagModalVisible">
              <q-card>
                <q-card-section>
                  <h2 class="text-h6">Selecionar Etiquetas</h2>
                </q-card-section>
                <q-card-section>
                  <q-select
                  square
                  borderless
                  :value="ticketFocado.contact.tags"
                  multiple
                  :options="etiquetas"
                  use-chips
                  option-value="id"
                  option-label="tag"
                  emit-value
                  map-options
                  dropdown-icon="add"
                  @input="tagSelecionada"
                >
                  <template v-slot:option="{ itemProps, itemEvents, opt, selected, toggleOption }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label v-html="opt.tag"></q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          :value="selected"
                          @input="toggleOption(opt)"
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                  <template v-slot:selected-item="{ opt }">
                    <q-chip
                      dense
                      square
                      color="white"
                      text-color="primary"
                      class="q-ma-xs row col-12 text-body1"
                    >
                      <q-icon
                        :style="`color: ${opt.color}`"
                        name="mdi-pound-box-outline"
                        size="28px"
                        class="q-mr-sm"
                      />
                      {{ opt.tag }}
                    </q-chip>
                  </template>
                  <template v-slot:no-option="{ itemProps, itemEvents }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label class="text-negative text-bold">
                          Ops... Sem etiquetas criadas!
                        </q-item-label>
                        <q-item-label caption>
                          Cadastre novas etiquetas na administração de sistemas.
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>

                </q-select>
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn label="Cancelar" @click="closeTagModal" />
                  <q-btn label="Salvar" color="primary" @click="saveTags" />
                </q-card-actions>
              </q-card>
            </q-dialog>
            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid()"
            >
              <q-card-section class="text-bold q-pb-none">
                Etiquetas
                <q-separator />
              </q-card-section>
              <q-card-section class="q-pa-none">
                <q-select
                  square
                  borderless
                  :value="ticketFocado.contact.tags"
                  multiple
                  :options="etiquetas"
                  use-chips
                  option-value="id"
                  option-label="tag"
                  emit-value
                  map-options
                  dropdown-icon="add"
                  @input="tagSelecionada"
                >
                  <template v-slot:option="{ itemProps, itemEvents, opt, selected, toggleOption }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label v-html="opt.tag"></q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          :value="selected"
                          @input="toggleOption(opt)"
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                  <template v-slot:selected-item="{ opt }">
                    <q-chip
                      dense
                      square
                      color="white"
                      text-color="primary"
                      class="q-ma-xs row col-12 text-body1"
                    >
                      <q-icon
                        :style="`color: ${opt.color}`"
                        name="mdi-pound-box-outline"
                        size="28px"
                        class="q-mr-sm"
                      />
                      {{ opt.tag }}
                    </q-chip>
                  </template>
                  <template v-slot:no-option="{ itemProps, itemEvents }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label class="text-negative text-bold">
                          Ops... Sem etiquetas criadas!
                        </q-item-label>
                        <q-item-label caption>
                          Cadastre novas etiquetas na administração de sistemas.
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>

                </q-select>
              </q-card-section>
            </q-card> -->
            <!-- Retirei o botao de editar responsaveis pois esta redundante com o select de responsaveis
            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid()"
            >
              <div class="q-pa-md text-center">
                <q-btn @click="openWalletModal" label="Editar Carteiras" />
              </div>
            </q-card>
            <q-dialog v-model="walletModalVisible">
            <q-card>
              <q-card-section>
                <h2 class="text-h6">Selecionar Carteiras</h2>
              </q-card-section>
              <q-card-section>
                <q-select
                  square
                  borderless
                  :value="ticketFocado.contact.wallets"
                  multiple
                  :max-values="1"
                  :options="usuarios"
                  use-chips
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  dropdown-icon="add"
                  @input="carteiraDefinida"
                >
                  <template v-slot:option="{ itemProps, itemEvents, opt, selected, toggleOption }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label v-html="opt.name"></q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          :value="selected"
                          @input="toggleOption(opt)"
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                  <template v-slot:selected-item="{ opt }">
                    <q-chip
                      dense
                      square
                      color="white"
                      text-color="primary"
                      class="q-ma-xs row col-12 text-body1"
                    >
                      {{ opt.name }}
                    </q-chip>
                  </template>
                  <template v-slot:no-option="{ itemProps, itemEvents }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label class="text-negative text-bold">
                          Ops... Sem carteiras disponíveis!!
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>

                </q-select>
              </q-card-section>
              <q-card-actions align="right">
                <q-btn label="Cancelar" @click="closeWalletModal" />
                <q-btn label="Salvar" color="primary" @click="saveWallets" />
              </q-card-actions>
            </q-card>
          </q-dialog> -->
            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid()"
            >
              <q-card-section class="text-bold q-pb-none">
                Responsáveis
                <q-separator />
              </q-card-section>
              <!-- Victor: Ajustei o padding e o hint e tirei o max-values -->
              <q-card-section class="q-px-md q-pt-sm">
                <q-select
                  square
                  borderless
                  class="q-mb-sm"
                  :value="ticketFocado.contact.wallets"
                  multiple

                  :options="usuariosAtivos"
                  use-chips
                  option-value="id"
                  option-label="name"
                  emit-value
                  map-options
                  dropdown-icon="add"
                  hint="Defina os usuários responsáveis por este contato"
                  @input="carteiraDefinida"
                >
                  <template v-slot:option="{ itemProps, itemEvents, opt, selected, toggleOption }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label v-html="opt.name"></q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-checkbox
                          :value="selected"
                          @input="toggleOption(opt)"
                        />
                      </q-item-section>
                    </q-item>
                  </template>
                  <template v-slot:selected-item="{ opt }" class="q-pa-xl">
                    <q-chip
                      dense
                      square
                      color="primary"
                      text-color="white"
                      class="q-ma-xs"
                    >
                      {{ opt.name }}
                    </q-chip>
                  </template>
                  <template v-slot:no-option="{ itemProps, itemEvents }">
                    <q-item
                      v-bind="itemProps"
                      v-on="itemEvents"
                    >
                      <q-item-section>
                        <q-item-label class="text-negative text-bold">
                          Ops... Sem responsáveis disponíveis!!
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>

                </q-select>
              </q-card-section>
            </q-card>

            <!-- Resumo com IA -->
            <AISummary
              v-if="ticketFocado && ticketFocado.id"
              :ticket-id="ticketFocado.id"
              class="q-mt-sm"
            />

            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid()"
            >
              <q-card-section class="text-bold q-pb-none">
                Mensagens Agendadas Pen.
                <q-separator />
              </q-card-section>
              <q-card-section class="q-pa-none">
                <div class="scheduled-messages-container">
                  <template v-if="cScheduledMessagesPending && cScheduledMessagesPending.length > 0">
                    <q-list>
                      <q-item
                        v-for="(message, idx) in cScheduledMessagesPending"
                        :key="idx"
                        clickable
                      >
                        <q-item-section>
                          <q-item-label caption>
                            <b>Agendado para:</b> {{ $formatarData(message.scheduleDate, 'dd/MM/yyyy HH:mm') }}
                            <q-btn
                              flat
                              round
                              dense
                              icon="mdi-trash-can-outline"
                              class="absolute-top-right q-mr-sm"
                              size="sm"
                              @click="deletarMensagem(message)"
                            />
                          </q-item-label>
                          <q-item-label
                            caption
                            lines="2"
                          > <b>Msg:</b> {{ message.mediaName || message.body }}
                          </q-item-label>
                        </q-item-section>
                        <q-tooltip :delay="500">
                          <MensagemChat :mensagens="[message]" />
                        </q-tooltip>
                      </q-item>
                    </q-list>
                  </template>
                  <template v-else>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>
                          Nenhuma mensagem agendada pendente.
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </div>
              </q-card-section>
            </q-card>
            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid() + 'sent'"
            >
              <q-card-section class="text-bold q-pb-none">
                Mensagens Agendadas Env.
                <q-separator />
              </q-card-section>
              <q-card-section class="q-pa-none">
                <div class="scheduled-messages-container">
                  <template v-if="cScheduledMessagesSent && cScheduledMessagesSent.length > 0">
                    <q-list>
                      <q-item
                        v-for="(message, idx) in cScheduledMessagesSent"
                        :key="idx"
                        clickable
                      >
                        <q-item-section>
                          <q-item-label caption>
                            <b>Enviado em:</b> {{ $formatarData(message.scheduleDate, 'dd/MM/yyyy HH:mm') }}
                            <q-icon
                              name="mdi-circle"
                              :color="message.status === 'sended' ? 'positive' : 'warning'"
                              size="12px"
                              class="absolute-top-right q-mr-sm"
                            />
                          </q-item-label>
                          <q-item-label
                            caption
                            lines="2"
                          > <b>Msg:</b> {{ message.mediaName || message.body }}
                          </q-item-label>
                        </q-item-section>
                        <q-tooltip :delay="500">
                          <MensagemChat :mensagens="[message]" />
                        </q-tooltip>
                      </q-item>
                    </q-list>
                  </template>
                  <template v-else>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>
                          Nenhuma mensagem agendada enviada.
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </div>
                <template v-if="cScheduledMessagesSent && cScheduledMessagesSent.length > 0">
                  <q-separator class="q-mt-sm" />
                  <div class="q-pa-sm">
                    <div class="row items-center q-gutter-sm">
                      <q-icon name="mdi-circle" color="positive" size="12px" />
                      <span class="text-caption">Enviado</span>
                      <q-icon name="mdi-circle" color="warning" size="12px" class="q-ml-md" />
                      <span class="text-caption">Aguardando Recebimento</span>
                    </div>
                  </div>
                </template>
              </q-card-section>
            </q-card>
            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid() + 'transfer'"
            >
              <q-card-section class="text-bold q-pb-none">
                Mensagens de Transferência
                <q-separator />
              </q-card-section>
              <q-card-section class="q-pa-none">
                <div class="scheduled-messages-container">
                  <template v-if="cMensagensTransferencia && cMensagensTransferencia.length > 0">
                    <q-list>
                      <q-item
                        v-for="(mensagem, idx) in cMensagensTransferencia"
                        :key="idx"
                        clickable
                      >
                        <q-item-section>
                          <q-item-label caption>
                            <b>Transferido em:</b> {{ $formatarData(mensagem.createdAt, 'dd/MM/yyyy HH:mm') }}
                          </q-item-label>
                          <q-item-label
                            caption
                            lines="3"
                            class="q-mt-xs"
                          >
                            <b>Contexto:</b> {{ mensagem.mensagemTransferencia }}
                          </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon
                            name="mdi-transfer"
                            color="primary"
                            size="20px"
                          />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </template>
                  <template v-else>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>
                          Nenhuma mensagem de transferência encontrada.
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </div>
              </q-card-section>
            </q-card>

            <q-card
              class="bg-white q-mt-sm btn-rounded"
              style="width: 100%"
              bordered
              flat
              :key="ticketFocado.id + $uuid() + 'closed'"
              v-if="ticketFocado.status === 'closed'"
            >
              <q-card-section class="text-bold q-pb-none">
                Motivos de Encerramento
                <q-separator />
              </q-card-section>
              <q-card-section class="q-pa-none">
                <div class="scheduled-messages-container">
                  <template v-if="ticketFocado.endConversation">
                    <q-list>
                      <q-item clickable>
                        <q-item-section>
                          <q-item-label caption>
                            <b>Encerrado em:</b> {{ formatClosedAt }}
                          </q-item-label>
                          <q-item-label
                            caption
                            lines="2"
                            class="q-mt-xs"
                          >
                            <b>Motivo:</b> {{ ticketFocado.endConversation.message }}
                          </q-item-label>

                          <!-- Observação adicional do encerramento -->
                          <div v-if="ticketFocado.endConversationObservation" class="q-mt-sm">
                            <q-item-label
                              caption
                              lines="3"
                              class="q-mt-xs"
                            >
                              <b>Observação:</b> {{ ticketFocado.endConversationObservation }}
                            </q-item-label>
                          </div>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon
                            name="mdi-close-circle"
                            color="negative"
                            size="20px"
                          />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </template>
                  <template v-else>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>
                          Nenhum motivo de encerramento encontrado.
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </q-scroll-area>
      </q-drawer>

      <ModalNovoTicket :modalNovoTicket.sync="modalNovoTicket" />

      <ModalUsuario
        :isProfile="true"
        :modalUsuario.sync="modalUsuario"
        :usuarioEdicao.sync="usuario"
      />

      <q-dialog
        v-model="exibirModalLogs"
        no-backdrop-dismiss
        full-height
        position="right"
        @hide="logsTicket = []"
      >
        <q-card style="width: 500px; max-width: 90vw;">
          <q-card-section class="bg-primary text-white q-pa-md">
            <div class="row items-center">
              <div class="text-h6 text-bold">
                <q-icon name="mdi-timeline-text-outline" size="24px" class="q-mr-sm" />
                Logs do Ticket #{{ ticketFocado.id }}
              </div>
              <q-space />
              <q-btn
                icon="close"
                color="white"
                flat
                round
                dense
                v-close-popup
              />
            </div>
            <div class="text-caption q-mt-xs opacity-80">
              Histórico completo de ações realizadas neste ticket
            </div>
          </q-card-section>
          <q-card-section class="q-pa-none">
            <q-scroll-area
              style="height: calc(100vh - 200px);"
              class="full-width"
            >
              <q-timeline
                color="primary"
                style="width: 100%"
                class="q-pa-md"
              >
                <q-timeline-entry
                  v-for="(log, idx) in logsTicket"
                  :key="log && log.id || idx"
                  :subtitle="$formatarData(log.createdAt, 'dd/MM/yyyy HH:mm:ss')"
                  :color="messagesLog[log.type] && messagesLog[log.type].color || 'grey'"
                  :icon="messagesLog[log.type] && messagesLog[log.type].icon || 'mdi-information'"
                  side="right"
                >
                  <template v-slot:title>
                    <div class="log-entry-card">
                      <!-- Usuário que executou a ação -->
                      <div class="text-bold text-body2 q-mb-xs">
                        <q-icon name="mdi-account" size="16px" class="q-mr-xs" />
                        {{ log.user && log.user.name || 'Sistema/Bot' }}
                      </div>

                      <!-- Ação principal -->
                      <div class="text-body2 q-mb-xs">
                        {{ messagesLog[log.type] && messagesLog[log.type].message || log.type }}
                      </div>

                      <!-- Descrição detalhada (se houver) -->
                      <div v-if="log.description" class="text-caption text-grey-7 q-mb-xs q-pl-sm" style="border-left: 2px solid #e0e0e0;">
                        {{ log.description }}
                      </div>

                      <!-- Informações de criação para mensagens agendadas -->
                      <div v-if="log.type === 'messageScheduled' && log.metadata" class="text-caption q-mt-xs q-pl-sm" style="border-left: 2px solid #ff9800;">
                        <div v-if="log.metadata.createdBy" class="q-mb-xs">
                          <q-icon name="mdi-account-plus" size="14px" class="q-mr-xs" />
                          <span class="text-weight-medium">Criado por:</span> {{ log.metadata.createdBy }}
                        </div>
                        <div v-if="log.metadata.createdAt">
                          <q-icon name="mdi-calendar-clock" size="14px" class="q-mr-xs" />
                          <span class="text-weight-medium">Criado em:</span> {{ $formatarData(log.metadata.createdAt, 'dd/MM/yyyy HH:mm:ss') }}
                        </div>
                      </div>

                      <!-- Usuário de destino (em transferências/atribuições) -->
                      <div v-if="log.toUser" class="text-caption q-mt-xs">
                        <q-icon name="mdi-arrow-right" size="14px" class="q-mr-xs" />
                        <span class="text-weight-medium">Para:</span> {{ log.toUser.name }}
                      </div>

                      <!-- Filas (se houver mudança) -->
                      <div v-if="log.queue || log.fromQueue" class="text-caption q-mt-xs">
                        <q-icon name="mdi-format-list-bulleted" size="14px" class="q-mr-xs" />
                        <span v-if="log.fromQueue && log.queue">
                          <span class="text-weight-medium">Fila:</span> {{ log.fromQueue.queue }} → {{ log.queue.queue }}
                        </span>
                        <span v-else-if="log.queue">
                          <span class="text-weight-medium">Fila:</span> {{ log.queue.queue }}
                        </span>
                      </div>

                      <!-- Metadados detalhados (expansível) -->
                      <div v-if="log.metadata && Object.keys(log.metadata).length > 0" class="q-mt-sm">
                        <q-expansion-item
                          dense
                          dense-toggle
                          expand-separator
                          icon="mdi-information-outline"
                          label="Detalhes"
                          header-class="text-caption bg-grey-2"
                          class="rounded-borders"
                        >
                          <q-card flat bordered class="q-pa-sm bg-grey-1">
                            <div v-for="(value, key) in log.metadata" :key="key" class="text-caption q-mb-xs">
                              <span class="text-weight-bold">{{ formatMetadataKey(key) }}:</span>
                              <span v-if="value && typeof value === 'object'">{{ JSON.stringify(value) }}</span>
                              <span v-else>{{ formatMetadataValue(value) }}</span>
                            </div>
                          </q-card>
                        </q-expansion-item>
                      </div>
                    </div>
                  </template>
                </q-timeline-entry>

                <!-- Mensagem quando não há logs -->
                <div v-if="!logsTicket || logsTicket.length === 0" class="text-center q-pa-xl">
                  <q-icon name="mdi-information-outline" size="64px" color="grey-5" />
                  <div class="text-h6 text-grey-6 q-mt-md">Nenhum log encontrado</div>
                  <div class="text-caption text-grey-5">As ações realizadas neste ticket aparecerão aqui</div>
                </div>
              </q-timeline>
            </q-scroll-area>
          </q-card-section>
        </q-card>
      </q-dialog>

    </q-layout>
    <audio ref="audioNotificationPlay">
      <source
        :src="alertSound"
        type="audio/mp3"
      >
    </audio>

    <!-- Modal de Atualização -->
    <ModalAtualizacao
      :showModal="updateModalVisible"
      :release="latestRelease"
      @close="fecharModalAtualizacao"
    />
  </div>
</template>

<script>
import ItemStatusChannel from 'src/pages/sessaoWhatsapp/ItemStatusChannel.vue'
import ItemTicket from './ItemTicket'
import { ConsultarLogsTicket, ConsultarTickets, DeletarMensagem } from 'src/service/tickets'
import { mapGetters } from 'vuex'
import mixinSockets from './mixinSockets'
import socketInitial from 'src/layouts/socketInitial'
import ModalNovoTicket from './ModalNovoTicket'
import { ListarFilas } from 'src/service/filas'
import StatusWhatsapp from 'src/components/StatusWhatsapp'
import alertSound from 'src/assets/sound.mp3'
const chatInternoSound = '/sound-notific.mp3'
import { ListarWhatsapps } from 'src/service/sessoesWhatsapp'
import { debounce } from 'quasar'
import { format } from 'date-fns'
import ModalUsuario from 'src/pages/usuarios/ModalUsuario'
import { ListarConfiguracoes } from 'src/service/configuracoes'
import { ListarMensagensRapidas } from 'src/service/mensagensRapidas'
import { ListarEtiquetas } from 'src/service/etiquetas'
import { EditarCarteiraContato } from 'src/service/contatos'
import { RealizarLogout } from 'src/service/login'
import AISummary from 'src/components/AISummary.vue'
import ChatModal from 'src/components/ChatInterno/ChatModal'
import { ListarUsuarios, DadosUsuario } from 'src/service/user'
import MensagemChat from './MensagemChat.vue'
import { messagesLog } from '../../utils/constants'
import versionCheckMixin from 'src/mixins/versionCheck'
import ModalAtualizacao from 'src/components/ModalAtualizacao.vue'
import { getSocket } from 'src/utils/socket'
export default {
  name: 'IndexAtendimento',
  mixins: [mixinSockets, socketInitial, versionCheckMixin],
  components: {
    ItemTicket,
    ModalNovoTicket,
    StatusWhatsapp,
    ModalUsuario,
    MensagemChat,
    ItemStatusChannel,
    AISummary,
    ChatModal,
    ModalAtualizacao
  },
  data () {
    return {
      messagesLog,
      tagModalVisible: false,
      selectedTags: [],
      walletModalVisible: false,
      selectedWallets: [],
      selectedTab: 'pending',
      configuracoes: [],
      debounce,
      alertSound,
      chatInternoSound,
      chatInternoUnread: 0,
      usuario: JSON.parse(localStorage.getItem('usuario') || '{}'),
      usuarios: [],
      username: localStorage.getItem('username'),
      modalUsuario: false,
      toolbarSearch: true,
      drawerTickets: true,
      drawerContact: true,
      profile: localStorage.getItem('profile'),
      modalNovoTicket: false,
      filterBusca: '',
      showDialog: false,
      atendimentos: [],
      // Estrutura de paginação por status
      ticketsPagination: {
        open: { tickets: [], pageNumber: 1, hasMore: false, loading: false, count: 0 },
        pending: { tickets: [], pageNumber: 1, hasMore: false, loading: false, count: 0 },
        closed: { tickets: [], pageNumber: 1, hasMore: false, loading: false, count: 0 },
        group: { tickets: [], pageNumber: 1, hasMore: false, loading: false, count: 0 }
      },
      pesquisaTickets: {
        searchParam: '',
        showAll: false,
        queuesIds: [],
        status: ['open', 'pending', 'closed'],
        withUnreadMessages: false,
        isNotAssignedUser: false,
        includeNotQueueDefined: true,
        whatsappIdFiltrado: null,
        orderBy: 'recent'
      },
      filas: [],
      etiquetas: [],
      mensagensRapidas: [],
      modalEtiquestas: false,
      exibirModalLogs: false,
      logsTicket: [],
      chatInternoAberto: false,
      chatInternoContatoAtivo: null,
      chatInternoSocketListeners: []
    }
  },
  watch: {
    // Forçar atualização do filtro quando as queues do usuário mudarem
    userQueues: {
      handler (newQueues, oldQueues) {
        console.log('🔄 Queues do usuário mudaram:', newQueues)
        // Forçar re-render do componente de filtro
        this.$forceUpdate()
      },
      deep: true
    },
    selectedTab: {
      async handler (newTab, oldTab) {
        if (!newTab || newTab === oldTab) return

        console.log(`🔄 Mudando de tab: ${oldTab} -> ${newTab}`)

        const pagination = this.ticketsPagination[newTab]

        console.log('🔍 [FRONTEND] Estado da paginação da tab:', {
          tab: newTab,
          ticketsLength: pagination.tickets.length,
          loading: pagination.loading,
          count: pagination.count
        })

        // Carregar tickets se ainda não foram carregados
        if (pagination.tickets.length === 0 && !pagination.loading) {
          console.log(`🔄 [FRONTEND] Carregando tickets para tab: ${newTab}`)
          await this.consultarTicketsPorStatus(newTab)
        } else {
          console.log(`🔄 [FRONTEND] Tickets já carregados ou está carregando para tab: ${newTab}`)
        }
      },
      immediate: false
    }
    // pesquisaTickets: {
    //   handler (v) {
    //     this.$store.commit('SET_FILTER_PARAMS', extend(true, {}, this.pesquisaTickets))
    //     localStorage.setItem('filtrosAtendimento', JSON.stringify(this.pesquisaTickets))
    //   },
    //   deep: true
    //   // immediate: true
    // }
  },
  computed: {
    ...mapGetters([
      'ticketFocado',
      'whatsapps',
      'userQueues'
    ]),
    cUserQueues () {
      return this.userQueues
    },
    style () {
      return {
        height: this.$q.screen.height + 'px'
      }
    },
    cToolbarSearchHeigthAjust () {
      return this.toolbarSearch ? 58 : 0
    },
    cHeigVerticalTabs () {
      return `${50 + this.cToolbarSearchHeigthAjust}px`
    },
    cRouteContatos () {
      return this.$route.name === 'chat-contatos'
    },
    cFiltroSelecionado () {
      const { queuesIds, showAll, withUnreadMessages, isNotAssignedUser } = this.pesquisaTickets
      return !!(queuesIds?.length || showAll || withUnreadMessages || isNotAssignedUser)
    },
    openTickets () {
      if (process.env.NODE_ENV === 'development') {
        console.log('openTickets:', this.ticketsPagination.open.tickets)
      }
      return this.ticketsPagination.open.tickets.filter(t => !t.isGroup)
    },
    pendingTickets () {
      return this.ticketsPagination.pending.tickets.filter(t => !t.isGroup)
    },
    closedTickets () {
      return this.ticketsPagination.closed.tickets.filter(t => !t.isGroup)
    },
    groupTickets () {
      console.log('🔍 [FRONTEND] Computed groupTickets chamado:', {
        tickets: this.ticketsPagination.group.tickets,
        length: this.ticketsPagination.group.tickets.length
      })
      return this.ticketsPagination.group.tickets
    },
    cScheduledMessagesPending () {
      if (!this.ticketFocado.scheduledMessages) return []
      return this.ticketFocado.scheduledMessages.filter(message => message.status === 'pending')
    },
    cScheduledMessagesSent () {
      if (!this.ticketFocado.scheduledMessages) return []
      return this.ticketFocado.scheduledMessages.filter(message =>
        message.status === 'sended' || message.status === 'received'
      )
    },
    cMensagensTransferencia () {
      if (!this.ticketFocado.mensagemTransferencia) return []
      return this.ticketFocado.mensagemTransferencia
    },
    formatClosedAt () {
      if (!this.ticketFocado.closedAt) return 'Data não disponível'

      try {
        // Converter timestamp para data
        const timestamp = parseInt(this.ticketFocado.closedAt)
        const date = new Date(timestamp)

        // Verificar se a data é válida
        if (isNaN(date.getTime())) {
          return 'Data inválida'
        }

        return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      } catch (error) {
        console.error('Erro ao formatar closedAt:', error)
        return 'Erro ao formatar data'
      }
    },
    cWhatsappFiltrado () {
      if (!this.pesquisaTickets.whatsappIdFiltrado) return null
      return this.whatsapps.find(w => w.id === this.pesquisaTickets.whatsappIdFiltrado)
    },
    cTemFiltroConexao () {
      return !!this.pesquisaTickets.whatsappIdFiltrado
    },
    usuariosAtivos () {
      if (!this.usuarios || !Array.isArray(this.usuarios)) return []
      return this.usuarios.filter(user => {
        // Filtrar usuários inativos
        if (user.isInactive === true) {
          // Verificar se a data de inatividade ainda é válida (se houver)
          if (user.inactiveUntil) {
            const inactiveDate = new Date(user.inactiveUntil)
            const now = new Date()
            if (inactiveDate > now) {
              return false // Usuário ainda está inativo
            }
          } else {
            return false // Inativo por tempo indeterminado
          }
        }
        return true // Usuário ativo
      })
    }
  },
  methods: {
    // LÓGICA ORIGINAL DE ETIQUETAS - COMENTADA PARA PRESERVAR
    // openTagModal () {
    //   this.tagModalVisible = true
    //   this.selectedTags = [...this.ticketFocado.contact.tags] // Preencha com as etiquetas selecionadas atuais
    // },
    // closeTagModal () {
    //   this.tagModalVisible = false
    // },
    // async saveTags () {
    //   try {
    //     await this.tagSelecionada(this.selectedTags)
    //     this.closeTagModal()
    //   } catch (error) {
    //     this.$notificarErro('Erro ao salvar etiquetas', error)
    //   }
    // },
    openWalletModal () {
      this.walletModalVisible = true
      this.selectedWallets = [...this.ticketFocado.contact.wallets] // Preencha com as carteiras selecionadas atuais
    },
    closeWalletModal () {
      this.walletModalVisible = false
    },
    async saveWallets () {
      try {
        await this.carteiraDefinida(this.selectedWallets)
        this.closeWalletModal()
      } catch (error) {
        this.$notificarErro('Erro ao salvar responsáveis', error)
      }
    },
    handlerNotifications (data) {
      const options = {
        body: `${data.body} - ${format(new Date(), 'HH:mm')}`,
        icon: data.ticket.contact.profilePicUrl,
        tag: data.ticket.id,
        renotify: true
      }

      const notification = new Notification(
        `Mensagem de ${data.ticket.contact.name}`,
        options
      )

      setTimeout(() => {
        notification.close()
      }, 10000)

      notification.onclick = e => {
        e.preventDefault()
        window.focus()
        const payload = this.buildTicketAccessPayload(
          data.ticket,
          'notification_click',
          { origin: 'notification' }
        )
        this.$store.dispatch('AbrirChatMensagens', payload)
        this.$router.push({ name: 'atendimento' })
        // history.push(`/tickets/${ticket.id}`);
      }

      this.$nextTick(() => {
        // utilizar refs do layout
        this.$refs.audioNotificationPlay.play()
      })
    },
    async listarConfiguracoes () {
      const { data } = await ListarConfiguracoes()
      localStorage.setItem('configuracoes', JSON.stringify(data))
    },
    async carregarDadosUsuario () {
      try {
        const userId = this.usuario.userId || this.usuario.id
        console.log('🔄 Carregando dados do usuário:', userId)

        const { data } = await DadosUsuario(userId)
        console.log('📋 Dados recebidos:', data)

        // Atualizar Vuex com os dados mais recentes
        this.$store.commit('SET_USER_QUEUES', data.queues || [])

        // Atualizar localStorage também
        localStorage.setItem('queues', JSON.stringify(data.queues || []))
        localStorage.setItem('managerQueues', JSON.stringify(data.managerQueues || []))

        console.log('✅ Queues atualizadas no Vuex:', data.queues)
      } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error)
      }
    },
    onUserQueuesUpdated (queues) {
      console.log('🎯 Queues atualizadas via evento:', queues)
      // Forçar atualização do componente
      this.$forceUpdate()
    },
    onScroll (info) {
      if (info.verticalPercentage <= 0.85) return
      this.onLoadMoreCurrentTab()
    },
    async onLoadMoreCurrentTab () {
      const status = this.selectedTab
      const pagination = this.ticketsPagination[status]

      if (!pagination.hasMore || pagination.loading) return

      pagination.pageNumber++
      await this.consultarTicketsPorStatus(status, true)
    },
    async consultarTicketsPorStatus (status, isLoadMore = false) {
      // Usar a paginação específica para cada status
      const pagination = this.ticketsPagination[status]

      if (pagination.loading) return

      pagination.loading = true

      const params = {
        ...this.pesquisaTickets,
        whatsappId: this.pesquisaTickets.whatsappIdFiltrado,
        pageNumber: pagination.pageNumber.toString()
      }

      // Remover whatsappIdFiltrado dos parâmetros enviados ao backend
      delete params.whatsappIdFiltrado

      // 🔍 DEBUG: Log detalhado dos parâmetros enviados
      console.log(`🔍 [FRONTEND] Consultando tickets por status: ${status}`)
      console.log('📋 Parâmetros:', JSON.stringify(params, null, 2))

      try {
        const { data } = await ConsultarTickets(params)

        // 🔍 DEBUG: Log da resposta recebida
        console.log(`📥 [FRONTEND] Resposta recebida para status: ${status}`)
        console.log('📊 Dados completos:', data)
        console.log('📊 Dados recebidos:', {
          ticketsOpen: data.ticketsOpen?.length || 0,
          ticketsPending: data.ticketsPending?.length || 0,
          ticketsClosed: data.ticketsClosed?.length || 0,
          ticketsGroup: data.ticketsGroup?.length || 0,
          countOpen: data.countOpen,
          countPending: data.countPending,
          countClosed: data.countClosed,
          countGroups: data.countGroups,
          hasMoreGroup: data.hasMoreGroup
        })

        // 🔍 DEBUG: Específico para grupos
        if (status === 'group') {
          console.log('🔍 [FRONTEND] GRUPOS - Detalhes:', {
            ticketsGroup: data.ticketsGroup,
            countGroups: data.countGroups,
            hasMoreGroup: data.hasMoreGroup
          })
        }

        // 🔍 DEBUG: Verificar estrutura dos tickets
        if (data.ticketsOpen?.length > 0) {
          console.log('🔍 [FRONTEND] Estrutura do primeiro ticket OPEN:', {
            id: data.ticketsOpen[0].id,
            profilePicUrl: data.ticketsOpen[0].profilePicUrl,
            name: data.ticketsOpen[0].name,
            tags: data.ticketsOpen[0].tags,
            contact: data.ticketsOpen[0].contact
          })
        }

        // Atualizar todos os status de uma vez
        if (isLoadMore) {
          // Adicionar novos tickets aos existentes
          this.ticketsPagination.open.tickets.push(...(data.ticketsOpen || []))
          this.ticketsPagination.pending.tickets.push(...(data.ticketsPending || []))
          this.ticketsPagination.closed.tickets.push(...(data.ticketsClosed || []))
          this.ticketsPagination.group.tickets.push(...(data.ticketsGroup || []))
          console.log('🔍 [FRONTEND] Tickets adicionados (loadMore)')
        } else {
          // Substituir todos os tickets (primeira carga ou filtro)
          this.ticketsPagination.open.tickets = data.ticketsOpen || []
          this.ticketsPagination.pending.tickets = data.ticketsPending || []
          this.ticketsPagination.closed.tickets = data.ticketsClosed || []
          this.ticketsPagination.group.tickets = data.ticketsGroup || []
          console.log('🔍 [FRONTEND] Tickets substituídos (primeira carga)')
        }

        console.log('🔍 [FRONTEND] Estado após atualização:', {
          groupTickets: this.ticketsPagination.group.tickets.length,
          groupCount: data.countGroups || 0
        })

        this.ticketsPagination.open.count = data.countOpen || 0
        this.ticketsPagination.pending.count = data.countPending || 0
        this.ticketsPagination.closed.count = data.countClosed || 0
        this.ticketsPagination.group.count = data.countGroups || 0

        this.ticketsPagination.open.hasMore = data.hasMoreOpen || false
        this.ticketsPagination.pending.hasMore = data.hasMorePending || false
        this.ticketsPagination.closed.hasMore = data.hasMoreClosed || false
        this.ticketsPagination.group.hasMore = data.hasMoreGroup || false

        console.log('🔍 [FRONTEND] ticketsPagination.group final:', {
          tickets: this.ticketsPagination.group.tickets,
          count: this.ticketsPagination.group.count,
          hasMore: this.ticketsPagination.group.hasMore
        })
      } catch (err) {
        console.error(`❌ [FRONTEND] Erro ao consultar tickets para status ${status}:`, err)
        this.$notificarErro('Erro ao carregar tickets', err)
      } finally {
        pagination.loading = false
      }
    },
    async BuscarTicketFiltro () {
      console.log('🔍 [FRONTEND] BuscarTicketFiltro chamado')
      console.log('📋 pesquisaTickets antes do reset:', JSON.stringify(this.pesquisaTickets, null, 2))

      // Resetar todas as paginações
      Object.keys(this.ticketsPagination).forEach(key => {
        this.ticketsPagination[key] = {
          tickets: [],
          pageNumber: 1,
          hasMore: false,
          loading: false,
          count: 0
        }
      })

      localStorage.setItem('filtrosAtendimento', JSON.stringify(this.pesquisaTickets))

      console.log('📋 pesquisaTickets após reset:', JSON.stringify(this.pesquisaTickets, null, 2))

      // Carregar dados da tab atual
      await this.consultarTicketsPorStatus(this.selectedTab)
      this.$setConfigsUsuario({ isDark: this.$q.dark.isActive })
    },
    async listarFilas () {
      const { data } = await ListarFilas()
      this.filas = data
      localStorage.setItem('filasCadastradas', JSON.stringify(data || []))
    },
    async listarWhatsapps () {
      const { data } = await ListarWhatsapps()
      this.$store.commit('LOAD_WHATSAPPS', data)
    },
    async listarEtiquetas () {
      const { data } = await ListarEtiquetas(true)
      this.etiquetas = data
    },
    async abrirModalUsuario () {
      // if (!usuario.id) {
      //   await this.dadosUsuario()
      // }
      // const { data } = await DadosUsuario(userId)
      // this.usuario = data
      this.modalUsuario = true
    },
    async efetuarLogout () {
      console.log('logout - index atendimento')
      try {
        await RealizarLogout(this.usuario)
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        localStorage.removeItem('profile')
        localStorage.removeItem('userId')
        localStorage.removeItem('queues')
        localStorage.removeItem('usuario')
        localStorage.removeItem('filtrosAtendimento')

        this.$router.go({ name: 'login', replace: true })
      } catch (error) {
        this.$notificarErro(
          'Não foi possível realizar logout',
          error
        )
      }
    },
    copyContent (content) {
      if (!content) {
        this.$q.notify({
          type: 'warning',
          message: 'Nenhum conteúdo para copiar'
        })
        return
      }

      navigator.clipboard.writeText(content)
        .then(() => {
          this.$q.notify({
            type: 'positive',
            message: 'Conteúdo copiado com sucesso'
          })
        })
        .catch((error) => {
          console.error('Erro ao copiar o conteúdo: ', error)
          this.$q.notify({
            type: 'negative',
            message: 'Erro ao copiar conteúdo'
          })
        })
    },
    deletarMensagem (mensagem) {
      const data = { ...mensagem }
      this.$q.dialog({
        title: 'Atenção!! Deseja realmente deletar a mensagem? ',
        message: 'Mensagens antigas não serão apagadas no cliente.',
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
        DeletarMensagem(data)
          .then(res => {
            this.loading = false
          })
          .catch(error => {
            this.loading = false
            console.error(error)
            this.$notificarErro('Não foi possível apagar a mensagem', error)
          })
      }).onCancel(() => {
      })
    },
    // LÓGICA ORIGINAL DE ETIQUETAS - COMENTADA PARA PRESERVAR
    // async tagSelecionada (tags) {
    //   const { data } = await EditarEtiquetasContato(this.ticketFocado.contact.id, [...tags])
    //   this.contatoEditado(data)
    // },
    async carteiraDefinida (wallets) {
      const { data } = await EditarCarteiraContato(this.ticketFocado.contact.id, [...wallets])
      this.contatoEditado(data)
    },
    async listarUsuarios () {
      try {
        const { data } = await ListarUsuarios()
        this.usuarios = data.users
      } catch (error) {
        console.error(error)
        this.$notificarErro('Problema ao carregar usuários', error)
      }
    },
    setValueMenu () {
      this.drawerTickets = !this.drawerTickets
    },
    setValueMenuContact () {
      this.drawerContact = !this.drawerContact
    },
    contatoEditado (contato) {
      this.$store.commit('UPDATE_TICKET_FOCADO_CONTACT', contato)
    },
    async abrirModalLogs () {
      console.log('abrirModalLogs', this.ticketFocado)
      const { data } = await ConsultarLogsTicket({ ticketId: this.ticketFocado.id })
      this.logsTicket = data
      this.exibirModalLogs = true
    },
    // Método para formatar chaves dos metadados de forma legível
    formatMetadataKey (key) {
      const translations = {
        oldStatus: 'Status Anterior',
        newStatus: 'Novo Status',
        oldUserId: 'ID Usuário Anterior',
        newUserId: 'ID Novo Usuário',
        oldQueueId: 'ID Fila Anterior',
        newQueueId: 'ID Nova Fila',
        fromUserId: 'De Usuário',
        toUserId: 'Para Usuário',
        scheduleDate: 'Data Agendada',
        hasMedia: 'Com Mídia',
        mediaCount: 'Quantidade de Mídias',
        bodyPreview: 'Prévia da Mensagem',
        sendType: 'Tipo de Envio',
        endConversationId: 'ID Motivo Encerramento',
        endConversationObservation: 'Observação',
        mensagemTransferencia: 'Mensagem de Transferência',
        accessSource: 'Origem do Acesso',
        accessSourceLabel: 'Origem do Acesso (Legível)',
        accessTab: 'Aba de Acesso',
        ticketStatusAtClick: 'Status no Clique',
        currentTicketStatus: 'Status Atual',
        queueIdAtClick: 'Fila no Clique',
        queueNameAtClick: 'Nome da Fila no Clique',
        queueIdCurrent: 'Fila Atual',
        queueNameCurrent: 'Nome da Fila Atual',
        hasAssignedUser: 'Possuía Usuário Atribuído',
        assignedUserId: 'Usuário Atribuído (ID)',
        assignedUserName: 'Usuário Atribuído (Nome)',
        assignedUserDifferentFromVisitor: 'Outro Usuário Já Atribuído',
        assignedUserIdFromQuery: 'Usuário Atribuído Informado',
        assignedUserNameFromQuery: 'Nome do Usuário Informado',
        visitorUserId: 'Usuário que Acessou (ID)',
        visitorUserName: 'Usuário que Acessou (Nome)',
        createdAt: 'Data de Criação',
        createdBy: 'Criado por',
        messageId: 'ID da Mensagem'
      }
      return translations[key] || key
    },
    formatMetadataValue (value) {
      if (value === null || value === undefined || value === '') {
        return 'Não informado'
      }
      if (typeof value === 'boolean') {
        return value ? 'Sim' : 'Não'
      }
      // Formatar datas
      if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
        try {
          const date = value instanceof Date ? value : new Date(value)
          if (!isNaN(date.getTime())) {
            return this.$formatarData(date, 'dd/MM/yyyy HH:mm:ss')
          }
        } catch (error) {
          // Se não conseguir formatar, retorna o valor original
        }
      }
      return value
    },
    buildTicketAccessPayload (ticket, accessSource = 'unknown', extra = {}) {
      if (!ticket) return null
      const assignedFromTicket = ticket.user || ticket.assignedUser || {}
      const queueIdAtClick =
        ticket.queueId !== undefined && ticket.queueId !== null
          ? ticket.queueId
          : extra.queueIdAtClick || extra.queueId || null

      return {
        ...ticket,
        accessSource,
        accessTab: extra.accessTab || accessSource,
        ticketStatusAtClick: ticket.status,
        assignedUserId:
          ticket.userId || assignedFromTicket.id || extra.assignedUserId || null,
        assignedUserName:
          assignedFromTicket.name ||
          ticket.assignedUserName ||
          extra.assignedUserName ||
          null,
        queueIdAtClick,
        ...extra
      }
    },
    async filtrarPorConexao (whatsappId) {
      // Se já está filtrando por esta conexão, remove o filtro
      if (this.pesquisaTickets.whatsappIdFiltrado === whatsappId) {
        this.removerFiltroConexao()
        return
      }

      this.pesquisaTickets.whatsappIdFiltrado = whatsappId
      await this.BuscarTicketFiltro()

      const whatsapp = this.cWhatsappFiltrado
      this.$q.notify({
        type: 'info',
        message: `Filtrando tickets da conexão: ${whatsapp?.name || 'WhatsApp'}`,
        position: 'top',
        timeout: 3000
      })
    },
    async removerFiltroConexao () {
      this.pesquisaTickets.whatsappIdFiltrado = null
      await this.BuscarTicketFiltro()

      this.$q.notify({
        type: 'info',
        message: 'Filtro de conexão removido',
        position: 'top',
        timeout: 3000
      })
    },
    abrirChatInterno () {
      // Abrir modal do chat interno
      console.log('🔔 Abrindo chat interno')
      this.chatInternoAberto = true
      // Zerar contador ao abrir
      this.chatInternoUnread = 0
    },
    fecharChatInterno () {
      this.chatInternoAberto = false
      this.chatInternoContatoAtivo = null
    },
    handleChatInternoContatoSelecionado (contatoId) {
      console.log('📌 Contato selecionado no chat interno:', contatoId)
      this.chatInternoContatoAtivo = contatoId
    },
    async alterarOrdenacao (orderBy) {
      this.pesquisaTickets.orderBy = orderBy
      await this.BuscarTicketFiltro()

      const mensagem = orderBy === 'priority'
        ? 'Ordenando por prioridade (maior tempo de espera)'
        : 'Ordenando por mais recentes'

      this.$q.notify({
        type: 'info',
        message: mensagem,
        position: 'top',
        timeout: 2000
      })
    },
    onTicketAtendido (data) {
      console.log('🔄 [FRONTEND] Evento ticket-atendido recebido:', data)
      console.log('🔄 [FRONTEND] selectedTab atual:', this.selectedTab)

      // Mudar para a aba "Atendimento" quando um ticket pendente for atendido
      if (this.selectedTab === 'pending') {
        console.log('🔄 [FRONTEND] Mudando para aba "Atendimento" após iniciar atendimento')
        this.$nextTick(() => {
          this.selectedTab = 'open'
          console.log('🔄 [FRONTEND] selectedTab alterado para:', this.selectedTab)
        })
      } else {
        console.log('🔄 [FRONTEND] Não mudando aba - selectedTab não é "pending":', this.selectedTab)
      }
    },

    // ✅ Métodos do chat interno
    setupChatInternoSocket (usuario) {
      const userId = Number(localStorage.getItem('userId'))
      const socket = getSocket()

      console.log('📨 Configurando socket de chat interno na página de atendimento')

      // Listener para chat interno
      const internalChatListener = (data) => {
        console.log('📬 Evento de chat interno recebido:', data)

        if (data.type === 'internalChat:message') {
          this.handleInternalChatMessage(data.payload, userId)
        } else if (data.type === 'internalChat:update') {
          this.handleInternalChatUpdate(data.payload)
        }
      }

      socket.on(`${usuario.tenantId}:internalChat`, internalChatListener)

      // Armazenar listener para cleanup
      if (!this.chatInternoSocketListeners) {
        this.chatInternoSocketListeners = []
      }
      this.chatInternoSocketListeners.push({
        event: `${usuario.tenantId}:internalChat`,
        handler: internalChatListener
      })
    },

    handleInternalChatMessage (message, userId) {
      // ✅ VERIFICAR SE A MENSAGEM É PARA MIM
      const isMensagemParaMim =
        message.recipientId === userId || // Mensagem privada para mim
        message.groupId // Mensagem de grupo (todos os membros recebem)

      // Se não for mensagem para mim, ignorar
      if (!isMensagemParaMim) {
        console.log('ℹ️ Mensagem não é para mim, ignorando')
        return
      }

      // Se não for mensagem do próprio usuário
      if (message.senderId !== userId) {
        // Verificar se está dentro do chat do contato que enviou a mensagem
        const isDentroDoContatoQueEnviou =
          this.chatInternoContatoAtivo === message.senderId ||
          this.chatInternoContatoAtivo === `group-${message.groupId}`

        // ✅ Notificação visual e incremento: SOMENTE se o chat estiver FECHADO
        if (!this.chatInternoAberto) {
          console.log('➕ Atendimento: Chat fechado, incrementando contador')
          this.chatInternoUnread++

          // Notificação visual (apenas uma por vez)
          const senderName = message.sender?.name || 'Usuário'
          const groupName = message.group?.name || ''
          const notificationText = message.groupId
            ? `${senderName} (${groupName}): ${message.message.substring(0, 40)}`
            : `${senderName}: ${message.message.substring(0, 50)}`

          // Limpar notificações anteriores para evitar spam
          this.$q.notify({
            type: 'info',
            message: `💬 ${notificationText}${message.message.length > 40 ? '...' : ''}`,
            position: 'top-right',
            timeout: 4000,
            group: 'chat-interno',
            actions: [
              {
                label: 'Ver',
                color: 'white',
                handler: () => {
                  this.abrirChatInterno()
                }
              }
            ]
          })
        } else {
          console.log('ℹ️ Atendimento: Modal aberto, ChatModal gerencia incremento')
        }

        // ✅ SOM: Tocar se NÃO estiver dentro do chat daquele contato específico
        if (!isDentroDoContatoQueEnviou) {
          console.log('🔔 Tocando som de notificação (não está no chat do contato)')
          if (this.$refs.audioChatInterno && !this._lastNotificationSound) {
            this.$refs.audioChatInterno.play()
            this._lastNotificationSound = Date.now()

            // Resetar após 2 segundos para permitir som novamente
            setTimeout(() => {
              this._lastNotificationSound = null
            }, 2000)
          }
        } else {
          console.log('🔕 Não tocar som (está dentro do chat do contato)')
        }
      }
    },

    handleInternalChatUpdate (update) {
      if (update.action === 'markAsRead') {
        console.log('📖 Mensagens marcadas como lidas no backend:', update.count, 'mensagens')

        // Decrementar contador global se necessário
        if (update.count > 0) {
          this.chatInternoUnread = Math.max(0, this.chatInternoUnread - update.count)
          console.log('📉 Contador global atualizado para:', this.chatInternoUnread)
        }
      }
    },

    cleanupChatInternoSocketListeners () {
      console.log('🧹 Limpando listeners de socket do chat interno na página de atendimento')
      const socket = getSocket()

      if (this.chatInternoSocketListeners && this.chatInternoSocketListeners.length > 0) {
        this.chatInternoSocketListeners.forEach(({ event, handler }) => {
          socket.off(event, handler)
          console.log('🗑️ Removido listener:', event)
        })
        this.chatInternoSocketListeners = []
      }
    },

    async carregarChatInternoUnread () {
      try {
        if (!this.$axios) {
          console.error('❌ $axios não disponível')
          return
        }

        // ✅ Carregar contadores de chats privados E grupos
        const [chatsResponse, groupsResponse] = await Promise.all([
          this.$axios.get('/internal-chat/chats'),
          this.$axios.get('/internal-groups')
        ])

        // Somar mensagens não lidas de chats privados
        const chatsUnread = chatsResponse.data.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)

        // Somar mensagens não lidas de grupos
        const groupsUnread = groupsResponse.data.reduce((sum, group) => sum + (group.unreadCount || 0), 0)

        // Total
        this.chatInternoUnread = chatsUnread + groupsUnread

        console.log('📊 Contador de chat interno carregado:')
        console.log('   - Chats privados:', chatsUnread)
        console.log('   - Grupos:', groupsUnread)
        console.log('   - Total:', this.chatInternoUnread)
      } catch (error) {
        console.error('Erro ao carregar contador de chat interno:', error)
      }
    }
  },
  beforeMount () {
    this.listarFilas()
    this.listarEtiquetas()
    this.listarConfiguracoes()
    const filtros = JSON.parse(localStorage.getItem('filtrosAtendimento'))
    if (!filtros?.pageNumber) {
      localStorage.setItem('filtrosAtendimento', JSON.stringify(this.pesquisaTickets))
    }
  },
  async mounted () {
    console.log('🚀 [FRONTEND] Componente Index.vue montado')
    console.log('👤 Usuário do localStorage:', JSON.stringify(this.usuario, null, 2))
    console.log('🏢 tenantId:', this.usuario.tenantId)
    console.log('👑 profile:', this.usuario.profile || localStorage.getItem('profile'))

    this.$root.$on('infor-cabecalo-chat:acao-menu', this.setValueMenu)
    this.$root.$on('update-ticket:info-contato', this.setValueMenuContact)
    this.$root.$on('user-queues-updated', this.onUserQueuesUpdated)
    this.socketTicketList()
    this.pesquisaTickets = JSON.parse(localStorage.getItem('filtrosAtendimento'))
    this.$root.$on('handlerNotifications', this.handlerNotifications)

    // ✅ Escutar eventos do chat interno
    this.$root.$on('chat-interno:incrementar-contador', (count) => {
      console.log('📈 Atendimento recebeu incremento:', count)
      this.chatInternoUnread += count
    })

    // Listener para decrementar contador quando mensagens forem lidas
    this.$root.$on('chat-interno:mensagens-lidas', (count) => {
      this.chatInternoUnread = Math.max(0, this.chatInternoUnread - count)
      console.log('📉 Decrementando contador de chat interno:', count, 'Novo valor:', this.chatInternoUnread)
    })

    // Listener para zerar contador quando chat for aberto
    this.$root.$on('chat-interno:aberto', () => {
      this.chatInternoUnread = 0
      console.log('🔄 Chat aberto, zerando contador')
    })

    console.log('📋 pesquisaTickets carregado do localStorage:', JSON.stringify(this.pesquisaTickets, null, 2))

    // Carregar dados do usuário do backend
    await this.carregarDadosUsuario()

    await this.listarWhatsapps()
    // Carregar tickets da primeira tab
    await this.consultarTicketsPorStatus(this.selectedTab)
    await this.listarUsuarios()
    const { data } = await ListarMensagensRapidas()
    this.mensagensRapidas = data
    if (!('Notification' in window)) {
    } else {
      Notification.requestPermission()
    }
    this.userProfile = localStorage.getItem('profile')

    // ✅ Configurar socket do chat interno
    await this.carregarChatInternoUnread()
    this.setupChatInternoSocket(this.usuario)

    // se existir ticket na url, abrir o ticket.
    if (this.$route?.params?.ticketId) {
      const ticketId = this.$route?.params?.ticketId
      // Buscar ticket em todas as paginações
      let ticket = null
      let origem = null
      for (const statusKey of Object.keys(this.ticketsPagination)) {
        const found = this.ticketsPagination[statusKey].tickets.find(t => t.id === +ticketId)
        if (found) {
          ticket = found
          origem = statusKey
          break
        }
      }

      if (ticket) {
        // caso esteja em um tamanho mobile, fechar a drawer dos contatos
        if (this.$q.screen.lt.md && ticket.status !== 'pending') {
          this.$root.$emit('infor-cabecalo-chat:acao-menu')
        }
        console.log('before - AbrirChatMensagens', ticket)
        const payload = this.buildTicketAccessPayload(
          ticket,
          origem ? `rota_${origem}` : 'rota_ticket'
        )
        this.$store.dispatch('AbrirChatMensagens', payload)
      }
    } else {
      console.log('chat-empty')
      // Verificar se já está na rota antes de navegar para evitar NavigationDuplicated
      if (this.$route.name !== 'chat-empty') {
        this.$router.push({ name: 'chat-empty' })
      }
    }
  },
  destroyed () {
    this.$root.$off('handlerNotifications', this.handlerNotifications)
    this.$root.$off('infor-cabecalo-chat:acao-menu', this.setValueMenu)
    this.$root.$off('update-ticket:info-contato', this.setValueMenuContact)

    // ✅ Limpar listeners do chat interno
    this.$root.$off('chat-interno:incrementar-contador')
    this.$root.$off('chat-interno:mensagens-lidas')
    this.$root.$off('chat-interno:aberto')

    // ✅ Limpar listeners de socket do chat interno
    this.cleanupChatInternoSocketListeners()

    // this.socketDisconnect()
    this.$store.commit('TICKET_FOCADO', {})
  }
}
</script>

<style lang="sass">
.upload-btn-wrapper
  position: relative
  overflow: hidden
  display: inline-block

  & input[type="file"]
    font-size: 100px
    position: absolute
    left: 0
    top: 0
    opacity: 0

.WAL
  width: 100%
  height: 100%

  &:before
    content: ''
    height: 127px
    position: fixed
    top: 0
    width: 100%

  &__layout
    margin: 0 auto
    z-index: 4000
    height: 100%
    width: 100%

  &__field.q-field--outlined .q-field__control:before
    border: none

  .q-drawer--standard
    .WAL__drawer-close
      display: none

@media (max-width: 850px)
  .WAL
    padding: 0
    &__layout
      width: 100%
      border-radius: 0

@media (min-width: 691px)
  .WAL
    &__drawer-open
      display: none

.conversation__summary
  margin-top: 4px

.conversation__more
  margin-top: 0!important
  font-size: 1.4rem

.tab-container
  overflow-x: auto
  font-size: 0.75rem

.tab-scroll
  white-space: nowrap

.scheduled-messages-container
  max-height: 200px
  overflow-y: auto
  overflow-x: hidden

.conexao-filtrada
  border: 2px solid $primary !important
  box-shadow: 0 0 8px rgba(33, 150, 243, 0.3) !important
  transform: scale(1.05)
  transition: all 0.2s ease
  opacity: 1 !important

</style>
