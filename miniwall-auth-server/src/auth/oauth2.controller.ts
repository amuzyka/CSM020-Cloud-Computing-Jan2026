import { Controller, Post, Body, Query, Get, Res } from '@nestjs/common';
import { type Response } from 'express';
import { OAuth2Service } from './oauth2.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('oauth')
export class OAuth2Controller {
  constructor(private readonly oauth2Service: OAuth2Service) {}

  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('response_type') responseType: string,
    @Query('scope') scope?: string,
    @Query('state') state?: string,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.oauth2Service.authorize(clientId, redirectUri, responseType, scope);
      
      if (res) {
        // Redirect to client with authorization code or error
        const redirectUrl = `${redirectUri}?code=sample_auth_code${state ? `&state=${state}` : ''}`;
        return res.redirect(redirectUrl);
      }
      
      return result;
    } catch (error) {
      if (res) {
        const errorUrl = `${redirectUri}?error=access_denied${state ? `&state=${state}` : ''}`;
        return res.redirect(errorUrl);
      }
      throw error;
    }
  }

  @Post('token')
  async token(@Body() body: {
    grant_type: string;
    client_id: string;
    client_secret?: string;
    code?: string;
    refresh_token?: string;
    redirect_uri?: string;
  }) {
    try {
      const result = await this.oauth2Service.token(
        body.grant_type,
        body.client_id,
        body.client_secret,
        body.code,
        body.refresh_token,
      );
      return result;
    } catch (error) {
      return {
        error: 'invalid_grant',
        error_description: error.message,
      };
    }
  }

  @Post('introspect')
  async introspect(@Body() body: { token: string }) {
    return this.oauth2Service.introspect(body.token);
  }

  @Post('revoke')
  async revoke(@Body() body: { token: string }) {
    return this.oauth2Service.revoke(body.token);
  }

  //TODO: remove this endpoint in production
  //decide if to use openid-configuration or not
  @Get('.well-known/openid_configuration')
  async openidConfiguration() {
    return {
      issuer: 'http://localhost:4000',
      authorization_endpoint: 'http://localhost:4000/oauth/authorize',
      token_endpoint: 'http://localhost:4000/oauth/token',
      introspection_endpoint: 'http://localhost:4000/oauth/introspect',
      revocation_endpoint: 'http://localhost:4000/oauth/revoke',
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
      scopes_supported: ['read', 'write'],
    };
  }
}
