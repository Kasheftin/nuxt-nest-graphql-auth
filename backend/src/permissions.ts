import { rule, shield } from 'graphql-shield'

export const isAuthenticated = rule({})(async (parent, args, context) => {
  return !!context.user
})

export const permissions = shield({
  Query: {
    me: isAuthenticated
  },
  Mutation: {
    signOut: isAuthenticated
  }
})
