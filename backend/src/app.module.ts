import { Module } from '@nestjs/common'
import { PrismaModule } from 'nestjs-prisma'
import { GraphQLModule } from '@nestjs/graphql'
import { applyMiddleware } from 'graphql-middleware'
import { join } from 'path/posix'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { permissions } from '@/permissions'
import { AuthModule } from '@/auth/auth.module'
import { AuthService } from '@/auth/auth.service'
import { authenticateUserByRequest } from '@/auth/auth.middleware'

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
        context: async ({ req }) => {
          const user = await authenticateUserByRequest(authService, req)
          return { req, user }
        },
        transformSchema: schema => applyMiddleware(schema, permissions)
      })
    })
  ]
})
export class AppModule {}
