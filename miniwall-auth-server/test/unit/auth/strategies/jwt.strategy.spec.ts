import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../../../../src/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user object from payload', async () => {
      const payload = {
        sub: 'user123',
        username: 'testuser',
        roles: ['user'],
        iat: 1647891234,
        exp: 1647894834,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user123',
        username: 'testuser',
        roles: ['user'],
      });
    });

    it('should handle payload with multiple roles', async () => {
      const payload = {
        sub: 'admin123',
        username: 'admin',
        roles: ['user', 'admin'],
        iat: 1647891234,
        exp: 1647894834,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'admin123',
        username: 'admin',
        roles: ['user', 'admin'],
      });
    });

    it('should handle payload with no roles', async () => {
      const payload = {
        sub: 'user123',
        username: 'testuser',
        iat: 1647891234,
        exp: 1647894834,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user123',
        username: 'testuser',
        roles: undefined,
      });
    });
  });
});
