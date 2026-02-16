<template>
    <q-dialog
      :value="showModal"
      @input="handleDialogInput"
      @hide="handleDialogHide"
      :persistent="!modoVisualizacao && forceRefresh"
      :no-escape-key="!modoVisualizacao && forceRefresh"
      :no-backdrop-dismiss="!modoVisualizacao && forceRefresh"
    >
    <q-card style="min-width: 500px; max-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Nova Atualização Disponível!</div>
        <q-space />
        <q-btn
          v-if="!forceRefresh || modoVisualizacao"
          icon="close"
          flat
          round
          dense
          v-close-popup
        />
      </q-card-section>

      <q-card-section>
        <div class="q-mb-md" v-if="release && release.version">
          <q-badge color="primary" class="q-mb-sm">
            Versão {{ release.version }}
          </q-badge>
        </div>

        <div class="text-h6 q-mb-sm" v-if="release && release.title">{{ release.title }}</div>

        <!-- Mídias (Imagens e Vídeos) -->
        <div v-if="release && release.media && release.media.length > 0" class="q-mb-md">
          <div class="row q-col-gutter-sm">
            <div
              v-for="(item, index) in release.media"
              :key="index"
              class="col-xs-12 col-sm-6"
            >
              <q-card>
                <q-img
                  v-if="item.type === 'image'"
                  :src="item.url"
                  :ratio="16/9"
                  style="max-height: 300px"
                  class="cursor-pointer"
                  @click="abrirImagem(item.url)"
                />
                <video
                  v-else-if="item.type === 'video'"
                  :src="item.url"
                  controls
                  style="width: 100%; max-height: 300px"
                />
              </q-card>
            </div>
          </div>
        </div>

        <div
          class="text-body2 q-mt-md markdown-content"
          v-if="release && release.description"
          v-html="formattedDescription"
        ></div>

        <q-separator class="q-my-md" />

        <div class="bg-blue-1 q-pa-md rounded-borders">
          <div class="text-body2 text-weight-medium q-mb-xs">
            <q-icon name="info" color="primary" class="q-mr-xs" />
            Como atualizar:
          </div>
          <div class="text-body2 q-pl-md">
            <ol class="q-mt-xs">
              <li>Pressione <strong>Ctrl + F5</strong> (Windows/Linux) ou <strong>Cmd + Shift + R</strong> (Mac) para forçar atualização</li>
              <li>Isso irá limpar o cache e carregar a versão mais recente</li>
              <li>Depois, clique no botão abaixo para confirmar</li>
            </ol>
          </div>
        </div>
      </q-card-section>

        <q-card-actions align="right">
        <q-btn
          v-if="modoVisualizacao"
          flat
          label="Fechar"
          color="grey"
          @click="fecharModal"
        />
        <template v-else>
          <q-btn
            v-if="!forceRefresh"
            flat
            label="Depois"
            color="grey"
            @click="fecharModal"
          />
          <q-btn
            label="EU Pressionei Ctrl+F5"
            color="primary"
            @click="confirmarAtualizacao"
            :loading="loading"
          />
        </template>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { MarcarVersaoComoVista } from 'src/service/releases'
import { marked } from 'marked'

