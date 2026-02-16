import { orderBy } from 'lodash'
import { parseISO } from 'date-fns'

const orderTickets = (tickets) => {
  const newOrder = orderBy(tickets, (obj) => parseISO(obj.updatedAt), ['desc'])
  return newOrder
}

const getters = {
  notifications: state => state.notifications.notifications,
  notifications_p: state => state.notifications.notifications_p,
  tickets: state => orderTickets(state.atendimentoTicket.tickets),
  mensagensTicket: state => state.atendimentoTicket.mensagens,
  ticketFocado: state => state.atendimentoTicket.ticketFocado,
  hasMore: state => state.atendimentoTicket.hasMore,
  whatsapps: state => state.whatsapp.whatsApps,
  isSuporte: state => state.user.isSuporte,
  isAdmin: state => state.user.isAdmin,
  isManager: state => state.user.isManager,
  modoEspiar: state => state.atendimentoTicket.modoEspiar,
  can: (state, getters) => (permissionName) => getters['permissions/can'](permissionName),
  permissionsLoaded: state => !!(state.permissions && state.permissions.loaded)
}
export default getters
