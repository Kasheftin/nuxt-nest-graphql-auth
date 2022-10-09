import { useQuery } from 'villus'
import { useAuthStore } from '@/stores/auth'
import { MeDocument } from '@/api/generated/types'

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  const { data, error } = await useQuery({ query: MeDocument })
  if (!error.value) {
    authStore.user = data.value.me
  }
})
