// MongoDB initialization script for Auth Server
db = db.getSiblingDB('miniwall-auth');

// Read OAuth2 credentials from environment variables with defaults
const clientId = process.env.OAUTH2_CLIENT_ID || 'miniwall-client';
const clientSecret = process.env.OAUTH2_CLIENT_SECRET || 'miniwall-client-secret';

// Insert default OAuth2 client
db.clients.insertOne({
  clientId: clientId,
  clientSecret: clientSecret,
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
print('OAuth2 client created: ' + clientId);
