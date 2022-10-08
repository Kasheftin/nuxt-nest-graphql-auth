import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql'
import { Request } from 'express'
import { User } from '@/models/user.model'
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

  @Mutation(() => User)
  async signOut(@Context('req') req: Request, @Context('user') user: User): Promise<User> {
    req.res?.clearCookie('jwt', { httpOnly: true })
    return user
  }

  @Query(() => User)
  async me(@Context('user') user: User): Promise<User> {
    return user
  }
}
