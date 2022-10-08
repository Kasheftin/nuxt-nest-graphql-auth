import { Request } from 'express'
import { AuthService } from '@/auth/auth.service'

export const authenticateUserByRequest = (authService: AuthService, request: Request) => {
  const token = request.headers.authorization?.replace('Bearer ', '') || request.cookies.jwt || ''
  return authService.me(token)
}
