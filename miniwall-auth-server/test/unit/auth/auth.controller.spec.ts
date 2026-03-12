import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      const expectedResult = {
        _id: 'user123',
        username: 'newuser',
        email: 'new@example.com',
        roles: ['user'],
        isActive: true,
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw error if registration fails', async () => {
      const registerDto = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(new Error('User already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow('User already exists');
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshTokenDto = {
        refresh_token: 'valid-refresh-token',
      };

      const expectedResult = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: {
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
        },
      };

      mockAuthService.refreshToken.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual(expectedResult);
    });

    it('should throw error if refresh token is invalid', async () => {
      const refreshTokenDto = {
        refresh_token: 'invalid-refresh-token',
      };

      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow('Invalid refresh token');
      expect(authService.refreshToken).toHaveBeenCalledWith('invalid-refresh-token');
    });
  });

  describe('getProfile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockRequest = {
        user: {
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
        },
      };

      const result = controller.getProfile(mockRequest);

      expect(result).toEqual(mockRequest.user);
    });

    it('should handle request with no user gracefully', async () => {
      const mockRequest = {
        user: null,
      };

      const result = controller.getProfile(mockRequest);

      expect(result).toBeNull();
    });
  });
});
