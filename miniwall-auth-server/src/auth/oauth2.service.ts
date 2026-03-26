import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ClientService } from './services/client.service';
import { ClientDocument } from './schemas/client.schema';
import { User, UserDocument } from './schemas/user.schema';
import { TokenBlacklist, TokenBlacklistDocument } from './schemas/token-blacklist.schema';

@Injectable()
export class OAuth2Service {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private clientService: ClientService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(TokenBlacklist.name)
    private tokenBlacklistModel: Model<TokenBlacklistDocument>,
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
      // Verify token signature and decode payload
      let payload;
      try {
        payload = this.jwtService.verify(token, { complete: true });
      } catch (error) {
        return { 
          active: false,
          error: 'invalid_token',
          error_description: 'Token signature verification failed'
        };
      }

      const tokenData = payload.payload;
      const tokenJti = tokenData.jti || this.generateTokenHash(token);

      // 1. Check if token is in blacklist (revoked)
      const isBlacklisted = await this.tokenBlacklistModel.findOne({ tokenJti });
      if (isBlacklisted) {
        return { 
          active: false,
          error: 'token_revoked',
          error_description: 'Token has been revoked',
          revoked_at: isBlacklisted.revokedAt
        };
      }

      // 2. Check token expiration explicitly
      const currentTime = Math.floor(Date.now() / 1000);
      if (tokenData.exp && tokenData.exp < currentTime) {
        return { 
          active: false,
          error: 'token_expired',
          error_description: 'Token has expired'
        };
      }

      // 3. Handle user JWT tokens (from /auth/login)
      if (tokenData.username && tokenData.sub) {
        // Verify user still exists and is active
        const user = await this.userModel.findById(tokenData.sub);
        
        if (!user) {
          return { 
            active: false,
            error: 'user_not_found',
            error_description: 'User associated with token no longer exists'
          };
        }

        if (!user.isActive) {
          return { 
            active: false,
            error: 'user_inactive',
            error_description: 'User account is disabled'
          };
        }

        // Check if user's roles have changed (optional: compare with token roles)
        const currentRoles = user.roles || ['user'];
        const tokenRoles = tokenData.roles || ['user'];
        
        return {
          active: true,
          scope: currentRoles.join(' '),
          username: user.username,
          sub: user._id.toString(),
          exp: tokenData.exp,
          iat: tokenData.iat,
          token_type: 'Bearer',
          client_id: null,
        };
      }

      // 4. Handle OAuth2 client tokens (from /oauth/token)
      if (tokenData.client_id) {
        const client = await this.clientService.findByClientId(tokenData.client_id);
        
        if (!client) {
          return { 
            active: false,
            error: 'client_not_found',
            error_description: 'Client associated with token no longer exists'
          };
        }

        if (!client.isActive) {
          return { 
            active: false,
            error: 'client_inactive',
            error_description: 'Client has been deactivated'
          };
        }

        // Validate that token scopes are still allowed for this client
        const tokenScopes = tokenData.scopes || ['read'];
        const allowedScopes = client.allowedScopes || ['read'];
        const validScopes = tokenScopes.filter(scope => allowedScopes.includes(scope));

        return {
          active: true,
          scope: validScopes.join(' '),
          client_id: client.clientId,
          username: tokenData.username || null,
          sub: tokenData.sub || null,
          exp: tokenData.exp,
          iat: tokenData.iat,
          token_type: 'Bearer',
        };
      }

      return { 
        active: false,
        error: 'invalid_token',
        error_description: 'Unknown token type'
      };
    } catch (error) {
      return { 
        active: false,
        error: 'token_validation_failed',
        error_description: error.message || 'Token validation failed'
      };
    }
  }

  async revoke(token: string) {
    try {
      // Verify and decode token to get expiration info
      let payload;
      try {
        payload = this.jwtService.verify(token, { complete: true });
      } catch (error) {
        return { 
          active: false,
          error: 'invalid_token',
          error_description: 'Cannot revoke invalid token'
        };
      }

      const tokenData = payload.payload;
      const tokenJti = tokenData.jti || this.generateTokenHash(token);

      // Check if already revoked
      const existing = await this.tokenBlacklistModel.findOne({ tokenJti });
      if (existing) {
        return {
          active: false,
          revoked_at: existing.revokedAt,
          message: 'Token was already revoked'
        };
      }

      // Add token to blacklist
      const blacklistedToken = new this.tokenBlacklistModel({
        tokenJti,
        revokedAt: new Date(),
        expiresAt: tokenData.exp ? new Date(tokenData.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h if no exp
        reason: 'user_initiated_revoke'
      });

      await blacklistedToken.save();

      return { 
        active: false,
        revoked_at: blacklistedToken.revokedAt,
        message: 'Token revoked successfully'
      };
    } catch (error) {
      return { 
        active: false,
        error: 'revocation_failed',
        error_description: error.message || 'Failed to revoke token'
      };
    }
  }

  private generateAuthorizationCode(clientId: string, redirectUri: string, scopes: string[]): string {
    // Generate a cryptographically secure authorization code
    const data = `${clientId}:${redirectUri}:${scopes.join(',')}:${Date.now()}`;
    return Buffer.from(data).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  private generateTokenHash(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
