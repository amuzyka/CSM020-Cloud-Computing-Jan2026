// MongoDB initialization script for Auth Server
db = db.getSiblingDB('miniwall-auth');

// Insert default OAuth2 client
db.clients.insertOne({
  clientId: 'miniwall-client',
  clientSecret: 'miniwall-client-secret',
  name: 'MiniWall Application',
  description: 'Default OAuth2 client for MiniWall web application',
  redirectUris: [
    'http://localhost/callback',
    'http://localhost/auth/callback',
    'http://127.0.0.1/callback'
  ],
  allowedScopes: ['read', 'write', 'profile', 'email'],
  isActive: true,
  isPublic: false,
  grantTypes: ['authorization_code', 'refresh_token', 'client_credentials'],
  accessTokenLifetime: 3600, // 1 hour
  refreshTokenLifetime: 604800, // 7 days
  website: 'http://localhost',
  trustedDomains: ['localhost', '127.0.0.1'],
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Auth database initialized');
