import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthResolver } from './auth.resolver'
import { AuthService } from './auth.service'

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT })],
  providers: [AuthResolver, AuthService],
  exports: [AuthService]
})
export class AuthModule {}
