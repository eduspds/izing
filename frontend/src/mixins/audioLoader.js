// Mixin para carregar áudios evitando OpaqueResponseBlocking
export default {
  data () {
    return {
      audioBlobs: {} // Cache de áudios carregados como blob URLs
    }
  },
  methods: {
    async loadAudioAsBlob (mediaUrl) {
      // Se já está no cache, retornar
      if (this.audioBlobs[mediaUrl]) {
        return this.audioBlobs[mediaUrl]
      }

      try {
        // Fazer fetch com mode: 'cors'
        const response = await fetch(mediaUrl, {
          mode: 'cors',
          credentials: 'omit'
        })

        if (!response.ok) {
          console.error(`Erro ao carregar áudio: ${response.status}`)
          return mediaUrl // Fallback para URL original
        }

        // Converter para blob
        const blob = await response.blob()

        // Criar URL do blob
        const blobUrl = URL.createObjectURL(blob)

        // Guardar no cache
        this.audioBlobs[mediaUrl] = blobUrl

        return blobUrl
      } catch (error) {
        console.error('Erro ao carregar áudio:', error)
        return mediaUrl // Fallback para URL original
      }
    },

    getAudioUrl (mediaUrl) {
      // Se já tem no cache, retornar blob URL
      if (this.audioBlobs[mediaUrl]) {
        return this.audioBlobs[mediaUrl]
      }

      // Senão, carregar async e retornar URL original temporariamente
      this.loadAudioAsBlob(mediaUrl)
      return mediaUrl
    }
  },

  beforeDestroy () {
    // Limpar blob URLs ao destruir componente para liberar memória
    Object.values(this.audioBlobs).forEach(blobUrl => {
      URL.revokeObjectURL(blobUrl)
    })
    this.audioBlobs = {}
  }
}
