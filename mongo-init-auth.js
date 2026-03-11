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
// db.clients.insertOne({
//   clientId: "miniwall-client",
//   clientSecret: "miniwall-secret",
//   redirectUris: ["http://localhost:3000/auth/callback"],
//   grants: ["authorization_code", "refresh_token", "client_credentials"],
//   scopes: ["read", "write"]
// });

print('MiniWall Auth Server database initialized successfully');
