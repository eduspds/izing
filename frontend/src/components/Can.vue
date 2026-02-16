<template>
  <span v-if="allowed">
    <slot />
  </span>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'Can',
  props: {
    permission: {
      type: String,
      required: true
    }
  },
  computed: {
    ...mapGetters(['can']),
    allowed () {
      return this.can(this.permission)
    }
  }
}
</script>
