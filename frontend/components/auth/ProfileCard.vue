<template>
  <v-card v-if="authStore.user" width="400">
    <v-card-title>
      Hi, {{ authStore.user.email }}
    </v-card-title>
    <v-card-text>
      <ActionCheckMe />
      <ActionSignOut class="mt-3" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
</script>
