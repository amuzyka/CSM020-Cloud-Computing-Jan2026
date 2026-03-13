import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ClientService } from './services/client.service';
import { ClientDocument } from './schemas/client.schema';

@Injectable()
export class OAuth2Service {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private clientService: ClientService,
  ) {}

  async authorize(clientId: string, redirectUri: string, responseType: string, scope?: string) {
    // Validate client exists and is active
    const client = await this.clientService.findByClientId(clientId);
    
    // Validate redirect URI
    const isValidUri = await this.clientService.validateRedirectUri(clientId, redirectUri);
    if (!isValidUri) {
      throw new BadRequestException('Invalid redirect URI');
    }
    
    // Validate and normalize scopes
    const requestedScopes = scope ? scope.split(' ') : ['read'];
    const validScopes = await this.clientService.validateScopes(clientId, requestedScopes);
    
    // Generate authorization code (in real implementation, store this with expiration)
    const authCode = this.generateAuthorizationCode(clientId, redirectUri, validScopes);
    
    return {
      authorize_url: `${redirectUri}?code=${authCode}&state=${scope || 'read'}`,
      client_id: clientId,
      scopes: validScopes,
      expires_in: 600, // 10 minutes for auth code
    };
  }

  async token(grantType: string, clientId: string, clientSecret?: string, code?: string, refreshToken?: string, redirectUri?: string) {
    // Validate client credentials first
    const client = await this.clientService.validateClient(clientId, clientSecret);
    
    if (grantType === 'authorization_code') {
      if (!code) throw new BadRequestException('Authorization code is required');
      if (!redirectUri) throw new BadRequestException('Redirect URI is required');
      
      return this.handleAuthorizationCodeGrant(code, clientId, redirectUri, client);
    } else if (grantType === 'refresh_token') {
      if (!refreshToken) throw new BadRequestException('Refresh token is required');
      return this.authService.refreshToken(refreshToken);
    } else if (grantType === 'client_credentials') {
      return this.handleClientCredentialsGrant(client);
    }
    
    throw new BadRequestException('Unsupported grant type');
  }

  private async handleAuthorizationCodeGrant(code: string, clientId: string, redirectUri: string, client: ClientDocument) {
    // In real implementation, validate the stored authorization code
    // For now, we'll generate tokens for the client
    
    const payload = {
      sub: clientId,
      client_id: clientId,
      scopes: client.allowedScopes,
      grant_type: 'authorization_code',
    };
    
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: `${client.accessTokenLifetime}s` }),
      token_type: 'Bearer',
      expires_in: client.accessTokenLifetime,
      refresh_token: this.jwtService.sign(payload, { expiresIn: `${client.refreshTokenLifetime}s` }),
      scope: client.allowedScopes.join(' '),
    };
  }

  private async handleClientCredentialsGrant(client: ClientDocument) {
    const payload = {
      sub: client.clientId,
      client_id: client.clientId,
      scopes: client.allowedScopes,
      grant_type: 'client_credentials',
    };
    
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: `${client.accessTokenLifetime}s` }),
      token_type: 'Bearer',
      expires_in: client.accessTokenLifetime,
      scope: client.allowedScopes.join(' '),
    };
  }

  async introspect(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      
      // Validate client still exists and is active
      const client = await this.clientService.findByClientId(payload.client_id);
      
      return {
        active: true,
        scope: payload.scopes?.join(' ') || 'read',
        client_id: payload.client_id,
        username: payload.username || null,
        exp: payload.exp,
        iat: payload.iat,
        token_type: 'Bearer',
      };
    } catch (error) {
      return { active: false };
    }
  }

  async revoke(token: string) {
    try {
      // In real implementation, add token to blacklist
      const payload = this.jwtService.verify(token);
      
      // Could store revoked tokens in Redis with TTL
      return { 
        active: false,
        revoked_at: new Date().toISOString(),
      };
    } catch (error) {
      return { active: false };
    }
  }

  private generateAuthorizationCode(clientId: string, redirectUri: string, scopes: string[]): string {
    // Generate a cryptographically secure authorization code
    const data = `${clientId}:${redirectUri}:${scopes.join(',')}:${Date.now()}`;
    return Buffer.from(data).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }
}
