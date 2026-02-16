/**
 * URL do backend (API + Socket.IO).
 * Em dev, se o front estiver em 8080/3003, forçar backend em 3001 para evitar
 * requisições indo para o próprio servidor do front (404 / socket timeout).
 */
const DEFAULT_BACKEND = 'http://localhost:3001'

export function getApiBaseUrl () {
  if (typeof window === 'undefined') return (process.env.URL_API || '').trim() || DEFAULT_BACKEND
  const envUrl = (process.env.URL_API || '').trim()
  const onFrontPort = window.location.port === '8080' || window.location.port === '3003'
  if (onFrontPort && (!envUrl || envUrl.includes('8080') || envUrl.includes('3003'))) return DEFAULT_BACKEND
  return envUrl || DEFAULT_BACKEND
}
