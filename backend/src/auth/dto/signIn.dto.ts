import { Field, InputType } from '@nestjs/graphql'
import { MaxLength, IsEmail, IsNotEmpty } from 'class-validator'

@InputType()
export class SigninDto {
  @Field()
  @MaxLength(255)
  @IsEmail()
  @IsNotEmpty()
  email: string

  @Field()
  @MaxLength(255)
  @IsNotEmpty()
  password: string
}
