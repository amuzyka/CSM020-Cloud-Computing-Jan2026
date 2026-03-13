import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ClientService } from '../services/client.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createClientDto: CreateClientDto) {
    const client = await this.clientService.create(createClientDto);
    
    // Return client without secret for security
    const { clientSecret, ...clientResponse } = client.toObject();
    
    return {
      message: 'Client created successfully',
      client: clientResponse,
      clientSecret: clientSecret, // Only show secret once during creation
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    const clients = await this.clientService.findAll();
    
    // Remove secrets from response
    return {
      clients: clients.map(client => {
        const { clientSecret, ...clientWithoutSecret } = client.toObject();
        return clientWithoutSecret;
      })
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const client = await this.clientService.findById(id);
    
    // Remove secret from response
    const { clientSecret, ...clientWithoutSecret } = client.toObject();
    
    return {
      client: clientWithoutSecret
    };
  }

  @Get(':id/validate')
  @UseGuards(ApiKeyGuard) // Allow API key authentication for validation
  @HttpCode(HttpStatus.OK)
  async validateClient(
    @Param('id') id: string,
    @Body() body: { clientSecret?: string; redirectUri?: string }
  ) {
    const client = await this.clientService.validateClient(id, body.clientSecret);
    
    // Validate redirect URI if provided
    if (body.redirectUri) {
      const isValidUri = await this.clientService.validateRedirectUri(id, body.redirectUri);
      if (!isValidUri) {
        return {
          valid: false,
          error: 'Invalid redirect URI'
        };
      }
    }

    return {
      valid: true,
      client: {
        clientId: client.clientId,
        name: client.name,
        allowedScopes: client.allowedScopes,
        grantTypes: client.grantTypes,
        isPublic: client.isPublic,
      }
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateClientDto>) {
    const client = await this.clientService.update(id, updateData);
    
    // Remove secret from response
    const { clientSecret, ...clientWithoutSecret } = client.toObject();
    
    return {
      message: 'Client updated successfully',
      client: clientWithoutSecret
    };
  }

  @Post(':id/regenerate-secret')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async regenerateSecret(@Param('id') id: string) {
    const { clientSecret } = await this.clientService.regenerateSecret(id);
    
    return {
      message: 'Client secret regenerated successfully',
      clientSecret, // Only show the new secret once
    };
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    const client = await this.clientService.activate(id);
    
    return {
      message: 'Client activated successfully',
      client: {
        clientId: client.clientId,
        name: client.name,
        isActive: client.isActive,
      }
    };
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    const client = await this.clientService.deactivate(id);
    
    return {
      message: 'Client deactivated successfully',
      client: {
        clientId: client.clientId,
        name: client.name,
        isActive: client.isActive,
      }
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.clientService.remove(id);
  }
}
