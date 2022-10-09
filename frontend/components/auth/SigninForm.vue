<template>
  <v-card width="400">
    <v-card-text>
      <h1 class="text-h5 mb-3">
Nuxt.JS / Nest.JS / GraphQL Authentication from scratch demo
      </h1>
      <p class="mb-3">
The article is published on 
<a href="https://teamhood.com/engineering/nuxt3-nest-graphql-authentication-from-scratch/" target="_blank">
  https://teamhood.com/engineering/nuxt3-nest-graphql-authentication-from-scratch/
</a>
      </p>
      <p class="mb-3">
Source code is available on
<a href="https://github.com/Kasheftin/nuxt-nest-graphql-auth" target="_blank">
  https://github.com/Kasheftin/nuxt-nest-graphql-auth
</a>
      </p>
      <p class="mb-3">
To check if the demo is working use (email: test@test.com, password: 123) credentials or go to
<a href="https://nuxt-nest-graphql-auth.rag.lt/graphql" target="_blank">GraphQL Playground</a> and create a new user there.
      </p>
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
