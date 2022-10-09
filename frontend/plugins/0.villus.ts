import { createClient, defaultPlugins } from 'villus'

const parseCookieHeader = (value?: string) => {
  return (value || '').split(';').reduce((out: Record<string, string>, part) => {
    const pair = part.split('=')
    if (pair[0] && pair[1]) {
      out[pair[0]] = pair[1]
    }
    return out
  }, {})
}

const addHeadersPlugin = (cookie: string) => (({ opContext }) => {
  opContext.credentials = 'include'
  const cookiesParsed = parseCookieHeader(cookie)
  if (cookiesParsed.jwt) {
    opContext.headers.Authorization = `Bearer ${cookiesParsed.jwt}`
  }
})

export default defineNuxtPlugin((nuxtApp) => {
  const client = createClient({
    url: nuxtApp.$config.baseUrl,
    use: [
      addHeadersPlugin(nuxtApp.ssrContext?.event?.req?.headers?.cookie),
      ...defaultPlugins()
    ]
  })
  nuxtApp.vueApp.use(client)
})
