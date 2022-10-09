// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  css: ['vuetify/lib/styles/main.sass'],  
  build: {
    transpile: ['vuetify']
  },
  modules: ['@pinia/nuxt'],
  vite: {
    css: {
      preprocessorOptions: {
        sass: {
          additionalData: '@use "@/assets/styles/variables.sass" as *' + "\n"
        }
      }
    }
  },
  components: true,
  runtimeConfig: {
    public: {
      baseUrl: process.env.BASE_URL
    }
  }
})
