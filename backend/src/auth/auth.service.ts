import { PrismaService } from 'nestjs-prisma'
import { Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { CreateUserDto } from './dto/createUser.dto'
import { SigninDto } from './dto/signIn.dto'

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

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
        const user = await this.prisma.user.findUnique({ where: { id: Number(data.sub) } })
        return user || null
      }
    }
    return null
  }
}
