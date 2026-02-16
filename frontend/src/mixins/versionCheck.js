import { ObterUltimaRelease, MarcarVersaoComoVista } from 'src/service/releases'

// Não usar versão do env/build - confiar apenas no que a API retorna
// A versão atual é determinada pela última versão vista pelo usuário

export default {
  data () {
    return {
      versionCheckInterval: null,
      updateModalVisible: false,
      latestRelease: null,
      checkingVersion: false,
      versionBeingShown: null // Versão que está sendo exibida no modal
    }
  },
  methods: {
    async verificarVersao () {
      // Evitar múltiplas verificações simultâneas
      if (this.checkingVersion) {
        return
      }

      try {
        this.checkingVersion = true

        const { data: release } = await ObterUltimaRelease()

        if (!release || !release.version) {
          return
        }

        // Verificar se havia uma versão sendo exibida antes do reload (sessionStorage)
        const versionShownBeforeReload = sessionStorage.getItem('version_modal_shown')

        // Se havia uma versão sendo exibida e a versão do servidor é a mesma,
        // significa que o usuário recarregou a página (Ctrl+F5) - marcar como vista automaticamente
        if (versionShownBeforeReload === release.version) {
          console.log('🔄 Página recarregada detectada - versão era:', versionShownBeforeReload)
          console.log('✅ Marcando versão como vista automaticamente após reload')
          // Marcar como vista no backend
          try {
            await MarcarVersaoComoVista(release.version)
            localStorage.setItem('last_seen_version', release.version)
            sessionStorage.removeItem('version_modal_shown')
            this.updateModalVisible = false
            this.latestRelease = null
            this.versionBeingShown = null
            return
          } catch (error) {
            console.error('❌ Erro ao marcar versão como vista após reload:', error)
            // Continuar com a verificação normal
          }
        }

        // Verificar se o usuário já viu esta versão (backend + localStorage como fallback)
        const lastSeenVersionLocal = localStorage.getItem('last_seen_version')
        // userHasSeenVersion vem do backend - se for true, usuário já viu
        const userHasSeenVersion = release.userHasSeenVersion === true

        console.log('🔍 Verificação de versão:', {
          versaoServidor: release.version,
          forceRefresh: release.forceRefresh,
          userHasSeenVersion: userHasSeenVersion,
          lastSeenLocal: lastSeenVersionLocal,
          versionShownBeforeReload: versionShownBeforeReload
        })

        // IMPORTANTE: Se o usuário já viu a versão, NÃO mostrar modal (mesmo com forceRefresh)
        // O forceRefresh só força atualização, mas não força mostrar o modal novamente se já foi visto
        if (userHasSeenVersion) {
          console.log('❌ Modal NÃO será exibido - usuário já viu esta versão (mesmo com forceRefresh)')
          this.updateModalVisible = false
          sessionStorage.removeItem('version_modal_shown')
          return
        }

        // Se o usuário ainda não viu esta versão, mostrar o modal
        const naoViuVersao = !userHasSeenVersion && lastSeenVersionLocal !== release.version

        console.log('🔍 Decisão de exibir modal:', {
          forceRefresh: release.forceRefresh,
          naoViuVersao: naoViuVersao,
          userHasSeenVersion: userHasSeenVersion,
          vaiExibir: naoViuVersao
        })

        if (naoViuVersao) {
          this.latestRelease = release
          this.versionBeingShown = release.version
          this.updateModalVisible = true
          // Salvar no sessionStorage que o modal está sendo exibido para esta versão
          sessionStorage.setItem('version_modal_shown', release.version)
          console.log('✅ Modal será exibido - usuário ainda não viu esta versão')
        } else {
          console.log('❌ Modal NÃO será exibido - usuário já viu esta versão')
          this.updateModalVisible = false
          sessionStorage.removeItem('version_modal_shown')
        }
      } catch (error) {
        console.error('Erro ao verificar versão:', error)
        // Não mostrar erro para o usuário, apenas logar
      } finally {
        this.checkingVersion = false
      }
    },
    iniciarVerificacaoVersao () {
      // Verificar imediatamente ao montar
      this.verificarVersao()

      // Verificar a cada 2 minutos (mais frequente para detectar atualizações rapidamente)
      this.versionCheckInterval = setInterval(() => {
        this.verificarVersao()
      }, 2 * 60 * 1000) // 2 minutos
    },
    pararVerificacaoVersao () {
      if (this.versionCheckInterval) {
        clearInterval(this.versionCheckInterval)
        this.versionCheckInterval = null
      }
    },
    async fecharModalAtualizacao () {
      // Se forceRefresh está ativado, não permitir fechar o modal
      if (this.latestRelease && this.latestRelease.forceRefresh) {
        console.log('Modal não pode ser fechado: forceRefresh está ativado')
        return
      }

      // Marcar versão como vista no backend
      if (this.latestRelease && this.latestRelease.version) {
        try {
          console.log('💾 Marcando versão como vista:', this.latestRelease.version)
          const response = await MarcarVersaoComoVista(this.latestRelease.version)
          console.log('✅ Versão marcada como vista no backend:', response.data)
          // Também salvar no localStorage como fallback
          localStorage.setItem('last_seen_version', this.latestRelease.version)
          // Remover do sessionStorage
          sessionStorage.removeItem('version_modal_shown')
        } catch (error) {
          console.error('❌ Erro ao marcar versão como vista:', error)
          // Em caso de erro, salvar apenas no localStorage
          localStorage.setItem('last_seen_version', this.latestRelease.version)
          sessionStorage.removeItem('version_modal_shown')
        }
      }

      this.updateModalVisible = false
      this.versionBeingShown = null
    }
  },
  mounted () {
    this.iniciarVerificacaoVersao()
  },
  beforeDestroy () {
    this.pararVerificacaoVersao()
  }
}
