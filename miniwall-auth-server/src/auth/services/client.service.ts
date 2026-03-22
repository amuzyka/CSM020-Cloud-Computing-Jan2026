import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../schemas/client.schema';
import { CreateClientDto } from '../dto/create-client.dto';
import * as crypto from 'crypto';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<ClientDocument> {
    const clientId = this.generateClientId();
    const clientSecret = createClientDto.isPublic ? null : this.generateClientSecret();

    const client = new this.clientModel({
      ...createClientDto,
      clientId,
      clientSecret,
    });

    return client.save();
  }

  async findAll(): Promise<ClientDocument[]> {
    return this.clientModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<ClientDocument> {
    const client = await this.clientModel.findById(id).exec();
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async findByClientId(clientId: string): Promise<ClientDocument> {
    const client = await this.clientModel.findOne({ clientId, isActive: true }).exec();
    if (!client) {
      throw new NotFoundException('Client not found or inactive');
    }
    return client;
  }

  async validateClient(clientId: string, clientSecret?: string): Promise<ClientDocument> {
    const client = await this.findByClientId(clientId);

    // Public clients don't need secret validation
    if (client.isPublic) {
      return client;
    }

    // Confidential clients require secret validation
    if (!clientSecret || client.clientSecret !== clientSecret) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    return client;
  }

  async validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.findByClientId(clientId);
    return client.redirectUris.includes(redirectUri);
  }

  async validateScopes(clientId: string, requestedScopes: string[]): Promise<string[]> {
    const client = await this.findByClientId(clientId);
    
    // Filter to only allowed scopes
    const validScopes = requestedScopes.filter(scope => 
      client.allowedScopes.includes(scope)
    );

    if (validScopes.length === 0) {
      throw new UnauthorizedException('No valid scopes requested');
    }

    return validScopes;
  }

  async update(id: string, updateData: Partial<CreateClientDto>): Promise<ClientDocument> {
    const client = await this.findById(id);
    
    // Don't allow updating client ID or secret through this method
    const { clientId, clientSecret, ...allowedUpdates } = updateData as any;
    
    Object.assign(client, allowedUpdates);
    return client.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.clientModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Client not found');
    }
  }

  async regenerateSecret(clientId: string): Promise<{ clientSecret: string }> {
    const client = await this.findByClientId(clientId);
    
    if (client.isPublic) {
      throw new ConflictException('Public clients do not have secrets');
    }

    const newSecret = this.generateClientSecret();
    client.clientSecret = newSecret;
    await client.save();

    return { clientSecret: newSecret };
  }

  async activate(clientId: string): Promise<Client> {
    const client = await this.findByClientId(clientId);
    client.isActive = true;
    return client.save();
  }

  async deactivate(clientId: string): Promise<Client> {
    const client = await this.findByClientId(clientId);
    client.isActive = false;
    return client.save();
  }

  private generateClientId(): string {
    // Generate a random client ID with prefix
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `client_${randomBytes}`;
  }

  private generateClientSecret(): string {
    // Generate a cryptographically secure client secret
    return crypto.randomBytes(32).toString('hex');
  }
}
