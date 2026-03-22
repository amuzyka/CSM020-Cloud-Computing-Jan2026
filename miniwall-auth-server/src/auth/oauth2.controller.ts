import { Controller, Post, Body, Query, Get, Res, UseGuards } from '@nestjs/common';
import { type Response } from 'express';
import { OAuth2Service } from './oauth2.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ClientCredentialsGuard } from './guards/client-credentials.guard';

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
  @UseGuards(ClientCredentialsGuard)
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
  @UseGuards(ClientCredentialsGuard)
  async introspect(@Body() body: { token: string }) {
    return this.oauth2Service.introspect(body.token);
  }

  @Post('revoke')
  @UseGuards(ClientCredentialsGuard)
  async revoke(@Body() body: { token: string }) {
    return this.oauth2Service.revoke(body.token);
  }


}
