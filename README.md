# Nuxt3/Nest/GraphQL authentication from scratch

We are building full-stack Nuxt.JS/Nest.JS/GraphQL application with authentication, http-only cookies and permissions.

## 0. The Stack

- **Back-End**
  - **Nest.js** *(The most advanced Node.js framework + DTO and class-validator)*
  - **Prisma** *(TypeScript ORM, MySQL is in use)*
  - **GraphQL** *(We are using code-first approach)*
- **Front-End**
  - **Nuxt.js v3** *(Vue.js framework with SSR support out of the box + Vite, Pinia, Composition API and 100% TypeScript)*
  - **Vuetify v3** *(Material design framework, still in beta but usable)* 
  - **GraphQL/Codegen** *(Generating TypeScript for our graphql schema)*
  - **Villus** *(A nice GraphQL client for Vue.js)*
- **VSCode extensions**
  - **Volar** *(Vetur must be turned off)*
  - **Apollo GraphQL** *(For syntax autocomplete)*
  - **Prisma** *(Working with schema.prisma files)*

## 1. Back-End Setup
During the development the application will connect to the locally running MySQL `nest-nuxt-auth` database, the back-end will run on `localhost:3001`, and the front-end on `localhost:3000`.

````
$ npm i -g @nestjs/cli
$ nest new backend
$ cd backend
````

Here's the all `.env` configuration we need (it must be added to .gitignore):

````
PORT=3001
DATABASE_URL=mysql://nest-nuxt-auth:randompassword@localhost:3306/nest-nuxt-auth
JWT=randomsecurestring
````

We also use some utility and validation libraries:
````
$ npm i --save cookie-parser @types/cookie-parser
$ npm i --save class-validator class-transformer 
````

That's how our `src/main.ts` entry file looks like:

````typescript
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true
    })
  )
  await app.listen(process.env.port || 3001)
}
bootstrap()
````

On this stage we should get a successfully running hello-world application on `http://localhost:3001` 

## 2. Prisma

Prisma is a great ORM which connects to the database and allows using TypeScript classes instead of writing raw sql queries.

````
$ npm i --save prisma nestjs-prisma
$ npx prisma init --datasource-provider mysql
````


A significant caveat with the modern development is that almost every tool uses it's own language. Prisma uses it's schema files that needs to be translated to TypeScript. GraphQL uses it's own schema which also requires translation to TypeScript. 

Let's append `prisma/schema.prisma` with the user model:

````
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  user
  banned
  admin
}

model User {
  id                      Int                @id @default(autoincrement())
  email                   String             @unique(map: "email") @db.VarChar(255)
  password                String             @db.VarChar(255)
  status                  UserStatus
}
````

After that we should be able to create a migration and tables in database using
````
$ prisma migrate dev --name user-init
````

## 3. GraphQL Hello World
We are using code-first approach meaning `src/schema.gql` will be auto-generated based on the TypeScript models. We need:
````
$ npm i --save @nestjs/graphql @nestjs/apollo apollo-server-express
$ npm i --save bcrypt @types/bcrypt
````

Here's the user model (`src/models/user.model.ts`): 

````typescript
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql'
import { UserStatus } from '@prisma/client'

registerEnumType(UserStatus, {
  name: 'UserStatus'
})

@ObjectType()
export class User {
  @Field(() => ID)
  id: number

  @Field()
  email: string

  @Field(() => UserStatus)
  status: UserStatus
}
````
Notice we don't define `password` field because we don't want it to be exposed by the GraphQL API.

The core concept of GraphQL is resolver. This is the entry point which defines what queries are supported and how to provide the data for every field. We start with the `allUsers` query and `createUser` mutation and use it to create some demo users in database. We need to create `src/auth` module with `auth.module.ts`, `auth.resolver.ts` and `auth.service.ts`. It's a common practice to use DTO as well:

`src/auth/dto/createUser.dto.ts`:
````typescript
import { Field, InputType } from '@nestjs/graphql'
import { UserStatus } from '@prisma/client'
import { MaxLength, IsEmail } from 'class-validator'

@InputType()
export class CreateUserDto {
  @Field()
  @MaxLength(255)
  @IsEmail()
  email: string

  @Field()
  @MaxLength(255)
  password: string

  @Field(() => UserStatus)
  status: UserStatus
}
````

`src/auth/auth.module.ts`:
````typescript
import { Module } from '@nestjs/common'
import { AuthResolver } from './auth.resolver'
import { AuthService } from './auth.service'

