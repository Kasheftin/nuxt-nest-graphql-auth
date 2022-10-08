# Nuxt3/Nest/GraphQL authentication from scratch

We are building full-stack Nuxt.JS/Nest.JS/GraphQL application with authentication, http-only cookies and permissions.

## 0. The Stack

- **Back-End**
  - **Nest.js** *(The most advanced Node.js framework + DTO and class-validator)*
  - **Prisma** *(TypeScript ORM, MySQL is in use)*
  - **GraphQL** *(We are using code-first approach)*
  - **GraphQL/Shield** *(Authorization, Permissions)*
- **Front-End**
  - **Nuxt.js v3** *(Vue.js framework with SSR support out of the box + Vite, Pinia, Composition API and 100% TypeScript)*
  - **Vuetify v3** *(Material design framework, still in beta but usable)* 
  - **GraphQL/Codegen** *(Generating TypeScript for our graphql schema)*
  - **Villus** *(A nice GraphQL client for Vue.js)*
- **VSCode extensions**
  - **Volar** *(Vetur must be turned off)*
  - **Apollo GraphQL** *(For syntax autocomplete)*
  - **Prisma** *(Working with schema.prisma files)*

## 1. Initial Back-End Setup
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

Prisma is a great ORM which connects to the database and allows using typescript classes instead of writing raw sql queries.

````
$ npm i --save prisma nestjs-prisma
$ npx prisma init --datasource-provider mysql
````


A significant caveat with the modern development is that almost every tool uses it's own language. Prisma uses it's schema files that needs to be translated to typescript. GraphQL uses it's own schema which also requires translation to typescript. 

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
We are using code-first approach meaning `src/schema.gql` will be auto-generated based on the typescript models. We need:
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

An essential thing to understand is how models correspond to each other. We defined user model twice: in prisma and in graphql. Hence, we have two classes - prisma user and graphql user. Service retrieves data from prisma, it returns prisma user. Resolver gets prisma user and presents it as graphql user. It works because in this particular case our users are compatible, but in general resolver should create a new graphql entity based on orm entity.

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
          // const user = await useAuthMiddleware(authService, options)
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

We need to implement sign in and sign out mutations as well as `me` query which is going to return currently signed in user.  


### Where's Passport.JS?
We are not using it. It gives overhead only. If you wish to use it, [here's a great tutorial about setting up GraphQL with Passport.JS](https://www.youtube.com/watch?v=XPSSgAPjTb4).
