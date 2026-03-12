import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Service } from '../../../src/auth/oauth2.service';
import { AuthService } from '../../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

describe('OAuth2Service', () => {
  let service: OAuth2Service;
  let authService: AuthService;
  let jwtService: JwtService;

  const mockAuthService = {
    refreshToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2Service,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<OAuth2Service>(OAuth2Service);
    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authorize', () => {
    it('should return authorization URL with all parameters', async () => {
      const clientId = 'test-client';
      const redirectUri = 'http://localhost:3000/callback';
      const responseType = 'code';
      const scope = 'read write';

      const result = await service.authorize(clientId, redirectUri, responseType, scope);

      expect(result).toEqual({
        authorize_url: `/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`,
      });
    });

    it('should return authorization URL with default scope', async () => {
      const clientId = 'test-client';
      const redirectUri = 'http://localhost:3000/callback';
      const responseType = 'code';

      const result = await service.authorize(clientId, redirectUri, responseType);

      expect(result).toEqual({
        authorize_url: `/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=read`,
      });
    });
  });

  describe('token', () => {
    it('should handle authorization_code grant type', async () => {
      const grantType = 'authorization_code';
      const clientId = 'test-client';
      const code = 'auth-code-123';

      const result = await service.token(grantType, clientId, undefined, code);

      expect(result).toEqual({
        access_token: 'sample_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'sample_refresh_token',
      });
    });

    it('should throw error for authorization_code without code', async () => {
      const grantType = 'authorization_code';
      const clientId = 'test-client';

      await expect(service.token(grantType, clientId)).rejects.toThrow('Authorization code is required');
    });

    it('should handle refresh_token grant type', async () => {
      const grantType = 'refresh_token';
      const clientId = 'test-client';
      const refreshToken = 'refresh-token-123';

      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: { id: 'user123', username: 'testuser' },
      };

      mockAuthService.refreshToken.mockResolvedValue(mockTokenResponse);

      const result = await service.token(grantType, clientId, undefined, undefined, refreshToken);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(mockTokenResponse);
    });

    it('should throw error for refresh_token without token', async () => {
      const grantType = 'refresh_token';
      const clientId = 'test-client';

      await expect(service.token(grantType, clientId)).rejects.toThrow('Refresh token is required');
    });

    it('should handle client_credentials grant type', async () => {
      const grantType = 'client_credentials';
      const clientId = 'test-client';
      const clientSecret = 'client-secret-123';

      const result = await service.token(grantType, clientId, clientSecret);

      expect(result).toEqual({
        access_token: 'sample_client_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
      });
    });

    it('should throw error for client_credentials without secret', async () => {
      const grantType = 'client_credentials';
      const clientId = 'test-client';

      await expect(service.token(grantType, clientId)).rejects.toThrow('Client secret is required');
    });

    it('should throw error for unsupported grant type', async () => {
      const grantType = 'unsupported_grant';
      const clientId = 'test-client';

      await expect(service.token(grantType, clientId)).rejects.toThrow('Unsupported grant type');
    });
  });

  describe('introspect', () => {
    it('should return active token info for valid token', async () => {
      const token = 'valid-token';
      const mockPayload = {
        username: 'testuser',
        exp: 1647894834,
      };

      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = await service.introspect(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(result).toEqual({
        active: true,
        scope: 'read write',
        client_id: 'miniwall-client',
        username: 'testuser',
        exp: 1647894834,
      });
    });

    it('should return inactive for invalid token', async () => {
      const token = 'invalid-token';

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.introspect(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(result).toEqual({ active: false });
    });
  });

  describe('revoke', () => {
    it('should return inactive status for token revocation', async () => {
      const token = 'token-to-revoke';

      const result = await service.revoke(token);

      expect(result).toEqual({ active: false });
    });
  });
});
