<template>
  <div class="text-caption text-center bg-grey-1 q-pa-sm">
    Versão Sistema:
    <q-badge
      align="middle"
      color="primary"
      class="cursor-pointer"
      @click="abrirPublicacoes"
    >
      v{{ latestVersion || currentVersion }}
      <q-tooltip>Clique para ver publicações recentes</q-tooltip>
    </q-badge>
  </div>
</template>
<script>
import packageEnv from 'src/../package.json'
import { ObterUltimaRelease } from 'src/service/releases'

export default {
  name: 'SystemVersion',
  data () {
    return {
      latestVersion: null,
      currentVersion: packageEnv.version || '1.0'
    }
  },
  mounted () {
    this.buscarVersaoMaisRecente()
  },
  methods: {
    async buscarVersaoMaisRecente () {
      try {
        const { data: release } = await ObterUltimaRelease()
        if (release && release.version) {
          this.latestVersion = release.version
        }
      } catch (error) {
        console.error('Erro ao buscar versão mais recente:', error)
        // Em caso de erro, usar a versão atual do package.json
      }
    },
    abrirPublicacoes () {
      // Navegar para a tela de publicações recentes (releases)
      this.$router.push({ name: 'releases' })
    }
  }
}
</script>
<style>

</style>
