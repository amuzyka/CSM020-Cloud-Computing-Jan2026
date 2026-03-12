import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Controller } from '../../../src/auth/oauth2.controller';
import { OAuth2Service } from '../../../src/auth/oauth2.service';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';

describe('OAuth2Controller', () => {
  let controller: OAuth2Controller;
  let oauth2Service: OAuth2Service;

  const mockOAuth2Service = {
    authorize: jest.fn(),
    token: jest.fn(),
    introspect: jest.fn(),
    revoke: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuth2Controller],
      providers: [
        {
          provide: OAuth2Service,
          useValue: mockOAuth2Service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OAuth2Controller>(OAuth2Controller);
    oauth2Service = module.get<OAuth2Service>(OAuth2Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authorize', () => {
    it('should return authorization URL without response object', async () => {
      const clientId = 'test-client';
      const redirectUri = 'http://localhost:3000/callback';
      const responseType = 'code';
      const scope = 'read write';

      const expectedResult = {
        authorize_url: '/oauth/authorize?client_id=test-client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=read write',
      };

      mockOAuth2Service.authorize.mockResolvedValue(expectedResult);

      const result = await controller.authorize(clientId, redirectUri, responseType, scope);

      expect(oauth2Service.authorize).toHaveBeenCalledWith(clientId, redirectUri, responseType, scope);
      expect(result).toEqual(expectedResult);
    });

    it('should handle authorization without scope', async () => {
      const clientId = 'test-client';
      const redirectUri = 'http://localhost:3000/callback';
      const responseType = 'code';

      const expectedResult = {
        authorize_url: '/oauth/authorize?client_id=test-client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=read',
      };

      mockOAuth2Service.authorize.mockResolvedValue(expectedResult);

      const result = await controller.authorize(clientId, redirectUri, responseType);

      expect(oauth2Service.authorize).toHaveBeenCalledWith(clientId, redirectUri, responseType, undefined);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('token', () => {
    it('should handle authorization code grant', async () => {
      const body = {
        grant_type: 'authorization_code',
        client_id: 'test-client',
        code: 'auth-code-123',
        client_secret: undefined,
        refresh_token: undefined,
      };

      const expectedResult = {
        access_token: 'sample_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'sample_refresh_token',
      };

      mockOAuth2Service.token.mockResolvedValue(expectedResult);

      const result = await controller.token(body);

      expect(oauth2Service.token).toHaveBeenCalledWith(
        body.grant_type,
        body.client_id,
        body.client_secret,
        body.code,
        body.refresh_token
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle refresh token grant', async () => {
      const body = {
        grant_type: 'refresh_token',
        client_id: 'test-client',
        refresh_token: 'refresh-token-123',
        client_secret: undefined,
        code: undefined,
      };

      const expectedResult = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: { id: 'user123', username: 'testuser' },
      };

      mockOAuth2Service.token.mockResolvedValue(expectedResult);

      const result = await controller.token(body);

      expect(oauth2Service.token).toHaveBeenCalledWith(
        body.grant_type,
        body.client_id,
        body.client_secret,
        body.code,
        body.refresh_token
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle client credentials grant', async () => {
      const body = {
        grant_type: 'client_credentials',
        client_id: 'test-client',
        client_secret: 'client-secret-123',
        code: undefined,
        refresh_token: undefined,
      };

      const expectedResult = {
        access_token: 'sample_client_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockOAuth2Service.token.mockResolvedValue(expectedResult);

      const result = await controller.token(body);

      expect(oauth2Service.token).toHaveBeenCalledWith(
        body.grant_type,
        body.client_id,
        body.client_secret,
        body.code,
        body.refresh_token
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return error for unsupported grant type', async () => {
      const body = {
        grant_type: 'unsupported_grant',
        client_id: 'test-client',
        client_secret: undefined,
        code: undefined,
        refresh_token: undefined,
      };

      mockOAuth2Service.token.mockRejectedValue(new Error('Unsupported grant type'));

      const result = await controller.token(body);

      expect(oauth2Service.token).toHaveBeenCalledWith(
        body.grant_type,
        body.client_id,
        body.client_secret,
        body.code,
        body.refresh_token
      );
      expect(result).toEqual({
        error: 'invalid_grant',
        error_description: 'Unsupported grant type',
      });
    });
  });

  describe('introspect', () => {
    it('should return token introspection result', async () => {
      const body = {
        token: 'valid-token',
      };

      const expectedResult = {
        active: true,
        scope: 'read write',
        client_id: 'miniwall-client',
        username: 'testuser',
        exp: 1647894834,
      };

      mockOAuth2Service.introspect.mockResolvedValue(expectedResult);

      const result = await controller.introspect(body);

      expect(oauth2Service.introspect).toHaveBeenCalledWith(body.token);
      expect(result).toEqual(expectedResult);
    });

    it('should return inactive for invalid token', async () => {
      const body = {
        token: 'invalid-token',
      };

      const expectedResult = {
        active: false,
      };

      mockOAuth2Service.introspect.mockResolvedValue(expectedResult);

      const result = await controller.introspect(body);

      expect(oauth2Service.introspect).toHaveBeenCalledWith(body.token);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('revoke', () => {
    it('should revoke token successfully', async () => {
      const body = {
        token: 'token-to-revoke',
      };

      const expectedResult = {
        active: false,
      };

      mockOAuth2Service.revoke.mockResolvedValue(expectedResult);

      const result = await controller.revoke(body);

      expect(oauth2Service.revoke).toHaveBeenCalledWith(body.token);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('openidConfiguration', () => {
    it('should return OpenID configuration', async () => {
      const result = await controller.openidConfiguration();

      expect(result).toEqual({
        issuer: 'http://localhost:4000',
        authorization_endpoint: 'http://localhost:4000/oauth/authorize',
        token_endpoint: 'http://localhost:4000/oauth/token',
        introspection_endpoint: 'http://localhost:4000/oauth/introspect',
        revocation_endpoint: 'http://localhost:4000/oauth/revoke',
        response_types_supported: ['code', 'token'],
        grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
        scopes_supported: ['read', 'write'],
      });
    });
  });
});
