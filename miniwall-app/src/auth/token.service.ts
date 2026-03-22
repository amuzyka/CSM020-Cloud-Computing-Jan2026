import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TokenService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async introspectToken(token: string): Promise<any> {
    try {
      const authServerUrl = this.configService.get<string>('AUTH_SERVER_URL', 'http://localhost:4000');
      const clientId = this.configService.get<string>('OAUTH2_CLIENT_ID', 'miniwall-client');
      const clientSecret = this.configService.get<string>('OAUTH2_CLIENT_SECRET', 'miniwall-client-secret');

      const authServerBaseUrl = authServerUrl.replace(/\/$/, '');
      const introspectUrl = `${authServerBaseUrl}/oauth/introspect`;

      const response = await firstValueFrom(
        this.httpService.post<any>(
          introspectUrl,
          { token, client_id: clientId, client_secret: clientSecret },
          { headers: { 'Content-Type': 'application/json' } },
        )
      );

      const introspection = response.data as any;
      
      if (!introspection.active) {
        throw new UnauthorizedException('Token is no longer active');
      }

      return introspection;
    } catch (error) {
      throw new UnauthorizedException('Token introspection failed');
    }
  }

  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }
}
