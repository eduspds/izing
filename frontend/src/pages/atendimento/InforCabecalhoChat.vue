<template>
  <div>
    <q-header class="bg-white text-grey-10 no-border-radius">
      <q-toolbar style="min-height: 60px; height: 60px;" class="no-border-radius q-pa-none ">
        <q-btn flat dense round icon="mdi-menu" v-if="$q.screen.lt.md" class="q-mx-xs-none q-ml-md"
          :color="$q.dark.isActive ? 'white' : ''" @click="$root.$emit('infor-cabecalo-chat:acao-menu')" />
        <q-item clickable v-ripple class="q-ma-none q-pa-none full"
          style="min-height: 70px; height: 70px; width: fit-content;"
          @click="$root.$emit('update-ticket:info-contato')">
          <q-item-section avatar class="q-pl-sm">
            <q-btn round flat>
              <q-avatar class="bg-grey">
                <q-img :src="Value(cticket.contact, 'profilePicUrl')">
                  <template v-slot:error>
                    <q-icon name="mdi-account" size="20px" color="grey-5" />
                  </template>
                </q-img>
              </q-avatar>
            </q-btn>
          </q-item-section>
          <q-item-section id="InfoCabecalhoChat" class="modern-chat-header">
            <!-- Nome do Cliente -->
            <div class="client-name-container">
              <q-item-label class="client-name">
                {{ Value(cticket.contact, 'name') || 'Contato' }}
                <q-skeleton v-if="!Value(cticket.contact, 'name')" animation="fade" class="name-skeleton" />
                <!-- Indicador de modo espiar -->
                <q-chip v-if="modoEspiar" size="sm" color="info" text-color="white" class="q-ml-sm">
                  <q-icon name="mdi-eye" size="12px" class="q-mr-xs" />
                  Modo Espiar
                </q-chip>
              </q-item-label>
              <q-btn flat round dense icon="edit" @click.stop="editContact(cticket.contact.id)" class="edit-button"
                :disable="modoEspiar">
                <q-tooltip content-class="bg-grey-7 text-bold">Editar Contato</q-tooltip>
              </q-btn>
            </div>

            <!-- Informações Secundárias -->
            <div class="info-tags-container" v-if="Value(cticket.contact, 'name')">
              <div class="info-tag telefone-tag" v-if="Value(cticket.contact, 'number')">
                <q-icon name="mdi-phone" />
                <span class="tag-label">{{ formatarNumeroContato(Value(cticket.contact, 'number')) }}</span>
                <q-tooltip content-class="bg-grey-7 text-bold">
                  <span class="text-caption">Telefone do Contato</span>
                </q-tooltip>
              </div>

              <!--<div class="info-tag assigned-tag" v-if="Value(cticket.user, 'name')">
                <q-icon name="mdi-face-agent" />
                <span class="tag-label">{{ Value(cticket.user, 'name') }}</span>
                <q-tooltip content-class="bg-grey-7 text-bold">
                  <span class="text-caption">Usuário Atribuído</span>
                </q-tooltip>
              </div>
              <q-skeleton v-else type="rect" class="tag-skeleton" animation="fade" />

              <div class="info-tag ticket-tag">
                <q-icon name="mdi-ticket-confirmation" />
                <span class="tag-label">#{{ cticket.id }}</span>
                <q-tooltip content-class="bg-grey-7 text-bold">
                  <span class="text-caption">Número do Ticket</span>
                </q-tooltip>
              </div>-->
            </div>

          </q-item-section>
        </q-item>
        <q-space />
        <div class="q-gutter-xs q-pr-sm" v-if="Value(cticket.contact, 'name')">
          <!-- Botão para sair do modo espiar -->
          <q-btn v-if="modoEspiar" @click="sairModoEspiar" flat icon="mdi-eye-off" color="info"
            class="bg-padrao btn-rounded">
            <q-tooltip content-class="bg-info text-bold">
              Sair do Modo Espiar
            </q-tooltip>
          </q-btn>
          <template v-if="!$q.screen.xs">
            <q-btn v-if="podeUsarSigilo" @click="abrirModalSigilo" flat
              :color="cticket.isConfidential ? 'amber-9' : 'grey-7'" class="bg-padrao btn-rounded"
              :disable="modoEspiar">
              <q-icon :name="cticket.isConfidential ? 'mdi-lock' : 'mdi-lock-outline'" />
              <q-tooltip content-class="bg-grey-7 text-bold">
                {{ cticket.isConfidential ? 'Sigilo Ativo' : 'Ativar Sigilo' }}
              </q-tooltip>
            </q-btn>
            <q-btn @click="openTagModal" flat icon="mdi-tag-outline" color="pink-6" class="bg-padrao btn-rounded"
              :disable="cticket.status == 'closed' || modoEspiar">
              <q-tooltip content-class="bg-pink-6 text-bold">
                Etiquetas
              </q-tooltip>
            </q-btn>
            <q-btn @click="abrirModalLogs" flat icon="mdi-timeline-text-outline" color="primary"
              class="bg-padrao btn-rounded">
              <q-tooltip content-class="bg-primary text-bold">
                Logs
              </q-tooltip>
            </q-btn>
            <q-btn @click="abrirModalHistorico" flat icon="mdi-history" color="teal"
              class="bg-padrao btn-rounded" :disable="modoEspiar">
              <q-tooltip content-class="bg-teal text-bold">
                Histórico de atendimentos com este cliente
              </q-tooltip>
            </q-btn>
            <q-btn @click="abrirModalOutrasInformacoes" flat icon="mdi-information-outline" color="info"
              class="bg-padrao btn-rounded" :disable="cticket.status == 'closed' || modoEspiar">
              <q-tooltip content-class="bg-info text-bold">
                Outras Informações
              </q-tooltip>
            </q-btn>
            <q-btn @click="$emit('abrir:modalAgendamentoMensagem')" flat icon="mdi-message-text-clock-outline"
              color="amber-9" class="bg-padrao btn-rounded" :disable="modoEspiar">
              <q-tooltip content-class="bg-amber-9 text-bold">
                Agendar mensagem
              </q-tooltip>
            </q-btn>
            <q-btn @click="$emit('abrir:modalAgendaMensagens')" flat icon="mdi-calendar-month" color="primary"
              class="bg-padrao btn-rounded" :disable="modoEspiar">
              <q-tooltip content-class="bg-primary text-bold">
                Agenda de mensagens
              </q-tooltip>
            </q-btn>
            <q-btn @click="$emit('updateTicket:retornar')" flat icon="mdi-replay" color="negative"
              class="bg-padrao btn-rounded" :disable="cticket.status == 'closed' || modoEspiar">
              <q-tooltip content-class="bg-negative text-bold">
                Retornar Ticket para a Fila
              </q-tooltip>
            </q-btn>
            <q-btn @click="$emit('updateTicket:resolver')" color="positive" flat class="bg-padrao btn-rounded"
              icon="mdi-comment-check" :disable="cticket.status == 'closed' || modoEspiar">
              <q-tooltip content-class="bg-positive text-bold">
                Encerrar
              </q-tooltip>
            </q-btn>
            <q-btn @click="listarFilas" flat color="primary" class="bg-padrao btn-rounded"
              :disable="cticket.status == 'closed' || modoEspiar">
              <q-icon name="mdi-transfer" />
              <q-tooltip content-class="bg-primary text-bold">
                Transferir
              </q-tooltip>
            </q-btn>
          </template>
          <template v-else>
            <q-fab :disable="modoEspiar" color="primary" flat dense class="bg-padrao text-bold "
              icon="keyboard_arrow_left" direction="down" padding="5px" label="Ações" :class="{
                'bg-black': $q.dark.isActive

              }">
              <q-fab-action @click="$emit('updateTicket:resolver')" color="positive" flat class="bg-padrao q-pa-xs "
                icon="mdi-comment-check" :disable="cticket.status == 'closed' || modoEspiar" :class="{
                  'bg-black': $q.dark.isActive

                }">
                <q-tooltip content-class="bg-positive text-bold">
                  Resolver
                </q-tooltip>
              </q-fab-action>
              <q-fab-action @click="$emit('updateTicket:retornar')" flat icon="mdi-replay" color="negative"
                class="bg-padrao q-pa-xs " :disable="cticket.status == 'closed' || modoEspiar" :class="{
                  'bg-black': $q.dark.isActive

                }">
                <q-tooltip content-class="bg-negative text-bold">
                  Retornar Ticket para a Fila
                </q-tooltip>
              </q-fab-action>

              <q-fab-action @click="listarFilas" flat color="primary" class="bg-padrao q-pa-xs "
                :disable="cticket.status == 'closed' || modoEspiar" :class="{
                  'bg-black-dark': $q.dark.isActive
                }">
                <q-icon name="mdi-transfer" />
                <q-tooltip content-class="bg-primary text-bold">
                  Transferir
                </q-tooltip>
              </q-fab-action>
              <q-fab-action @click="$emit('abrir:modalAgendamentoMensagem')" flat color="amber-9"
                class="bg-padrao q-pa-xs " :disable="modoEspiar" :class="{
                  'bg-black': $q.dark.isActive

                }">
                <q-icon name="mdi-message-text-clock-outline" />
                <q-tooltip content-class="bg-amber-9 text-bold">
                  Agendar mensagem
                </q-tooltip>
              </q-fab-action>
              <q-fab-action @click="$emit('abrir:modalAgendaMensagens')" flat color="primary" class="bg-padrao q-pa-xs "
                :disable="modoEspiar" :class="{
                  'bg-black': $q.dark.isActive

                }">
                <q-icon name="mdi-calendar-month" />
                <q-tooltip content-class="bg-primary text-bold">
                  Agenda de mensagens
                </q-tooltip>
              </q-fab-action>
              <q-fab-action @click="abrirModalOutrasInformacoes" flat color="info" class="bg-padrao q-pa-xs "
                :disable="cticket.status == 'closed' || modoEspiar" :class="{
                  'bg-black': $q.dark.isActive

                }">
                <q-icon name="mdi-information-outline" />
                <q-tooltip content-class="bg-info text-bold">
                  Outras Informações
                </q-tooltip>
              </q-fab-action>
              <q-fab-action v-if="podeUsarSigilo" @click="abrirModalSigilo" flat
                :color="cticket.isConfidential ? 'amber-9' : 'grey-7'" class="bg-padrao q-pa-xs " :disable="modoEspiar"
                :class="{
                  'bg-black': $q.dark.isActive
                }">
                <q-icon :name="cticket.isConfidential ? 'mdi-lock' : 'mdi-lock-outline'" />
                <q-tooltip content-class="bg-grey-7 text-bold">
                  {{ cticket.isConfidential ? 'Sigilo Ativo' : 'Ativar Sigilo' }}
                </q-tooltip>
              </q-fab-action>
            </q-fab>
          </template>

          <!-- <q-btn
            round
            flat
            icon="mdi-text-box-search-outline"
          />
          <q-btn
            round
            flat
          >
            <q-icon
              name="mdi-attachment"
              class="rotate-135"
            />
          </q-btn>
          <q-btn
            round
            flat
            icon="mdi-dots-vertical"
          >
            <q-menu
              auto-close
              :offset="[110, 0]"
            >
              <q-list style="min-width: 150px">
                <q-item clickable>
                  <q-item-section>Contact data</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Block</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Select messages</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Silence</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Clear messages</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Erase messages</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn> -->
        </div>
      </q-toolbar>
      <q-separator />
    </q-header>

    <q-dialog v-model="modalTransferirTicket" @hide="fecharModalTransferencia" persistent>
      <q-card class="q-pa-md" style="width: 500px">
        <q-card-section>
          <div class="text-h6">Selecione o destino:</div>
        </q-card-section>
        <q-card-section>
          <q-select square outlined v-model="filaSelecionada" :options="filas" emit-value map-options option-value="id"
            option-label="queue" label="Departamento de destino" @input="limparUsuarioSelecionado" />
        </q-card-section>
        <q-card-section>
          <q-select square outlined v-model="usuarioSelecionado" :options="usuarios.filter(filterUsers)" emit-value
            map-options option-value="id" option-label="name" label="Usuário destino" />
        </q-card-section>
        <q-card-section>
          <q-input square outlined v-model="mensagemTransferencia" type="textarea"
            label="Mensagem de Transferência (opcional)"
            placeholder="Descreva o contexto ou motivo da transferência para o próximo atendente..."
            hint="Esta mensagem será salva como contexto da transferência" counter maxlength="500" rows="3"
            icon="mdi-message-text-outline" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Sair" color="negative" @click="fecharModalTransferencia" class="q-mr-lg" />
          <q-btn flat label="Salvar" color="primary" @click="confirmarTransferenciaTicket" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="exibirModalLogs" no-backdrop-dismiss full-height position="right" @hide="logsTicket = []">
      <q-card style="width: 500px; max-width: 90vw;">
        <q-card-section class="bg-primary text-white q-pa-md">
          <div class="row items-center">
            <div class="text-h6 text-bold">
              <q-icon name="mdi-timeline-text-outline" size="24px" class="q-mr-sm" />
              Logs do Ticket #{{ ticketFocado.id }}
            </div>
            <q-space />
            <q-btn icon="close" color="white" flat round dense v-close-popup />
          </div>
          <div class="text-caption q-mt-xs opacity-80">
            Histórico completo de ações realizadas neste ticket
          </div>
        </q-card-section>
        <q-card-section class="q-pa-none">
          <q-scroll-area style="height: calc(100vh - 200px);" class="full-width">
            <q-timeline color="primary" style="width: 100%" class="q-pa-md">
              <q-timeline-entry v-for="(log, idx) in logsTicket" :key="log && log.id || idx"
                :subtitle="$formatarData(log.createdAt, 'dd/MM/yyyy HH:mm:ss')"
                :color="messagesLog[log.type] && messagesLog[log.type].color || 'grey'"
                :icon="messagesLog[log.type] && messagesLog[log.type].icon || 'mdi-information'" side="right">
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
                    <div v-if="log.description" class="text-caption text-grey-7 q-mb-xs q-pl-sm"
                      style="border-left: 2px solid #e0e0e0;">
                      {{ log.description }}
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
                      <q-expansion-item dense dense-toggle expand-separator icon="mdi-information-outline"
                        label="Detalhes" header-class="text-caption bg-grey-2" class="rounded-borders">
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

    <!-- Modal Histórico de atendimentos (tickets do mesmo contato) -->
    <q-dialog v-model="exibirModalHistorico" no-backdrop-dismiss full-height position="right" @show="carregarHistoricoTickets" @hide="historicoTickets = []">
      <q-card style="width: 480px; max-width: 90vw;">
        <q-card-section class="bg-teal text-white q-pa-md">
          <div class="row items-center">
            <div class="text-h6 text-bold">
              <q-icon name="mdi-history" size="24px" class="q-mr-sm" />
              Histórico com este cliente
            </div>
            <q-space />
            <q-btn icon="close" color="white" flat round dense v-close-popup />
          </div>
          <div class="text-caption q-mt-xs opacity-80">
            Tickets separados por data; clique para abrir o atendimento
          </div>
        </q-card-section>
        <q-card-section class="q-pa-none">
          <q-inner-loading :showing="loadingHistorico">
            <q-spinner-dots size="40px" color="teal" />
          </q-inner-loading>
          <q-scroll-area v-if="!loadingHistorico" style="height: calc(100vh - 200px);" class="full-width">
            <q-list separator>
              <q-item v-for="t in historicoTickets" :key="t.id" clickable v-ripple
                :active="ticketFocado && ticketFocado.id === t.id" active-class="bg-teal-1"
                @click="aoSelecionarTicketHistorico(t)">
                <q-item-section avatar>
                  <q-icon :name="t.status === 'closed' ? 'mdi-check-circle' : 'mdi-ticket-confirmation-outline'"
                    :color="t.status === 'closed' ? 'grey' : 'teal'" size="28px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">Ticket #{{ t.id }}</q-item-label>
                  <q-item-label caption>
                    {{ $formatarData(t.createdAt, 'dd/MM/yyyy') }} – {{ $formatarData(t.updatedAt, 'dd/MM/yyyy HH:mm') }}
                    <span v-if="t.user" class="q-ml-xs">· {{ t.user.name }}</span>
                  </q-item-label>
                  <q-item-label v-if="t.lastMessage" caption class="ellipsis" style="max-width: 280px;">
                    {{ t.lastMessage }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip dense :color="t.status === 'closed' ? 'grey-5' : 'teal'" text-color="white" size="sm">
                    {{ t.status === 'closed' ? 'Encerrado' : t.status === 'open' ? 'Aberto' : 'Fila' }}
                  </q-chip>
                </q-item-section>
              </q-item>
              <q-item v-if="!loadingHistorico && (!historicoTickets || historicoTickets.length === 0)" class="text-center q-pa-xl">
                <q-item-section>
                  <q-icon name="mdi-history" size="48px" color="grey-5" />
                  <q-item-label class="text-grey-6 q-mt-sm">Nenhum outro atendimento com este cliente</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal de Etiquetas -->
    <q-dialog v-model="tagModalVisible" persistent>
      <q-card class="q-pa-none" style="width: 600px; max-width: 90vw;">
        <!-- Header do Modal -->
        <q-card-section class="bg-primary text-white q-pa-md">
          <div class="row items-center">
            <div class="text-h6 text-bold">Gerenciar Etiquetas</div>
            <q-space />
            <q-btn flat round dense icon="close" color="white" @click="closeTagModal" class="q-ml-sm" />
          </div>
          <div class="text-caption q-mt-xs opacity-80">
            Selecione as etiquetas para o contato: {{ ticketFocado.contact?.name || 'Contato' }}
          </div>
        </q-card-section>

        <!-- Conteúdo do Modal -->
        <q-card-section class="q-pa-lg">
          <div class="q-mb-md">
            <q-select outlined v-model="selectedTags" multiple :options="etiquetas" use-chips option-value="id"
              option-label="tag" emit-value map-options label="Etiquetas disponíveis"
              hint="Selecione uma ou mais etiquetas" dropdown-icon="mdi-chevron-down" class="q-mb-sm"
              @input="tagSelecionada">
              <template v-slot:option="{ itemProps, itemEvents, opt, selected, toggleOption }">
                <q-item v-bind="itemProps" v-on="itemEvents" class="q-pa-sm" :class="{ 'bg-grey-1': selected }">
                  <q-item-section avatar>
                    <q-icon :style="`color: ${opt.color || '#1976d2'}`" name="mdi-pound-box-outline" size="20px" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-body1" v-html="opt.tag"></q-item-label>
                    <q-item-label caption v-if="opt.description">
                      {{ opt.description }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-checkbox :value="selected" @input="toggleOption(opt)" color="primary" size="sm" />
                  </q-item-section>
                </q-item>
              </template>

              <template v-slot:selected-item="{ opt }">
                <q-chip removable
                  :style="`background-color: ${opt.color || '#e3f2fd'}; color: ${opt.color ? 'white' : '#1976d2'}`"
                  class="q-ma-xs text-body2" @remove="removeTag(opt)">
                  <q-icon name="mdi-pound-box-outline" size="16px" class="q-mr-xs" />
                  {{ opt.tag }}
                </q-chip>
              </template>

              <template v-slot:no-option="{ itemProps, itemEvents }">
                <q-item v-bind="itemProps" v-on="itemEvents" class="q-pa-lg text-center">
                  <q-item-section>
                    <q-icon name="mdi-tag-off" size="48px" color="grey-5" class="q-mb-md" />
                    <q-item-label class="text-h6 text-grey-6 text-bold">
                      Nenhuma etiqueta disponível
                    </q-item-label>
                    <q-item-label caption class="text-grey-6">
                      Cadastre novas etiquetas na administração do sistema.
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- Etiquetas Selecionadas -->
          <div v-if="selectedTags.length > 0" class="q-mt-md">
            <div class="text-subtitle2 text-grey-7 q-mb-sm">
              <q-icon name="mdi-check-circle" color="positive" size="16px" class="q-mr-xs" />
              Etiquetas selecionadas ({{ selectedTags.length }})
            </div>
            <div class="row q-gutter-xs">
              <q-chip v-for="tag in getSelectedTagsInfo()" :key="tag.id" removable
                :style="`background-color: ${tag.color || '#e3f2fd'}; color: ${tag.color ? 'white' : '#1976d2'}`"
                class="q-ma-xs" @remove="removeTag(tag)">
                <q-icon name="mdi-pound-box-outline" size="16px" class="q-mr-xs" />
                {{ tag.tag }}
              </q-chip>
            </div>
          </div>
        </q-card-section>

        <!-- Footer do Modal -->
        <q-card-actions class="q-pa-lg q-pt-none" align="right">
          <q-btn flat label="Cancelar" color="grey-7" @click="closeTagModal" class="q-mr-sm" no-caps />
          <q-btn label="Salvar Etiquetas" color="primary" @click="saveTags" icon="mdi-content-save" no-caps
            class="primary" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal de Outras Informações -->
    <q-dialog v-model="modalOutrasInformacoes" persistent>
      <q-card class="q-pa-none" style="width: 600px; max-width: 90vw;">
        <!-- Header do Modal -->
        <q-card-section class="bg-info text-white q-pa-md">
          <div class="row items-center">
            <div class="text-h6 text-bold">Outras Informações</div>
            <q-space />
            <q-btn flat round dense icon="close" color="white" @click="fecharModalOutrasInformacoes" class="q-ml-sm" />
          </div>
          <div class="text-caption q-mt-xs opacity-80">
            Informações adicionais do contato: {{ ticketFocado.contact?.name || 'Contato' }}
          </div>
        </q-card-section>

        <!-- Conteúdo do Modal -->
        <q-card-section class="q-pa-lg">
          <div v-if="cIsExtraInfo" class="q-mb-md">
            <div class="text-subtitle2 text-grey-7 q-mb-sm">
              <q-icon name="mdi-information" color="info" size="16px" class="q-mr-xs" />
              Informações disponíveis ({{ ticketFocado.contact.extraInfo.length }})
            </div>
            <q-list bordered separator>
              <q-item v-for="(info, idx) in ticketFocado.contact.extraInfo" :key="idx" class="q-pa-md">
                <q-item-section>
                  <q-item-label class="text-body1">{{ info.value }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div v-else class="text-center q-pa-xl">
            <q-icon name="mdi-information-off" size="48px" color="grey-5" class="q-mb-md" />
            <div class="text-h6 text-grey-6 text-bold">
              Nenhuma informação adicional
            </div>
            <div class="text-caption text-grey-6">
              Este contato não possui informações extras cadastradas.
            </div>
          </div>
        </q-card-section>

        <!-- Footer do Modal -->
        <q-card-actions class="q-pa-lg q-pt-none" align="right">
          <q-btn flat label="Fechar" color="grey-7" @click="fecharModalOutrasInformacoes" class="q-mr-sm" no-caps />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal de Contato -->
    <ContatoModal :contactId="selectedContactId" :modalContato.sync="modalContato"
      @contatoModal:contato-editado="contatoEditado" />

    <!-- Modal de Sigilo -->
    <q-dialog v-model="modalSigilo" persistent>
      <q-card class="q-pa-md" style="width: 500px; max-width: 90vw;">
        <q-card-section>
          <div class="text-h6 text-weight-bold">
            <q-icon name="mdi-lock" size="24px" class="q-mr-sm" />
            {{ cticket.isConfidential ? 'Gerenciar Sigilo' : 'Ativar Sigilo' }}
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-if="!cticket.isConfidential" class="q-mb-md">
            <div class="text-body2 q-mb-sm">
              Ao ativar o sigilo, todas as mensagens enviadas e recebidas a partir deste momento serão sigilosas e
              visíveis
              apenas para você.
            </div>
            <div class="text-caption text-grey-7">
              O sigilo será desativado automaticamente ao encerrar ou transferir o ticket, mas as mensagens sigilosas
              continuarão protegidas.
            </div>
          </div>
          <div v-else class="q-mb-md">
            <div class="text-body2 q-mb-sm">
              O sigilo está ativo neste ticket. Mensagens sigilosas são visíveis apenas para você.
            </div>
            <div v-if="temMensagensSigilosas" class="text-caption text-grey-7 q-mt-sm">
              Este ticket possui mensagens sigilosas. Você pode exibi-las ou desativar o sigilo.
            </div>
          </div>
          <q-input v-model="senhaSigilo" :type="isPwdSigilo ? 'password' : 'text'" label="Senha" outlined dense
            class="q-mt-md" :error="$v.senhaSigilo.$error" error-message="Senha é obrigatória">
            <template v-slot:append>
              <q-icon :name="isPwdSigilo ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                @click="isPwdSigilo = !isPwdSigilo" />
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey-7" @click="fecharModalSigilo" />
          <q-btn v-if="!cticket.isConfidential" flat label="Ativar Sigilo" color="primary" @click="ativarSigilo"
            :loading="loadingSigilo" />
          <template v-else>
            <q-btn v-if="temMensagensSigilosas" flat label="Exibir Mensagens" color="primary"
              @click="exibirMensagensSigilosas" :loading="loadingSigilo" class="q-mr-sm" />
            <q-btn flat label="Desativar Sigilo" color="negative" @click="desativarSigilo" :loading="loadingSigilo" />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
const userId = +localStorage.getItem('userId')
import { mapGetters } from 'vuex'
import { ListarUsuarios } from 'src/service/user'
import { ListarFilas } from 'src/service/filas'
import { AtualizarTicket, ConsultarLogsTicket, AtivarSigilo, DesativarSigilo, ExibirMensagensSigilosas } from 'src/service/tickets'
import { ListarEtiquetas } from 'src/service/etiquetas'
import { EditarEtiquetasContato, ListarTicketsPorContato } from 'src/service/contatos'
import { messagesLog } from '../../utils/constants'
import ContatoModal from 'src/pages/contatos/ContatoModal'
export default {
  name: 'InfoCabecalhoMensagens',
  components: {
    ContatoModal
  },
  data () {
    return {
      modalTransferirTicket: false,
      usuarioSelecionado: null,
      filaSelecionada: null,
      usuarios: [],
      filas: [],
      logsTicket: [],
      exibirModalLogs: false,
      messagesLog,
      tagModalVisible: false,
      selectedTags: [],
      etiquetas: [],
      modalContato: false,
      selectedContactId: null,
      modalOutrasInformacoes: false,
      mensagemTransferencia: '',
      modalSigilo: false,
      senhaSigilo: '',
      isPwdSigilo: true,
      loadingSigilo: false,
      exibirModalHistorico: false,
      historicoTickets: [],
      loadingHistorico: false
    }
  },
  validations: {
    senhaSigilo: {
      required (value) {
        return !!value
      }
    }
  },
  computed: {
    ...mapGetters([
      'ticketFocado',
      'modoEspiar',
      'userQueues'
    ]),
    cticket () {
      const infoDefault = {
        contact: { profilePicUrl: '', name: '' },
        user: { name: '' }
      }
      const result = Object.keys(this.ticketFocado).includes('contact') ? this.ticketFocado : infoDefault
      console.log('🎫 TICKET FOCADO - InforCabecalhoChat.vue:', this.ticketFocado)
      return result
    },
    cIsExtraInfo () {
      return this.ticketFocado?.contact?.extraInfo?.length > 0
    },
    podeUsarSigilo () {
      // Verificar se usuário pertence a departamento com sigilo habilitado
      if (!this.userQueues || this.userQueues.length === 0) {
        return false
      }
      return this.userQueues.some(queue => queue.isConfidential === true)
    },
    temMensagensSigilosas () {
      // Verificar se ticket tem mensagens sigilosas (mesmo que sigilo esteja desativado)
      return this.ticketFocado?.confidentialUserId === userId
    }
  },
  methods: {
    // Victor: Retirei o modal logs do left side, agora está no topo
    async abrirModalLogs () {
      const { data } = await ConsultarLogsTicket({ ticketId: this.ticketFocado.id })
      this.logsTicket = data
      this.exibirModalLogs = true
    },
    abrirModalHistorico () {
      this.exibirModalHistorico = true
    },
    async carregarHistoricoTickets () {
      const contactId = this.ticketFocado && this.ticketFocado.contact && this.ticketFocado.contact.id
      if (!contactId) return
      this.loadingHistorico = true
      this.historicoTickets = []
      try {
        const { data } = await ListarTicketsPorContato(contactId, 50)
        this.historicoTickets = (data && data.tickets) || []
      } catch (err) {
        console.error('Erro ao carregar histórico de tickets:', err)
        this.$notificarErro('Não foi possível carregar o histórico.', err)
      } finally {
        this.loadingHistorico = false
      }
    },
    aoSelecionarTicketHistorico (ticket) {
      this.exibirModalHistorico = false
      this.$store.dispatch('AbrirChatMensagens', { id: ticket.id, status: ticket.status })
    },
    Value (obj, prop) {
      try {
        return obj[prop]
      } catch (error) {
        return ''
      }
    },
    filterUsers (element, index, array) {
      // Filtrar usuários inativos
      if (element.isInactive === true) {
        // Verificar se a data de inatividade ainda é válida (se houver)
        if (element.inactiveUntil) {
          const inactiveDate = new Date(element.inactiveUntil)
          const now = new Date()
          if (inactiveDate > now) {
            return false // Usuário ainda está inativo
          }
        } else {
          return false // Inativo por tempo indeterminado
        }
      }

      const fila = this.filaSelecionada
      if (fila == null) return true
      const queues_valid = element.queues.filter(function (element, index, array) {
        return (element.id == fila)
      })
      return (queues_valid.length > 0)
    },
    async listarFilas () {
      try {
        const { data } = await ListarFilas()
        // Filtrar apenas departamentos ativos
        this.filas = data.filter(fila => fila.isActive === true)
        this.mensagemTransferencia = ''
        this.modalTransferirTicket = true
        this.listarUsuarios()
      } catch (error) {
        console.error(error)
        this.$notificarErro('Problema ao carregar filas', error)
      }
    },
    async listarUsuarios () {
      try {
        const { data } = await ListarUsuarios()
        this.usuarios = data.users
        this.modalTransferirTicket = true
      } catch (error) {
        console.error(error)
        this.$notificarErro('Problema ao carregar usuários', error)
      }
    },
    async confirmarTransferenciaTicket () {
      if (!this.filaSelecionada) return
      // if (!this.usuarioSelecionado) return
      console.log('usuario selecionado: ' + this.usuarioSelecionado)
      console.log('usuario atual do ticket: ' + this.ticketFocado.userId)
      if (this.ticketFocado.userId === this.usuarioSelecionado && this.ticketFocado.userId != null) {
        this.$q.notify({
          type: 'info',
          message: 'Ticket já pertece ao usuário selecionado.',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
        return
      }
      if (this.ticketFocado.userId === userId && userId === this.usuarioSelecionado) {
        this.$q.notify({
          type: 'info',
          message: 'Ticket já pertece ao seu usuário',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
        return
      }

      if (this.ticketFocado.queueId === this.filaSelecionada && this.ticketFocado.userId === this.usuarioSelecionado) {
        this.$q.notify({
          type: 'info',
          message: 'Ticket já pertece a esta fila e usuário',
          progress: true,
          actions: [{
            icon: 'close',
            round: true,
            color: 'white'
          }]
        })
        return
      }
      await AtualizarTicket(this.ticketFocado.id, {
        userId: this.usuarioSelecionado,
        queueId: this.filaSelecionada,
        status: 'pending',
        isTransference: 1,
        mensagemTransferencia: this.mensagemTransferencia || undefined
      })
      this.$q.notify({
        type: 'positive',
        message: 'Ticket transferido.',
        progress: true,
        actions: [{
          icon: 'close',
          round: true,
          color: 'white'
        }]
      })
      this.modalTransferirTicket = false
      this.mensagemTransferencia = ''
      this.$store.commit('TICKET_FOCADO', {})
    },
    // Métodos para modal de etiquetas
    async openTagModal () {
      try {
        await this.listarEtiquetas()
        this.tagModalVisible = true
        // Carregar apenas os IDs das etiquetas selecionadas (otimização)
        this.selectedTags = this.ticketFocado.contact.tags?.map(tag => tag.id) || []
      } catch (error) {
        this.$notificarErro('Erro ao carregar etiquetas', error)
      }
    },
    closeTagModal () {
      this.tagModalVisible = false
    },
    async saveTags () {
      try {
        await this.tagSelecionada(this.selectedTags)
        this.closeTagModal()
      } catch (error) {
        this.$notificarErro('Erro ao salvar etiquetas', error)
      }
    },
    async tagSelecionada (tags) {
      const { data } = await EditarEtiquetasContato(this.ticketFocado.contact.id, [...tags])
      // Atualiza tanto o ticket focado quanto a lista de tickets
      this.$store.commit('UPDATE_TICKET_FOCADO_CONTACT', data)
      this.$store.commit('UPDATE_CONTACT', data)

      // Atualizar ticket na paginação com as novas etiquetas
      this.updateTicketInPaginationWithContact(data)
    },
    updateTicketInPaginationWithContact (updatedContact) {
      // Verificar se ticketsPagination existe antes de tentar acessá-lo
      if (!this.ticketsPagination || typeof this.ticketsPagination !== 'object') {
        console.warn('ticketsPagination não está disponível no componente InforCabecalhoChat')
        return
      }

      // Atualizar ticket em todas as paginações onde ele possa estar
      Object.keys(this.ticketsPagination).forEach(statusKey => {
        const pagination = this.ticketsPagination[statusKey]
        if (pagination && pagination.tickets && Array.isArray(pagination.tickets)) {
          const ticketIndex = pagination.tickets.findIndex(t => t.contactId === updatedContact.id)

          if (ticketIndex !== -1) {
            // Atualizar contato do ticket
            this.$set(pagination.tickets[ticketIndex], 'contact', updatedContact)
            // Atualizar tags do ticket
            this.$set(pagination.tickets[ticketIndex], 'tags', updatedContact.tags || [])
          }
        }
      })
    },
    async listarEtiquetas () {
      const { data } = await ListarEtiquetas(true)
      this.etiquetas = data
    },
    // Métodos auxiliares para o design melhorado
    getSelectedTagsInfo () {
      return this.selectedTags.map(tagId =>
        this.etiquetas.find(tag => tag.id === tagId)
      ).filter(Boolean)
    },
    removeTag (tagToRemove) {
      this.selectedTags = this.selectedTags.filter(tagId => tagId !== tagToRemove.id)
    },
    // Métodos para editar contato
    editContact (contactId) {
      this.selectedContactId = contactId
      this.modalContato = true
    },
    contatoEditado (contato) {
      this.$store.commit('UPDATE_TICKET_FOCADO_CONTACT', contato)
    },
    // Função para formatar número do contato
    formatarNumeroContato (numero) {
      if (!numero) return ''

      // Remove caracteres não numéricos
      const numeroLimpo = numero.replace(/\D/g, '')

      // Se o número tem 12 dígitos (DDI + DDD + número)
      if (numeroLimpo.length === 12) {
        const ddi = numeroLimpo.slice(0, 2)
        const ddd = numeroLimpo.slice(2, 4)
        const parte1 = numeroLimpo.slice(4, 8)
        const parte2 = numeroLimpo.slice(8, 12)
        return `+${ddi} (${ddd}) ${parte1}-${parte2}`
      }

      // Se o número tem 11 dígitos (DDD + número)
      if (numeroLimpo.length === 11) {
        const ddd = numeroLimpo.slice(0, 2)
        const parte1 = numeroLimpo.slice(2, 7)
        const parte2 = numeroLimpo.slice(7, 11)
        return `(${ddd}) ${parte1}-${parte2}`
      }

      // Se o número tem 10 dígitos (DDD + número)
      if (numeroLimpo.length === 10) {
        const ddd = numeroLimpo.slice(0, 2)
        const parte1 = numeroLimpo.slice(2, 6)
        const parte2 = numeroLimpo.slice(6, 10)
        return `(${ddd}) ${parte1}-${parte2}`
      }

      // Retorna o número original se não conseguir formatar
      return numero
    },
    // Métodos para modal de outras informações
    abrirModalOutrasInformacoes () {
      this.modalOutrasInformacoes = true
    },
    fecharModalOutrasInformacoes () {
      this.modalOutrasInformacoes = false
    },
    // Método para fechar modal de transferência
    fecharModalTransferencia () {
      this.modalTransferirTicket = false
      this.mensagemTransferencia = ''
      this.usuarioSelecionado = null
      this.filaSelecionada = null
    },
    // Método para limpar usuário selecionado quando departamento for alterado
    limparUsuarioSelecionado () {
      this.usuarioSelecionado = null
    },
    // Método para sair do modo espiar
    sairModoEspiar () {
      this.$store.commit('SET_MODO_ESPIAR', false)
      this.$store.commit('TICKET_FOCADO', {})
      this.$router.push({ name: 'chat-empty' })
      this.$q.notify({
        message: 'Saiu do modo espiar',
        type: 'info',
        progress: true,
        position: 'top',
        actions: [{
          icon: 'close',
          round: true,
          color: 'white'
        }]
      })
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
        visitorUserName: 'Usuário que Acessou (Nome)'
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
      return value
    },
    // Métodos para modal de sigilo
    abrirModalSigilo () {
      this.modalSigilo = true
      this.senhaSigilo = ''
      this.isPwdSigilo = true
    },
    fecharModalSigilo () {
      this.modalSigilo = false
      this.senhaSigilo = ''
      this.$v.senhaSigilo.$reset()
    },
    async ativarSigilo () {
      this.$v.senhaSigilo.$touch()
      if (this.$v.senhaSigilo.$error) {
        return
      }
      this.loadingSigilo = true
      try {
        const { data } = await AtivarSigilo(this.ticketFocado.id, this.senhaSigilo)
        // Atualizar estado do ticket com sigilo ativo e permitir visualização
        this.$store.commit('SET_TICKET_CONFIDENTIAL', {
          ticketId: this.ticketFocado.id,
          isConfidential: true,
          confidentialUserId: data.confidentialUserId || userId,
          showConfidentialMessages: true
        })
        // Forçar recarregamento das mensagens para exibir as sigilosas
        await this.$store.dispatch('LocalizarMensagensTicket', {
          ticketId: this.ticketFocado.id,
          pageNumber: 1
        })
        this.$q.notify({
          type: 'positive',
          message: 'Sigilo ativado com sucesso!',
          progress: true,
          position: 'top',
          actions: [{ icon: 'close', round: true, color: 'white' }]
        })
        this.fecharModalSigilo()
      } catch (error) {
        console.error('Erro ao ativar sigilo:', error)
        const errorCode = error?.data?.error || error?.response?.data?.error
        // Não fazer logout para erros relacionados ao sigilo
        if (errorCode && ['ERR_CONFIDENTIAL_ALREADY_ACTIVE', 'ERR_NO_PERMISSION_CONFIDENTIAL', 'ERR_CONFIDENTIAL_NOT_ACTIVE', 'ERR_NO_PERMISSION_DEACTIVATE_CONFIDENTIAL', 'ERR_NO_PERMISSION_SHOW_CONFIDENTIAL'].includes(errorCode)) {
          this.$q.notify({
            type: 'warning',
            message: error?.data?.error || error?.response?.data?.error || 'Erro ao ativar sigilo',
            progress: true,
            position: 'top',
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })
        } else {
          this.$notificarErro('Erro ao ativar sigilo', error)
        }
      } finally {
        this.loadingSigilo = false
      }
    },
    async desativarSigilo () {
      this.$v.senhaSigilo.$touch()
      if (this.$v.senhaSigilo.$error) {
        return
      }
      this.loadingSigilo = true
      try {
        await DesativarSigilo(this.ticketFocado.id, this.senhaSigilo)
        // Atualizar estado do ticket desativando sigilo e ocultando mensagens sigilosas
        this.$store.commit('SET_TICKET_CONFIDENTIAL', {
          ticketId: this.ticketFocado.id,
          isConfidential: false,
          showConfidentialMessages: false
        })
        // Forçar recarregamento das mensagens para filtrar as sigilosas
        await this.$store.dispatch('LocalizarMensagensTicket', {
          ticketId: this.ticketFocado.id,
          pageNumber: 1
        })
        this.$q.notify({
          type: 'positive',
          message: 'Sigilo desativado com sucesso!',
          progress: true,
          position: 'top',
          actions: [{ icon: 'close', round: true, color: 'white' }]
        })
        this.fecharModalSigilo()
      } catch (error) {
        console.error('Erro ao desativar sigilo:', error)
        const errorCode = error?.data?.error || error?.response?.data?.error
        // Não fazer logout para erros relacionados ao sigilo
        if (errorCode && ['ERR_CONFIDENTIAL_ALREADY_ACTIVE', 'ERR_NO_PERMISSION_CONFIDENTIAL', 'ERR_CONFIDENTIAL_NOT_ACTIVE', 'ERR_NO_PERMISSION_DEACTIVATE_CONFIDENTIAL', 'ERR_NO_PERMISSION_SHOW_CONFIDENTIAL'].includes(errorCode)) {
          this.$q.notify({
            type: 'warning',
            message: error?.data?.error || error?.response?.data?.error || 'Erro ao desativar sigilo',
            progress: true,
            position: 'top',
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })
        } else {
          this.$notificarErro('Erro ao desativar sigilo', error)
        }
      } finally {
        this.loadingSigilo = false
      }
    },
    async exibirMensagensSigilosas () {
      this.$v.senhaSigilo.$touch()
      if (this.$v.senhaSigilo.$error) {
        return
      }
      this.loadingSigilo = true
      try {
        await ExibirMensagensSigilosas(this.ticketFocado.id, this.senhaSigilo)
        // Atualizar estado para permitir visualização das mensagens sigilosas
        this.$store.commit('SET_TICKET_CONFIDENTIAL', {
          ticketId: this.ticketFocado.id,
          showConfidentialMessages: true
        })
        // Forçar recarregamento das mensagens para exibir as sigilosas
        await this.$store.dispatch('LocalizarMensagensTicket', {
          ticketId: this.ticketFocado.id,
          pageNumber: 1
        })
        this.$q.notify({
          type: 'positive',
          message: 'Acesso às mensagens sigilosas concedido!',
          progress: true,
          position: 'top',
          actions: [{ icon: 'close', round: true, color: 'white' }]
        })
        this.fecharModalSigilo()
      } catch (error) {
        console.error('Erro ao exibir mensagens sigilosas:', error)
        const errorCode = error?.data?.error || error?.response?.data?.error
        // Não fazer logout para erros relacionados ao sigilo
        if (errorCode && ['ERR_CONFIDENTIAL_ALREADY_ACTIVE', 'ERR_NO_PERMISSION_CONFIDENTIAL', 'ERR_CONFIDENTIAL_NOT_ACTIVE', 'ERR_NO_PERMISSION_DEACTIVATE_CONFIDENTIAL', 'ERR_NO_PERMISSION_SHOW_CONFIDENTIAL'].includes(errorCode)) {
          this.$q.notify({
            type: 'warning',
            message: error?.data?.error || error?.response?.data?.error || 'Erro ao exibir mensagens sigilosas',
            progress: true,
            position: 'top',
            actions: [{ icon: 'close', round: true, color: 'white' }]
          })
        } else {
          this.$notificarErro('Erro ao exibir mensagens sigilosas', error)
        }
      } finally {
        this.loadingSigilo = false
      }
    }
  }
}
</script>

<style lang="sass" scoped>
#InfoCabecalhoChat
  .q-item__label + .q-item__label
    margin-top: 1.5px

.btn-rounded
  border-radius: 15px
</style>
<style scoped>
.modern-chat-header {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.client-name-container {
  padding-left: 4px;
  z-index: 1000;
  display: flex;
  gap: 4px;
  align-items: center;
}

.edit-button {
  font-size: 10px;
  color: #484848;
  z-index: 1000;
}

.name-skeleton {
  width: 230px !important;
  height: 24px !important;
  border-radius: 6px !important;
}

.info-tags-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.info-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 !important;
  font-size: 11px;
  font-weight: 400;
  color: #666;
  transition: all 0.2s ease;
  white-space: nowrap;
  max-width: fit-content;
  background: none !important;
  background-color: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.tag-icon {
  font-size: 12px !important;
  opacity: 0.7;
  color: #666;
}

.tag-label {
  font-weight: 400;
  text-overflow: ellipsis;
  overflow: hidden;
  color: #666;
}

.tag-skeleton {
  width: 120px !important;
  height: 22px !important;
  border-radius: 12px !important;
}

/* Remover background específico das tags individuais */
.telefone-tag,
.assigned-tag,
.ticket-tag {
  background: none !important;
  background-color: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* Responsividade */
@media (max-width: 500px) {
  .name-skeleton {
    width: 170px !important;
  }

  .info-tags-container {
    gap: 6px;
  }

  .info-tag {
    font-size: 10px;
    padding: 0;
  }

  .tag-icon {
    font-size: 12px !important;
  }

  .assigned-tag .tag-label {
    max-width: 120px;
  }
}

@media (max-width: 350px) {
  .info-tags-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

.info-tags-container {
  animation: slideInUp 0.3s ease-out 0.1s both;
}

.client-name {
  animation: slideInUp 0.3s ease-out both;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
