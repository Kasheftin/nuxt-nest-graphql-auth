import { UseGuards } from '@nestjs/common'
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql'
import { Request } from 'express'
import { User } from '@/models/user.model'
import { AuthGuard } from '@/guards/auth.guard'
import { AuthService } from './auth.service'
import { CreateUserDto } from './dto/createUser.dto'
import { SigninDto } from './dto/signIn.dto'
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

  @Mutation(() => User)
  async signin(@Args('data') data: SigninDto, @Context('req') req: Request): Promise<User> {
    const { user, token } = await this.authService.signin(data)
    req.res?.cookie('jwt', token, { httpOnly: true })
    return user
  }

  @UseGuards(AuthGuard)
  @Mutation(() => User)
  signOut(@Context('req') req: Request, @Context('user') user: User): User {
    req.res?.clearCookie('jwt', { httpOnly: true })
    return user
  }

  @UseGuards(AuthGuard)
  @Query(() => User)
  me(@Context('user') user: User): User {
    return user
  }
}
