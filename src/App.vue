<template>
  <div id="app">
    <MapView />
  </div>
</template>

<script>
import MapView from './components/MapView.vue'

export default {
  name: 'App',
  components: {
    MapView,
  },
}
</script>

<style>
#app {
  height: 100%;
  width: 100%;
}
</style>
