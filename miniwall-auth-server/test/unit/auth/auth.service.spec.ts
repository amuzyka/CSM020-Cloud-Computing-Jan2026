import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/auth/auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from '../../../src/auth/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: Model<UserDocument>;
  let jwtService: JwtService;

  const mockUser = {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    roles: ['user'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnValue({
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      roles: ['user'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    save: jest.fn().mockResolvedValue({
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn().mockResolvedValue(mockUser),
  };

  // Mock constructor
  const MockUserModel = jest.fn((userData) => {
    const userInstance = {
      ...userData,
      ...mockUser,
      save: jest.fn().mockResolvedValue(mockUser),
      toObject: jest.fn().mockReturnValue({
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    return userInstance;
  }) as any;

  // Assign static methods
  MockUserModel.findOne = mockUserModel.findOne;
  MockUserModel.findById = mockUserModel.findById;
  MockUserModel.create = mockUserModel.create;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access and refresh tokens with user info', async () => {
      const payload = { username: 'testuser', sub: 'user123', roles: ['user'] };
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith(payload);
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload, { expiresIn: '7d' });
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        refresh_token: 'mock-jwt-token',
        user: {
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
        },
      });
    });
  });

  describe('register', () => {
    const userData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    };

    it('should successfully register a new user', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockReturnValue({
        save: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.register(userData);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: userData.email }, { username: userData.username }],
      });
      expect(result).toEqual({
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user'],
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw UnauthorizedException if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.register(userData)).rejects.toThrow('User already exists');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: userData.email }, { username: userData.username }],
      });
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const payload = { sub: 'user123', username: 'testuser', roles: ['user'] };

    it('should return new tokens if refresh token is valid', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.refreshToken(refreshToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken);
      expect(mockUserModel.findById).toHaveBeenCalledWith('user123');
      expect(result).toEqual({
        access_token: 'new-jwt-token',
        refresh_token: 'new-jwt-token',
        user: {
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
        },
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });
});
