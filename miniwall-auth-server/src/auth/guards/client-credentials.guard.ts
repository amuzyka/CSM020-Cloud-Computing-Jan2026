import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClientService } from '../services/client.service';

@Injectable()
export class ClientCredentialsGuard implements CanActivate {
  constructor(private clientService: ClientService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract client credentials from request
    let clientId: string;
    let clientSecret: string;

    // Try Basic Authentication first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
      [clientId, clientSecret] = credentials.split(':');
    } else {
      // Fall back to request body
      clientId = request.body.client_id;
      clientSecret = request.body.client_secret;
    }

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Client credentials are required');
    }

    // Validate client against MongoDB
    const client = await this.clientService.validateClient(clientId, clientSecret);
    
    if (!client) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    if (!client.isActive) {
      throw new UnauthorizedException('Client is not active');
    }

    // Attach client to request for use in controllers
    request.client = client;
    
    return true;
  }
}
