import { Field, InputType } from '@nestjs/graphql'
import { UserStatus } from '@prisma/client'
import { MaxLength, IsEmail, IsEnum } from 'class-validator'

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
  @IsEnum(UserStatus)
  status: UserStatus
}
