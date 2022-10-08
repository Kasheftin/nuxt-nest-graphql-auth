import { Field, InputType } from '@nestjs/graphql'
import { MaxLength, IsEmail } from 'class-validator'

@InputType()
export class SigninDto {
  @Field()
  @MaxLength(255)
  @IsEmail()
  email: string

  @Field()
  @MaxLength(255)
  password: string
}
