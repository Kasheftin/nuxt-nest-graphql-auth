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
