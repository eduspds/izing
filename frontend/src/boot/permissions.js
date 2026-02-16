/**
 * Diretiva v-can: exibe o elemento apenas se o usuário tiver a permissão.
 * Uso: v-can="'tags-access'" ou v-can="permissionName"
 */
export default ({ Vue }) => {
  Vue.directive('can', {
    inserted (el, binding, vnode) {
      const permission = binding.value
      if (!permission) return
      const store = vnode.context?.$store
      if (!store) return
      const can = store.getters.can(permission)
      if (!can) {
        el.style.display = 'none'
      }
    },
    update (el, binding, vnode) {
      const permission = binding.value
      if (!permission) return
      const store = vnode.context?.$store
      if (!store) return
      const can = store.getters.can(permission)
      el.style.display = can ? '' : 'none'
    }
  })
}
