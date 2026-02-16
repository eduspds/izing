// import { Notify } from 'quasar'
// import $router from 'src/router'
// import { orderBy } from 'lodash'
// import { parseISO } from 'date-fns'

const Notifications = {
  state: {
    notifications: [],
    notifications_p: []
  },
  mutations: {
    // OK
    UPDATE_NOTIFICATIONS (state, payload) {
      state.notifications = payload
    },
    UPDATE_NOTIFICATIONS_P (state, payload) {
      state.notifications_p = payload
    },
    // Incrementar contador de notificações de mensagens não lidas (status: open)
    INCREMENT_NOTIFICATION_COUNT (state) {
      if (state.notifications && state.notifications.countOpen !== undefined) {
        state.notifications.countOpen++
      }
    },
    // Incrementar contador de notificações pendentes (status: pending)
    INCREMENT_NOTIFICATION_PENDING_COUNT (state) {
      if (state.notifications_p && state.notifications_p.countPending !== undefined) {
        state.notifications_p.countPending++
      }
    },
    // Decrementar contador de notificações de mensagens não lidas
    DECREMENT_NOTIFICATION_COUNT (state) {
      if (state.notifications && state.notifications.countOpen !== undefined && state.notifications.countOpen > 0) {
        state.notifications.countOpen--
      }
    },
    // Decrementar contador de notificações pendentes
    DECREMENT_NOTIFICATION_PENDING_COUNT (state) {
      if (state.notifications_p && state.notifications_p.countPending !== undefined && state.notifications_p.countPending > 0) {
        state.notifications_p.countPending--
      }
    }
  }
}

export default Notifications
