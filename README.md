# CSM020-Cloud-Computing-Jan2026




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


OAuth2 Authorization Server Complete
Key Features:
    NestJS Framework with TypeScript
    MongoDB Integration using Mongoose
    OAuth2 Endpoints: /oauth/authorize, /oauth/token, /oauth/introspect, /oauth/revoke
    JWT Authentication with access and refresh tokens
    User Management with registration, login, and profile endpoints
    Security: Password hashing, JWT strategies, guards


API Endpoints:
    Authentication: POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh
    OAuth2: GET /api/oauth/authorize, POST /api/oauth/token, POST /api/oauth/introspect
    Profile: GET /api/auth/profile (protected)




Yes, exactly! You've got the OAuth2 architecture correct:

OAuth2 Architecture Overview
mini-wall-auth-server = Authorization Server
Responsibilities:
User authentication (login/register)
Token issuance (access tokens, refresh tokens)
OAuth2 authorization flows
Token validation and introspection
Endpoints: /oauth/authorize, /oauth/token, /oauth/introspect, /oauth/revoke
mini-wall-app = Resource Server
Responsibilities:
Hosts the actual application resources (posts, comments, etc.)
Validates access tokens from the authorization server
Protects API endpoints based on token scopes
Serves the main application functionality
OAuth2 Flow:
Client (frontend app) requests authorization from Authorization Server
Authorization Server authenticates user and issues access token
Client presents access token to Resource Server
Resource Server validates token with Authorization Server
Resource Server returns protected resource if token is valid
This separation provides better security, scalability, and follows OAuth2 best practices where authentication and resource management are handled by different services.