@Module({
  providers: [AuthResolver, AuthService],
  exports: [AuthService]
})
export class AuthModule {}
````

`src/auth/auth.resolver.ts`:
````typescript
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'
import { User } from '@/models/user.model'
import { AuthService } from './auth.service'
import { CreateUserDto } from './dto/createUser.dto'

@Resolver(() => User)
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Query(() => [User])
  allUsers(): Promise<User[]> {
    return this.authService.getAllUsers()
  }

  @Mutation(() => User)
  createUser(@Args('data') data: CreateUserDto): Promise<User> {
    return this.authService.createUser(data)
  }
}
````

`src/auth/auth.service.ts`:
````typescript
import { PrismaService } from 'nestjs-prisma'
import { Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { CreateUserDto } from './dto/createUser.dto'

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  getAllUsers(): Promise<User[]> {
    return this.prisma.user.findMany()
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const password = await bcrypt.hash(data.password, 10)
    return this.prisma.user.create({
      data: {
        email: data.email,
        password,
        status: data.status
      }
    })
  }
}
````

An essential thing to understand is how models correspond to each other. We defined user model twice: in prisma and in graphql. Hence, we have two classes - prisma user and graphql user. Service retrieves data from prisma, it returns prisma user. Resolver gets prisma user and presents it as graphql user. It works because in this particular case our users are compatible, but in general resolver should create a new graphql entity based on the received orm entity.

To wire things up we need to update `src/app.module`:

````typescript
import { Module } from '@nestjs/common'
import { PrismaModule } from 'nestjs-prisma'
import { GraphQLModule } from '@nestjs/graphql'
import { join } from 'path/posix'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { AuthModule } from '@/auth/auth.module'
import { AuthService } from '@/auth/auth.service'

@Module({
  imports: [
    AuthModule,
    PrismaModule.forRoot({
      isGlobal: true
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule],
      inject: [AuthService],
      useFactory: (authService: AuthService) => ({
        playground: true,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        cors: {
          origin: 'http://localhost:3000',
          credentials: true
        },
        context: async options => {
          // Later we'll load user to the context based on jwt cookie
          // const user = await runAuthMiddleware(authService, options)
          // return { req: options.req, user }
        }
      })
    })
  ]
})
export class AppModule {}
````

At this point we should be able to start dev server (`npm run start:dev`) and use [http://localhost:3001/graphql](http://localhost:3001/graphql) to create and read some dummy users:

![GraphQL Playground createUser](images/01-graphql-playground-create-user.gif)

## 4. Back-End Authentication

We need to implement sign in and sign out mutations as well as `me` query which is going to return currently signed in user. The import section of `src/auth/auth.module.ts` has to be updated with registering JWT module:

````typescript
import { JwtModule } from '@nestjs/jwt'
...
imports: [JwtModule.register({ secret: process.env.JWT })]
````

This allows to create a signed JWT token when a user successfully signs in in `src/auth/auth.service.ts`:

````typescript
async signin(data: SigninDto): Promise<{ user: User; token: string }> {
  const user = await this.prisma.user.findUnique({ where: { email: data.email } })
  if (user) {
    const passwordIsCorrect = await bcrypt.compare(data.password, user.password)
    if (passwordIsCorrect) {
      const token = this.jwtService.sign({ sub: user.id }, { expiresIn: '30 days' })
      return { user, token }
    }
  }
  throw new Error('Email or password is incorrect')
}

async me(token: string): Promise<User | null> {
  if (token) {
    const data = this.jwtService.decode(token, { json: true }) as { sub: unknown }
    if (data?.sub && !isNaN(Number(data.sub))) {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(data.sub) } 
      })
      return user || null
    }
  }
  return null
}
````

Notice we don't use refresh token technique. It's quite secure to store one long-lived token as http-only cookie instead. 

We need to be able to write cookies from GraphQL resolver, that's why current request object has to be put to GraphQL context. The result of `authMiddleware` (currently signed in user) has to be put to the context as well, here's the updated `src/app.module.ts`:

````typescript
GraphqlModule.forRootAsync({
  ...,
  context: async ({ req }) => {
    const user = await authenticateUserByRequest(authService, req)
    return { req, user }
  }
})
````

It calls `src/auth/auth.middleware.ts` which reads both the cookie and authorization header and returns the corresponding user if success:

````typescript
import { Request } from 'express'
import { AuthService } from '@/auth/auth.service'

