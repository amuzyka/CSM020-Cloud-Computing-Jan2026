// MongoDB initialization script for OAuth2 clients
// This script creates a default OAuth2 client for the MiniWall application

db = db.getSiblingDB('miniwall-auth-dev');

// Create clients collection
db.createCollection('clients');

// Create default client for MiniWall application
const defaultClient = {
  clientId: 'miniwall-client',
  clientSecret: 'miniwall-client-secret',
  name: 'MiniWall Application',
  description: 'Default OAuth2 client for MiniWall web application',
  redirectUris: [
    'http://localhost:3000/callback',
    'http://localhost:3000/auth/callback',
    'http://127.0.0.1:3000/callback'
  ],
  allowedScopes: ['read', 'write', 'profile', 'email'],
  isActive: true,
  isPublic: false,
  grantTypes: ['authorization_code', 'refresh_token', 'client_credentials'],
  accessTokenLifetime: 3600, // 1 hour
  refreshTokenLifetime: 604800, // 7 days
  website: 'http://localhost:3000',
  trustedDomains: ['localhost', '127.0.0.1'],
  createdAt: new Date(),
  updatedAt: new Date()
};

// Insert default client
db.clients.insertOne(defaultClient);

// Create indexes for efficient lookups
db.clients.createIndex({ clientId: 1 }, { unique: true });
db.clients.createIndex({ isActive: 1 });
db.clients.createIndex({ createdAt: -1 });

print('OAuth2 client initialization completed successfully');
print('Default client created:');
print('- Client ID: miniwall-client');
print('- Client Secret: miniwall-client-secret');
print('- Allowed Scopes: read, write, profile, email');
print('- Grant Types: authorization_code, refresh_token, client_credentials');
