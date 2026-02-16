import axios from 'axios'
import Router from '../router/index'

import loading from 'src/utils/loading'
import { Notify } from 'quasar'

import backendErrors from './erros'
import { RefreshToken } from './login'

import { getApiBaseUrl } from 'src/config/apiUrl'
const apiBaseUrl = getApiBaseUrl()
if (typeof window !== 'undefined') console.info('[Cognos] API base URL:', apiBaseUrl)
const service = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000, // 10 segundos para dar mais tempo
  withCredentials: true
})

const handlerError = err => {
  const errorMsg = err?.response?.data?.error
  let error = 'Ocorreu um erro não identificado.'
  if (errorMsg) {
    if (backendErrors[errorMsg]) {
      error = backendErrors[errorMsg]
    } else {
      error = err.response.data.error
    }
  }
  Notify.create({
    position: 'top',
    type: 'negative',
    html: true,
    progress: true,
    message: error
  })
}

// const tokenInicial = url => {
//   const paths = [
//     '/login/'
//   ]
//   let is_init = false
//   paths.forEach(path => {
//     url.indexOf(path) !== -1 ? is_init = true : is_init = false
//   })
//   return is_init
// }

service.interceptors.request.use(
  config => {
    try {
      if (config.loading) {
        loading.show(config.loading)
      }
    } catch (error) {

    }

    // let url = config.url
    // const r = new RegExp('id_conta_cliente', 'g')
    // url = url.replace(r, id_conta_cliente)
    // const u = new RegExp('id_unidade_negocio', 'g')
    // config.url = url.replace(u, id_unidade_negocio)
    try {
      const tokenItem = localStorage.getItem('token')
      if (tokenItem) {
        const tokenAuth = JSON.parse(tokenItem)
        if (tokenAuth) {
          const token = 'Bearer ' + tokenAuth
          config.headers.Authorization = token
        }
      }
    } catch (e) {
      // Se houver erro ao ler o token, continuar sem ele (útil para login)
      console.warn('Erro ao ler token do localStorage:', e)
    }
    return config
  },
  error => {
    // handlerError(error)
    Promise.reject(error)
  }
)

service.interceptors.response.use(
  response => {
    loading.hide(response.config)
    const res = response
    const status = res.status
    if (status.toString().substr(0, 1) !== '2') {
      // handlerError(res)
      return Promise.reject('error')
    } else {
      return response
    }
  },
  error => {
    loading.hide(error.config)
    const errorCode = error?.response?.data?.error
    const isConfidentialError = errorCode && [
      'ERR_CONFIDENTIAL_ALREADY_ACTIVE',
      'ERR_NO_PERMISSION_CONFIDENTIAL',
      'ERR_CONFIDENTIAL_NOT_ACTIVE',
      'ERR_NO_PERMISSION_DEACTIVATE_CONFIDENTIAL',
      'ERR_NO_PERMISSION_SHOW_CONFIDENTIAL',
      'ERR_TICKET_CONFIDENTIAL_IN_USE'
    ].includes(errorCode)

    // Não fazer refresh token ou logout para erros relacionados ao sigilo ou 403 em geral
    // Erros 403 são de permissão, não de autenticação, então não devem causar logout
    if (error?.response?.status === 403 && !error.config._retry && !isConfidentialError) {
      error.config._retry = true
      return RefreshToken().then(res => {
        if (res && res.data && res.data.token) {
          localStorage.setItem('token', JSON.stringify(res.data.token))
          // Retry a requisição original com o novo token
          const token = 'Bearer ' + res.data.token
          error.config.headers.Authorization = token
          return service.request(error.config)
        }
        return Promise.reject(error.response || error)
      }).catch(() => {
        // Se o refresh token falhar, rejeitar com o erro original
        return Promise.reject(error.response || error)
      })
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('profile')
      localStorage.removeItem('userId')
      if (error.config.url.indexOf('logout') === -1) {
        handlerError(error)
        setTimeout(() => {
          Router.push({
            name: 'login'
          })
        }, 2000)
      }
    } else if (error.response && error.response.status === 500) {
      handlerError(error)
    } else if (error.response && error.response.status === 403) {
      // Erros 403 são de permissão, mostrar mensagem amigável sem fazer logout
      // Mas não mostrar para endpoints públicos que podem falhar silenciosamente
      const url = error?.config?.url || ''
      const isPublicEndpoint = url.includes('/public/')

      // Se for endpoint público, não mostrar erro (pode ser autenticação opcional)
      if (isPublicEndpoint) {
        // Apenas logar o erro, não mostrar notificação
        console.warn('Erro 403 em endpoint público (pode ser esperado):', url)
        return Promise.reject(error.response || error || new Error('Erro desconhecido na requisição'))
      }

      const errorMsg = error?.response?.data?.error
      let errorMessage = 'Você não tem permissão para acessar este recurso.'
      if (errorMsg && backendErrors[errorMsg]) {
        errorMessage = backendErrors[errorMsg]
      }
      Notify.create({
        position: 'top',
        type: 'warning',
        html: true,
        progress: true,
        message: errorMessage,
        timeout: 5000
      })
    } else if (error.message.indexOf('timeout') > -1) {
      Notify.create({
        message: 'Processando informações de estatisticas',
        position: 'top',
        type: 'positive',
        progress: true,
        html: true
      })
    } else {
      // handlerError(error)
    }
    // Garantir que sempre retornamos um erro válido
    return Promise.reject(error.response || error || new Error('Erro desconhecido na requisição'))
  }
)

export default service