export const authenticateUserByRequest = (authService: AuthService, request: Request) => {
  const token = request.headers.authorization?.replace('Bearer ', '') || request.cookies.jwt || ''
  return authService.me(token)
}
````

The reason we need to support both cookie and authorization header is because Nuxt.js is going to send 2 types of requests: front-end (http-only cookie is in use) and back-end (during server side rendering, when it has access to the cookie and resends it in authorization header). 

Now we can use GraphQL context in the corresponding mutations:

````typescript
@Mutation(() => User)
async signinLocal(@Args('data') data: SigninDto, @Context('req') req: Request): Promise<User> {
  const { user, token } = await this.authService.signinLocal(data)
  req.res?.cookie('jwt', token, { httpOnly: true })
  return user
}

@Mutation(() => User)
async signOut(@Context('req') req: Request, @Context('user') user: User): Promise<User> {
  req.res?.clearCookie('jwt', { httpOnly: true })
  return user
}

@Query(() => User)
async me(@Context('user') user: User): Promise<User> {
  return user
}
````

On this stage we should get the working solution. There's one last thing to fix. Currently, if not authenticated user runs `me` query, he gets `Cannot return null for non-nullable field Query.me` error. This is violation of GraphQL principles - if a query defines that it returns `User`, it can not return `null` instead. We have to prevent running the method entirely against not authenticated users. Here's the guard (`src/guards/auth.guard.ts`):

````typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { User } from '@prisma/client'

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context)
    const user: User | null = ctx.getContext().user || null
    return !!user
  }
}
````

We can use it with `@UseGuards(AuthGuard)` decorator in resolver the same way we usually use it for regular REST in Nuxt.js:

````typescript
@UseGuards(AuthGuard)
@Query(() => User)
async me(@Context('user') user: User): Promise<User> {
  return user
}
````

![GraphQL Playground Authentication Flow](images/02-graphql-playground-authentication-flow.gif)

### Where's Passport.JS?
We are not using it. It gives overhead only. If you find it useful, [here's a great tutorial about setting up GraphQL with Passport.JS](https://www.youtube.com/watch?v=XPSSgAPjTb4).

## 5. Initial Front-End Setup

````
$ npx nuxi init frontend
$ cd frontend
````

The back-end url is `http://localhost:3001/graphql`. We have to add it to several configuration files. Let's start with the usual `.env`:
````
BASE_URL=http://localhost:3001/graphql
````

To be able to use `process.env` variables in Nuxt.js, we need to include it into `nuxt.config.js`:
````javascript
runtimeConfig: {
  public: {
    baseUrl: process.env.BASE_URL
  }
}
````

Notice that it's in `public` section. This case it becomes available as `$nuxt.$config.baseUrl` both during server side rendering and on the client.

## 6. Queries and GraphQL codegen

We are going to write GraphQL queries using separate `api/queries/*.gql` files. It would be nice to have autocomplete and syntax highlight there. That's why VSCode Apollo Plugin is in use. It requires configuration to be defined in `apollo.config.js`: 
````javascript
module.exports = {
  client: {
    service: {
      url: 'http://localhost:3001/graphql'
    },
    includes: ['api/queries/*.gql']
  }
}
````

The next thing to set up is `graphql-codegen`. It creates TypeScript code based on `.gql` files. It gives type safety  while working with GraphQL data from Nuxt.js. To set it up we need to install:
````
$ npm i --save @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typed-document-node
````
and specify the following configuration in `codegen.yml`:
````
overwrite: true
schema: "http://localhost:3001/graphql"
documents: "api/queries/*.gql"
generates:
  api/generated/types.ts:
    plugins:
      - typescript
      - typescript-operations
      - typed-document-node
````

Let's add the required queries into `api/queries/auth.gql`:

````graphql
fragment AuthUser on User {
  id
  email
  status
}

mutation signin($data: SigninDto!) {
  signin(data: $data) {
    ...AuthUser
  }
}

mutation signOut {
  signOut {
    ...AuthUser
  }
}

query me {
  me {
    ...AuthUser
  }
}
````

Now we can generate TypeScript code using the following command:
````
$ npx graphql-codegen --config codegen.yml
````

## 7. Pinia
````
$ npm i --save pinia @pinia/nuxt
````
Following [this guide](https://pinia.vuejs.org/ssr/nuxt.html) we need to add `@pinia/nuxt` into the Nuxt.js modules configuration section, then we are free to go. Here's the simplest possible store (`stores/auth.ts`) handling authenticated user:
````typescript
import { defineStore } from 'pinia'
import { AuthUserFragment } from '@/api/generated/types'

export type AuthState = {
  user: AuthUserFragment | null
}

export const useAuthStore = defineStore({
  id: 'auth-store',
  state(): AuthState {
    return {
      user: null
    }
  }
})
````

## 8. Vuetify and Sass Variables
It's not related to authentication, but still might be a bit tricky. We are going to install [Vuetify Next](https://next.vuetifyjs.com/) and create some shared styles/mixins sass. The goal is to be able to use Vuetify sass variables and shared mixins in components.
````
$ npm i --save vuetify@next @mdi/js sass
````
Vuetify integration will be handler in `plugins/1.vuetify.ts`. All the files inside `plugins` folder are injected automatically. An important thing is they are evaluated in alphabetical order. That's why if some plugin depends on another, it should be included later (and we'll use it). That's why numeric prefix is used for file names.

`plugins/1.vuetify.ts`:
````typescript
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi
      }
    },
    defaults: {
      VTextField: {
        density: "compact",
        variant: "outlined"
      }
    },
    ssr: true
  })
  nuxtApp.vueApp.use(vuetify)
})
````