export default {
  name: 'ModalAtualizacao',
  props: {
    showModal: {
      type: Boolean,
      default: false
    },
    release: {
      type: Object,
      default: () => ({
        version: '',
        title: '',
        description: '',
        forceRefresh: false,
        media: []
      })
    },
    modoVisualizacao: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      loading: false
    }
  },
  computed: {
    forceRefresh () {
      return (this.release && this.release.forceRefresh) || false
    },
    formattedDescription () {
      if (!this.release || !this.release.description) {
        return ''
      }

      const description = this.release.description

      // Se já é HTML (contém tags HTML), retorna como está
      if (/<[a-z][\s\S]*>/i.test(description)) {
        return description
      }

      // Se é Markdown, converte para HTML
      try {
        return marked(description, {
          breaks: true, // Converte quebras de linha em <br>
          gfm: true // Suporta GitHub Flavored Markdown
        })
      } catch (error) {
        console.error('Erro ao converter markdown:', error)
        // Em caso de erro, retorna o texto original escapado
        return description.replace(/\n/g, '<br>')
      }
    }
  },
  methods: {
    handleDialogInput (value) {
      // Quando o dialog muda de estado (aberto/fechado)
      if (!value) {
        // Se está fechando, emitir evento close
        this.$emit('close')
      }
    },
    handleDialogHide () {
      // Quando o dialog é escondido (fechado)
      this.$emit('close')
    },
    abrirImagem (url) {
      // Abrir imagem em uma nova janela/tab
      window.open(url, '_blank')
    },
    async fecharModal () {
      // Se forceRefresh está ativado e não é modo visualização, não permitir fechar
      if (this.forceRefresh && !this.modoVisualizacao) {
        return
      }

      // Se não é modo visualização, salvar que o usuário viu esta versão no backend
      if (!this.modoVisualizacao && this.release.version) {
        try {
          console.log('💾 [Modal] Marcando versão como vista:', this.release.version)
          const response = await MarcarVersaoComoVista(this.release.version)
          console.log('✅ [Modal] Versão marcada como vista:', response.data)
          // Também salvar no localStorage como fallback
          localStorage.setItem('last_seen_version', this.release.version)
        } catch (error) {
          console.error('❌ [Modal] Erro ao marcar versão como vista:', error)
          // Em caso de erro, salvar apenas no localStorage
          localStorage.setItem('last_seen_version', this.release.version)
        }
      }
      this.$emit('close')
    },
    async confirmarAtualizacao () {
      // Verificar se o usuário realmente pressionou Ctrl+F5
      // Como não podemos detectar isso diretamente, apenas confirmamos
      // e salvamos que o usuário viu esta versão
      this.loading = true

      // Salvar que o usuário viu esta versão no backend
      if (this.release.version) {
        try {
          console.log('💾 [Modal Confirmar] Marcando versão como vista:', this.release.version)
          const response = await MarcarVersaoComoVista(this.release.version)
          console.log('✅ [Modal Confirmar] Versão marcada como vista:', response.data)
          // Também salvar no localStorage como fallback
          localStorage.setItem('last_seen_version', this.release.version)
        } catch (error) {
          console.error('❌ [Modal Confirmar] Erro ao marcar versão como vista:', error)
          // Em caso de erro, salvar apenas no localStorage
          localStorage.setItem('last_seen_version', this.release.version)
        }
      }

      // Fechar o modal
      this.$emit('close')

      // Mostrar mensagem informativa
      this.$q.notify({
        type: 'info',
        message: 'Se você pressionou Ctrl+F5, a página deve ter recarregado. Se não, pressione Ctrl+F5 agora.',
        position: 'top',
        timeout: 5000
      })

      this.loading = false
    }
  }
}
</script>

<style scoped>
ol {
  margin: 0;
  padding-left: 20px;
}
ol li {
  margin-bottom: 4px;
}

/* Estilos para conteúdo Markdown */
.markdown-content {
  line-height: 1.6;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

.markdown-content h1 {
  font-size: 1.5em;
}

.markdown-content h2 {
  font-size: 1.3em;
}

.markdown-content h3 {
  font-size: 1.1em;
}

.markdown-content p {
  margin-bottom: 1em;
}

.markdown-content ul,
.markdown-content ol {
  margin-left: 1.5em;
  margin-bottom: 1em;
}

.markdown-content li {
  margin-bottom: 0.5em;
}

.markdown-content code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.markdown-content pre code {
  background-color: transparent;
  padding: 0;
}

.markdown-content blockquote {
  border-left: 4px solid #ccc;
  margin-left: 0;
  padding-left: 1em;
  color: #666;
  font-style: italic;
}

.markdown-content a {
  color: #1976d2;
  text-decoration: underline;
}

.markdown-content strong {
  font-weight: bold;
}

.markdown-content em {
  font-style: italic;
}
</style>
