import { Test, TestingModule } from '@nestjs/testing';
import { ClientService } from '../../../../src/auth/services/client.service';
import { getModelToken } from '@nestjs/mongoose';
import { Client, ClientDocument } from '../../../../src/auth/schemas/client.schema';
import { Model } from 'mongoose';
import { CreateClientDto, GrantType, Scope } from '../../../../src/auth/dto/create-client.dto';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('ClientService', () => {
  let service: ClientService;
  let clientModel: Model<ClientDocument>;

  const mockClient = {
    _id: 'client123',
    clientId: 'client_test123',
    clientSecret: 'secret123',
    name: 'Test Client',
    description: 'Test client description',
    redirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/auth/callback'],
    allowedScopes: [Scope.READ, Scope.WRITE],
    isActive: true,
    isPublic: false,
    grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 604800,
    website: 'http://testclient.com',
    logoUrl: 'http://testclient.com/logo.png',
    trustedDomains: ['localhost', 'testclient.com'],
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnValue({
      _id: 'client123',
      clientId: 'client_test123',
      clientSecret: 'secret123',
      name: 'Test Client',
      description: 'Test client description',
      redirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/auth/callback'],
      allowedScopes: [Scope.READ, Scope.WRITE],
      isActive: true,
      isPublic: false,
      grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 604800,
      website: 'http://testclient.com',
      logoUrl: 'http://testclient.com/logo.png',
      trustedDomains: ['localhost', 'testclient.com'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    save: jest.fn().mockResolvedValue({
      _id: 'client123',
      clientId: 'client_test123',
      clientSecret: 'secret123',
      name: 'Test Client',
      description: 'Test client description',
      redirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/auth/callback'],
      allowedScopes: [Scope.READ, Scope.WRITE],
      isActive: true,
      isPublic: false,
      grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 604800,
      website: 'http://testclient.com',
      logoUrl: 'http://testclient.com/logo.png',
      trustedDomains: ['localhost', 'testclient.com'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  const mockClientModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClient]),
      }),
    }),
    findByIdAndDelete: jest.fn(),
    constructor: jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue(mockClient),
    })),
  };

  // Mock the constructor function
  const MockClientModel = jest.fn((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue(mockClient),
    toObject: jest.fn().mockReturnValue(mockClient),
  })) as any;

  MockClientModel.findOne = mockClientModel.findOne;
  MockClientModel.findById = mockClientModel.findById;
  MockClientModel.find = mockClientModel.find;
  MockClientModel.findByIdAndDelete = mockClientModel.findByIdAndDelete;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        {
          provide: getModelToken(Client.name),
          useValue: MockClientModel,
        },
      ],
    }).compile();

    service = module.get<ClientService>(ClientService);
    clientModel = module.get<Model<ClientDocument>>(getModelToken(Client.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createClientDto: CreateClientDto = {
      name: 'Test Client',
      description: 'Test client description',
      redirectUris: ['http://localhost:3000/callback'],
      allowedScopes: [Scope.READ, Scope.WRITE],
      grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
      website: 'http://testclient.com',
      logoUrl: 'http://testclient.com/logo.png',
      trustedDomains: ['localhost', 'testclient.com'],
    };

    it('should create a confidential client with secret', async () => {
      const result = await service.create(createClientDto);

      expect(MockClientModel).toHaveBeenCalledWith({
        ...createClientDto,
        clientId: expect.stringMatching(/^client_[a-f0-9]{32}$/),
        clientSecret: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(result).toEqual(mockClient);
    });

    it('should create a public client without secret', async () => {
      const publicClientDto = { ...createClientDto, isPublic: true };
      const result = await service.create(publicClientDto);

      expect(MockClientModel).toHaveBeenCalledWith({
        ...publicClientDto,
        clientId: expect.stringMatching(/^client_[a-f0-9]{32}$/),
        clientSecret: null,
      });
      expect(result).toEqual(mockClient);
    });

    it('should generate unique client IDs', async () => {
      await service.create(createClientDto);
      await service.create({ ...createClientDto, name: 'Another Client' });

      expect(MockClientModel).toHaveBeenCalledTimes(2);
      const firstCall = MockClientModel.mock.calls[0][0];
      const secondCall = MockClientModel.mock.calls[1][0];
      expect(firstCall.clientId).not.toBe(secondCall.clientId);
    });

    it('should generate cryptographically secure secrets', async () => {
      await service.create(createClientDto);

      const call = MockClientModel.mock.calls[0][0];
      expect(call.clientSecret).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars = 32 bytes
    });
  });

  describe('findAll', () => {
    it('should return all clients sorted by creation date', async () => {
      const result = await service.findAll();

      expect(mockClientModel.find).toHaveBeenCalled();
      expect(result).toEqual([mockClient]);
    });
  });

  describe('findById', () => {
    it('should return client when found', async () => {
      mockClientModel.findById.mockResolvedValue(mockClient);

      const result = await service.findById('client123');

      expect(mockClientModel.findById).toHaveBeenCalledWith('client123');
      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundException when client not found', async () => {
      mockClientModel.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockClientModel.findById).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('findByClientId', () => {
    it('should return active client when found', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.findByClientId('client_test123');

      expect(mockClientModel.findOne).toHaveBeenCalledWith({
        clientId: 'client_test123',
        isActive: true,
      });
      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundException when client not found', async () => {
      mockClientModel.findOne.mockResolvedValue(null);

      await expect(service.findByClientId('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when client is inactive', async () => {
      const inactiveClient = { ...mockClient, isActive: false };
      mockClientModel.findOne.mockResolvedValue(inactiveClient);

      await expect(service.findByClientId('inactive_client')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateClient', () => {
    it('should validate confidential client with correct secret', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.validateClient('client_test123', 'secret123');

      expect(result).toEqual(mockClient);
    });

    it('should validate public client without secret', async () => {
      const publicClient = { ...mockClient, isPublic: true };
      mockClientModel.findOne.mockResolvedValue(publicClient);

      const result = await service.validateClient('client_test123');

      expect(result).toEqual(publicClient);
    });

    it('should throw UnauthorizedException for confidential client with wrong secret', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      await expect(service.validateClient('client_test123', 'wrong_secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for confidential client without secret', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      await expect(service.validateClient('client_test123')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException for non-existent client', async () => {
      mockClientModel.findOne.mockResolvedValue(null);

      await expect(service.validateClient('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateRedirectUri', () => {
    it('should validate correct redirect URI', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.validateRedirectUri('client_test123', 'http://localhost:3000/callback');

      expect(result).toBe(true);
    });

    it('should reject invalid redirect URI', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.validateRedirectUri('client_test123', 'http://evil.com/callback');

      expect(result).toBe(false);
    });

    it('should throw NotFoundException for non-existent client', async () => {
      mockClientModel.findOne.mockResolvedValue(null);

      await expect(service.validateRedirectUri('nonexistent', 'http://localhost:3000/callback')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateScopes', () => {
    it('should return valid scopes when all are allowed', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.validateScopes('client_test123', ['read', 'write']);

      expect(result).toEqual(['read', 'write']);
    });

    it('should filter to only allowed scopes', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      const result = await service.validateScopes('client_test123', ['read', 'write', 'admin']);

      expect(result).toEqual(['read', 'write']);
    });

    it('should throw UnauthorizedException when no valid scopes', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);

      await expect(service.validateScopes('client_test123', ['admin', 'superuser'])).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException for non-existent client', async () => {
      mockClientModel.findOne.mockResolvedValue(null);

      await expect(service.validateScopes('nonexistent', ['read'])).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update client successfully', async () => {
      mockClientModel.findById.mockResolvedValue(mockClient);
      const updatedClient = { ...mockClient, name: 'Updated Client' };
      mockClient.save.mockResolvedValue(updatedClient);

      const result = await service.update('client123', { name: 'Updated Client' });

      expect(mockClientModel.findById).toHaveBeenCalledWith('client123');
      expect(result.name).toBe('Updated Client');
    });

    it('should throw NotFoundException for non-existent client', async () => {
      mockClientModel.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Updated' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove client successfully', async () => {
      mockClientModel.findByIdAndDelete.mockResolvedValue(mockClient);

      await service.remove('client123');

      expect(mockClientModel.findByIdAndDelete).toHaveBeenCalledWith('client123');
    });

    it('should throw NotFoundException for non-existent client', async () => {
      mockClientModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerateSecret', () => {
    it('should regenerate secret for confidential client', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);
      const newSecret = 'new_secret_123';
      mockClient.save.mockResolvedValue({ ...mockClient, clientSecret: newSecret });

      const result = await service.regenerateSecret('client_test123');

      expect(result.clientSecret).toBe(newSecret);
      expect(mockClient.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for public client', async () => {
      const publicClient = { ...mockClient, isPublic: true };
      mockClientModel.findOne.mockResolvedValue(publicClient);

      await expect(service.regenerateSecret('public_client')).rejects.toThrow(ConflictException);
    });
  });

  describe('activate', () => {
    it('should activate client successfully', async () => {
      const inactiveClient = { ...mockClient, isActive: false };
      mockClientModel.findOne.mockResolvedValue(inactiveClient);
      const activatedClient = { ...inactiveClient, isActive: true };
      mockClient.save.mockResolvedValue(activatedClient);

      const result = await service.activate('client_test123');

      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should deactivate client successfully', async () => {
      mockClientModel.findOne.mockResolvedValue(mockClient);
      const deactivatedClient = { ...mockClient, isActive: false };
      mockClient.save.mockResolvedValue(deactivatedClient);

      const result = await service.deactivate('client_test123');

      expect(result.isActive).toBe(false);
    });
  });
});
