<template>
  <v-app>
    <v-app-bar>
      <v-btn>Buggy Test Button</v-btn>
    </v-app-bar>
    <v-main>
      <v-container fluid class="pn-container">
        <AuthProfileCard v-if="authStore.user" />
        <AuthSigninForm v-else />
      </v-container>  
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
</script>

<style lang="sass">
.pn-container
  +pn-cover-image(url("@/assets/images/home.jpg"), 0.2, 0.1, 0.1)
  display: flex
  align-items: center
  justify-content: center
  height: 100%
  padding: $spacer * 4
</style>
