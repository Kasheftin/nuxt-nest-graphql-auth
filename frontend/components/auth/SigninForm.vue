<template>
  <v-card width="400">
    <v-card-title>
      You are not authenticated 
    </v-card-title>
    <v-card-text>
      <v-form @submit.prevent="execute({ data: form })">
        <v-alert v-if="error" type="error" class="mb-6">
          {{ error }}
        </v-alert>
        <v-text-field
          v-model="form.email"
          label="Email"
        />
        <v-text-field
          v-model="form.password"
          label="Password"
          type="password"
        />
        <v-btn
          :loading="isFetching"
          type="submit"
          color="blue"
          block
          class="my-3"
        >
          Sign In
        </v-btn>
        <ActionCheckMe />
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useMutation } from 'villus'
import { SigninDocument } from '@/api/generated/types'
import { useAuthStore } from '@/stores/auth'

const { data, execute, isFetching, error } = useMutation(SigninDocument)
const form = reactive({
  email: '',
  password: ''
})

const authStore = useAuthStore()

watchEffect(() => {
  authStore.user = data.value?.signin || null
})

</script>
