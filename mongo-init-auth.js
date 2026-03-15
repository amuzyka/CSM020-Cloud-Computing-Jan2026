// MongoDB initialization script for Auth Server
db = db.getSiblingDB('miniwall-auth');

// Create collections
db.createCollection('users');
db.createCollection('clients');
db.createCollection('tokens');
db.createCollection('authorizationcodes');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.clients.createIndex({ "clientId": 1 }, { unique: true });
db.tokens.createIndex({ "token": 1 }, { unique: true });
db.tokens.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
db.authorizationcodes.createIndex({ "code": 1 }, { unique: true });
db.authorizationcodes.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

// Insert default OAuth2 client
db.clients.insertOne({
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
});

print('MiniWall Auth Server database initialized successfully');
