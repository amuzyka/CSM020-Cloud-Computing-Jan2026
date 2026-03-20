import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { type Request } from 'express';
import { TokenService } from './token.service';

@Injectable()
export class OAuth2ResourceGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers['authorization'];
    const token =
      typeof authHeader === 'string'
        ? this.tokenService.extractTokenFromHeader(authHeader)
        : Array.isArray(authHeader) && typeof authHeader[0] === 'string'
          ? this.tokenService.extractTokenFromHeader(authHeader[0])
          : null;

    if (!token) {
      throw new UnauthorizedException('Missing Authorization: Bearer access_token');
    }

    // RFC 7662-style validation via the auth server.
    const introspection = await this.tokenService.introspectToken(token);

    // Attach introspection so controllers/services can use it if needed.
    (request as any).oauth2 = introspection;
    return true;
  }
}

