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
