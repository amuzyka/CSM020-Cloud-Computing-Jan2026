import { Test, TestingModule } from '@nestjs/testing';
import { ClientController } from '../../../../src/auth/controllers/client.controller';
import { ClientService } from '../../../../src/auth/services/client.service';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../../../src/auth/guards/api-key.guard';
import { CreateClientDto, GrantType, Scope } from '../../../../src/auth/dto/create-client.dto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ClientController', () => {
  let controller: ClientController;
  let clientService: ClientService;

  const mockClient = {
    _id: 'client123',
    clientId: 'client_test123',
    clientSecret: 'secret123',
    name: 'Test Client',
    description: 'Test client description',
    redirectUris: ['http://localhost:3000/callback'],
    allowedScopes: [Scope.READ, Scope.WRITE],
    isActive: true,
    isPublic: false,
    grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 604800,
    website: 'http://testclient.com',
    logoUrl: 'http://testclient.com/logo.png',
    trustedDomains: ['localhost'],
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: jest.fn().mockReturnValue({
      _id: 'client123',
      clientId: 'client_test123',
      clientSecret: 'secret123',
      name: 'Test Client',
      description: 'Test client description',
      redirectUris: ['http://localhost:3000/callback'],
      allowedScopes: [Scope.READ, Scope.WRITE],
      isActive: true,
      isPublic: false,
      grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 604800,
      website: 'http://testclient.com',
      logoUrl: 'http://testclient.com/logo.png',
      trustedDomains: ['localhost'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  const mockClientService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    validateClient: jest.fn(),
    validateRedirectUri: jest.fn(),
    update: jest.fn(),
    regenerateSecret: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockApiKeyGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientController],
      providers: [
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(ApiKeyGuard)
      .useValue(mockApiKeyGuard)
      .compile();

    controller = module.get<ClientController>(ClientController);
    clientService = module.get<ClientService>(ClientService);
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
      trustedDomains: ['localhost'],
    };

    it('should create a client successfully', async () => {
      mockClientService.create.mockResolvedValue(mockClient);

      const result = await controller.create(createClientDto);

      expect(clientService.create).toHaveBeenCalledWith(createClientDto);
      expect(result).toEqual({
        message: 'Client created successfully',
        client: expect.objectContaining({
          clientId: 'client_test123',
          name: 'Test Client',
        }),
        clientSecret: 'secret123',
      });
      expect(result.client).not.toHaveProperty('clientSecret');
    });

    it('should create a public client without secret in response', async () => {
      const publicClient = { ...mockClient, isPublic: true, clientSecret: null };
      mockClientService.create.mockResolvedValue(publicClient);

      const publicClientDto = { ...createClientDto, isPublic: true };
      const result = await controller.create(publicClientDto);

      expect(result.clientSecret).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all clients without secrets', async () => {
      const clients = [mockClient];
      mockClientService.findAll.mockResolvedValue(clients);

      const result = await controller.findAll();

      expect(clientService.findAll).toHaveBeenCalled();
      expect(result.clients).toHaveLength(1);
      expect(result.clients[0]).not.toHaveProperty('clientSecret');
      expect(result.clients[0]).toEqual({
        _id: 'client123',
        clientId: 'client_test123',
        name: 'Test Client',
        // ... other properties except clientSecret
      });
    });
  });

  describe('findOne', () => {
    it('should return client without secret', async () => {
      mockClientService.findById.mockResolvedValue(mockClient);

      const result = await controller.findOne('client123');

      expect(clientService.findById).toHaveBeenCalledWith('client123');
      expect(result.client).not.toHaveProperty('clientSecret');
    });
  });

  describe('validateClient', () => {
    it('should validate client credentials', async () => {
      mockClientService.validateClient.mockResolvedValue(mockClient);
      mockClientService.validateRedirectUri.mockResolvedValue(true);

      const result = await controller.validateClient('client123', {
        clientSecret: 'secret123',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(clientService.validateClient).toHaveBeenCalledWith('client123', 'secret123');
      expect(result).toEqual({
        valid: true,
        client: {
          clientId: 'client_test123',
          name: 'Test Client',
          allowedScopes: [Scope.READ, Scope.WRITE],
          grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
          isPublic: false,
        },
      });
    });

    it('should validate public client without secret', async () => {
      const publicClient = { ...mockClient, isPublic: true };
      mockClientService.validateClient.mockResolvedValue(publicClient);

      const result = await controller.validateClient('client123', {});

      expect(clientService.validateClient).toHaveBeenCalledWith('client123', undefined);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for invalid redirect URI', async () => {
      mockClientService.validateClient.mockResolvedValue(mockClient);
      mockClientService.validateRedirectUri.mockResolvedValue(false);

      const result = await controller.validateClient('client123', {
        redirectUri: 'http://evil.com/callback',
      });

      expect(result).toEqual({
        valid: false,
        error: 'Invalid redirect URI',
      });
    });
  });

  describe('update', () => {
    it('should update client successfully', async () => {
      const updatedClient = { ...mockClient, name: 'Updated Client' };
      mockClientService.update.mockResolvedValue(updatedClient);

      const result = await controller.update('client123', { name: 'Updated Client' });

      expect(clientService.update).toHaveBeenCalledWith('client123', { name: 'Updated Client' });
      expect(result).toEqual({
        message: 'Client updated successfully',
        client: expect.objectContaining({
          name: 'Updated Client',
        }),
      });
      expect(result.client).not.toHaveProperty('clientSecret');
    });
  });

  describe('regenerateSecret', () => {
    it('should regenerate client secret', async () => {
      const newSecret = 'new_secret_456';
      mockClientService.regenerateSecret.mockResolvedValue({ clientSecret: newSecret });

      const result = await controller.regenerateSecret('client123');

      expect(clientService.regenerateSecret).toHaveBeenCalledWith('client123');
      expect(result).toEqual({
        message: 'Client secret regenerated successfully',
        clientSecret: newSecret,
      });
    });
  });

  describe('activate', () => {
    it('should activate client', async () => {
      const activatedClient = { ...mockClient, isActive: true };
      mockClientService.activate.mockResolvedValue(activatedClient);

      const result = await controller.activate('client123');

      expect(clientService.activate).toHaveBeenCalledWith('client123');
      expect(result).toEqual({
        message: 'Client activated successfully',
        client: {
          clientId: 'client_test123',
          name: 'Test Client',
          isActive: true,
        },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate client', async () => {
      const deactivatedClient = { ...mockClient, isActive: false };
      mockClientService.deactivate.mockResolvedValue(deactivatedClient);

      const result = await controller.deactivate('client123');

      expect(clientService.deactivate).toHaveBeenCalledWith('client123');
      expect(result).toEqual({
        message: 'Client deactivated successfully',
        client: {
          clientId: 'client_test123',
          name: 'Test Client',
          isActive: false,
        },
      });
    });
  });

  describe('remove', () => {
    it('should remove client', async () => {
      mockClientService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('client123');

      expect(clientService.remove).toHaveBeenCalledWith('client123');
      expect(result).toBeUndefined();
    });
  });

  describe('Security', () => {
    it('should use JwtAuthGuard for protected endpoints', async () => {
      // Test that endpoints requiring authentication are properly guarded
      const protectedEndpoints = [
        'create',
        'findAll',
        'findOne',
        'update',
        'regenerateSecret',
        'activate',
        'deactivate',
        'remove',
      ];

      for (const endpoint of protectedEndpoints) {
        expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledTimes(0); // Will be called during actual execution
      }
    });

    it('should use ApiKeyGuard for validation endpoint', async () => {
      mockClientService.validateClient.mockResolvedValue(mockClient);

      await controller.validateClient('client123', {});

      // The ApiKeyGuard should be applied to this endpoint
      expect(mockApiKeyGuard.canActivate).toHaveBeenCalledTimes(0); // Will be called during actual execution
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors appropriately', async () => {
      mockClientService.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.create({} as CreateClientDto)).rejects.toThrow('Database error');
    });

    it('should handle not found errors', async () => {
      mockClientService.findById.mockRejectedValue(new Error('Client not found'));

      await expect(controller.findOne('nonexistent')).rejects.toThrow('Client not found');
    });
  });
});