Suppose there's some sass mixin or variable we would like to use across all the components. We define it in `assets/styles/variables.sass`:

````sass
@import "vuetify/lib/styles/settings" 

=pn-cover-image($url)
  background-image: $url
  background-position: center center
  background-size: cover
  padding: $spacer * 4 // This variable is taken from Vuetify which is defined due to @import above
````

Nuxt.js configuration has to be updated as well. Here's the final version of `nuxt.config.js`:

````javascript
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
````

Pay attention to `additionalData` preprocessor option. It's required for being able to use shared mixins in components like that (`app.ts`):
````typescript
<template>
  <v-app>
    <v-main>
      <v-container fluid class="pn-container">
        <AuthProfileCard v-if="authStore.user" />
        <AuthSigninForm v-else />
      </v-container>  
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
</script>

<style lang="sass">
.pn-container
  +pn-cover-image(url("@/assets/images/home.jpg")) // from variables.sass
  display: flex
  align-items: center
  justify-content: center
  height: 100%
  padding: $spacer * 4 // from vuetify
</style>
````

## 9. Villus setup
Villus is a tiny GraphQL client much smaller than the default `@apollo/client`. Here's the plugin configuration `plugins/0.villus.ts`:
````typescript
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
````

The main thing to notice here is `addHeadersPlugin`. Nuxt.js works both as client application (it sends requests from the browser) and as server application during server side rendering. If a user sends `signIn` or `me` request from the browser, http-only cookie is sent alongside the request. In this case `addHeadersPlugin` does nothing because it does not have access to the cookie. 

When a page is reloaded, Nuxt.JS SSR engine runs the same code. This case it knows the value of http-only cookie (it was send in page reload request). It substitutes the value into authorization header.

## 10. Villus usage

Villus provides a very convenient `useQuery/useMutation` helpers. Let's consider how it works in login form:

````typescript
<template>
  <v-form @submit.prevent="execute({ data: form })">
    <v-alert v-if="error" type="error">
      {{ error }}
    </v-alert>
    <v-text-field v-model="form.email" label="Email" />
    <v-text-field v-model="form.password" label="Password" />
    <v-btn :loading="isFetching" type="submit">
      Sign In
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { useMutation } from 'villus'
import { useAuthStore } from '@/stores/auth'
import { SigninDocument } from '@/api/generated/types'

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
````

Villus `useQuery/useMutation` methods don't throw exceptions. When they run, they fill either data or error.
Since `SigninDocument` is a TypedDocumentNode, data is strongly typed. Hence, if data is filled (meaning no error), we can safely refer to `data.signin.email` and other fields from the model.

On this stage we should be able to sign in, run `me` request and sign out. However, reloading the page for signed in user does not work correctly - user is not authenticated.

## 11. SSR Flow
There was a special `nuxtServerInit` action available in Nuxt 2. It handled the code running in SSR only. Since it happens on server, it knows the http-only JWT cookie. It's possible to send `me` request and substitude user to the store.

In Nuxt 3 the same flow can be achieved using server-only plugin. Let's create `plugins/9.init.server.ts` file. `9` means it should be run the last, after villus initialization. Suffix `server` automatically sets it to be run during SSR only.

`plugins/9.init.server.ts`:
````typescript
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
````
