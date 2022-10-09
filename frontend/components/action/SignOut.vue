<template>
  <v-btn :loading="isFetching" color="blue" block @click="execute">
    {{ label }}
  </v-btn>
</template>

<script setup lang="ts">
import { useMutation } from 'villus'
import { SignOutDocument } from '@/api/generated/types'
import { useAuthStore } from '@/stores/auth'

defineProps({
  label: {
    type: String,
    default: 'Sign Out'
  }
})

const { error, execute, isFetching, isDone } = useMutation(SignOutDocument)

const authStore = useAuthStore()
watchEffect(() => {
  if (!error.value && isDone.value) {
    authStore.user = null
  }
})
</script>
