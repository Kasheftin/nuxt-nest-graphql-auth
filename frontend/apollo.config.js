module.exports = {
  client: {
    service: {
      name: 'nuxt-nest-backend',
      url: 'http://localhost:3001/graphql'
    },
    includes: ['api/queries/*.gql']
  }
}
