<template>
  <v-btn :loading="isFetching" block color="green" @click="checkMe">
    {{ label }}
  </v-btn>
  <client-only>
    <v-dialog
      v-model="isResultOpened"
      :width="400"
    >
      <v-card>
        <v-card-title>
          Check Me Result:
        </v-card-title>
        <v-card-text>
          <v-alert
            :type="error ? 'error' : 'info'"
          >
            {{ error || info }}
          </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
  </client-only>
</template>

<script setup lang="ts">
import { useQuery } from 'villus'
import { MeDocument } from '@/api/generated/types'

defineProps({
  label: {
    type: String,
    default: 'Check Me'
  }
})

const { data, error, execute, isFetching } = useQuery({ 
  query: MeDocument, 
  fetchOnMount: false,
  cachePolicy: 'network-only'
})

const isResultOpened = ref(false)

const info = computed(() => {
  if (!error.value && data.value) {
    return `Success: signed in as ${data.value.me.email}`
  }
}) 

const checkMe = async () => {
  await execute()
  isResultOpened.value = true
}

</script>
