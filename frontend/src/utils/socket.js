// cliente -> socket.js
import { io } from 'socket.io-client'
import { getApiBaseUrl } from 'src/config/apiUrl'

class SocketManager {
  constructor () {
    this.socket = null
    this.connectionAttempts = 0
    this.maxConnectionAttempts = 3
    this.isInitialized = false
  }

  initialize () {
    if (this.isInitialized) {
      console.warn('Socket já inicializado, ignorando nova inicialização')
      return this.socket
    }

    const tokenItem = localStorage.getItem('token')
    const token = tokenItem ? JSON.parse(tokenItem) : null

    const apiUrl = getApiBaseUrl()
    this.socket = io(apiUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      transports: ['websocket'],
      auth: {
        token: token
      }
    })

    this.setupEventListeners()
    this.isInitialized = true
    this.connectionAttempts = 0

    return this.socket
  }

  setupEventListeners () {
    if (!this.socket) return

    this.socket.io.on('error', (error) => {
      console.error('🔌 Socket connection error:', error)
      this.connectionAttempts++

      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.warn('🔌 Máximo de tentativas de conexão atingido')
      }
    })

    this.socket.on('connect', () => {
      console.info('🔌 Socket conectado com sucesso')
      this.connectionAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.info('🔌 Socket desconectado:', reason)

      // Reconectar apenas para certos tipos de disconnect
      if (reason === 'io server disconnect') {
        console.info('🔌 Reconectando manualmente...')
        setTimeout(() => {
          this.socket.connect()
        }, 2000)
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Erro de conexão:', error)
      this.connectionAttempts++
    })

    // Log para debug de múltiplas instâncias
    this.socket.on('connect', () => {
      console.log('🔌 Socket ID:', this.socket.id, '| Conectado em:', new Date().toISOString())
    })
  }

  getSocket () {
    if (!this.socket) {
      console.warn('🔌 Socket não inicializado. Chamando initialize()...')
      return this.initialize()
    }
    return this.socket
  }

  disconnect () {
    if (this.socket) {
      console.info('🔌 Desconectando socket...')
      this.socket.disconnect()
      this.socket = null
      this.isInitialized = false
    }
  }

  reinitialize () {
    console.info('🔌 Reinicializando socket com novo token...')
    this.disconnect()
    this.isInitialized = false
    return this.initialize()
  }

  // ✅ Singleton pattern
  static getInstance () {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager()
    }
    return SocketManager.instance
  }
}

// ✅ Exportar instância única
const socketManager = SocketManager.getInstance()

// ✅ Exportar função de conveniência
export const getSocket = () => {
  return socketManager.getSocket()
}

// ✅ Exportar função para reinicializar
export const reinitializeSocket = () => {
  return socketManager.reinitialize()
}

// ✅ Exportar para uso em componentes React
export default socketManager
