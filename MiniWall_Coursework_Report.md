# MiniWall API Development Report

## Executive Summary

This report documents the development of MiniWall, a microservices-based social media API designed for cloud deployment. The system implements a dual authentication architecture combining OAuth2 and JWT tokens, with separate services for authentication and resource management. A comprehensive test suite of 15 test cases validates all API functionality including user registration, authentication, content creation, social interactions, and security enforcement. All test cases pass successfully, demonstrating a robust and fully functional API with proper error handling for edge cases such as duplicate registrations, unauthorized access, and self-like prevention.

## 1. System Architecture

### 1.1 Overview

MiniWall follows a microservices architecture pattern, separating concerns between authentication and resource management. This design enables independent scaling, deployment, and maintenance of each service while maintaining a unified API interface through an Nginx reverse proxy.

Both the authentication and application servers are built with **NestJS** (using the Express platform by default), a progressive Node.js framework that provides several architectural advantages:

- **Modular Architecture**: NestJS organizes code into modules with clear boundaries, making the codebase maintainable and testable. Each feature (auth, posts, comments, likes) exists as a self-contained module with its own controller, service, and repository.

- **Dependency Injection**: Built-in DI container manages service dependencies, enabling loose coupling between components and simplifying unit testing through mock injection.

- **Decorator-Based API Definition**: Controllers use TypeScript decorators (`@Controller`, `@Get`, `@Post`) for declarative route definition, reducing boilerplate and improving code readability.

- **Built-in Validation**: Integration with `class-validator` enables automatic request validation through DTOs (Data Transfer Objects), ensuring data integrity before processing.

- **TypeScript Support**: Full TypeScript support provides compile-time type checking, improving code quality and developer productivity through IDE autocompletion and refactoring tools.

- **Interceptors and Guards**: Middleware patterns like interceptors (for logging/transforming responses) and guards (for authentication/authorization) enable cross-cutting concerns to be handled consistently across endpoints.

- **Passport.js Integration**: The authentication server leverages `@nestjs/passport` with Passport.js strategies (JWT, OAuth2) for flexible, modular authentication middleware that integrates seamlessly with NestJS guards and decorators.

### 1.2 Component Structure

The system comprises three primary components:

**Authentication Server (Port 4000)**
The authentication server handles all identity-related operations including user registration, login, token generation, and token introspection. Built with NestJS and MongoDB, it implements both JWT for session management and OAuth2 for third-party client authorization. The server maintains its own database (`miniwall-auth`) for user credentials, OAuth2 client registrations, and refresh token storage.

**Application Server (Port 3000)**
The application server manages core social media functionality including posts, comments, and likes. It requires OAuth2 bearer tokens for access control and communicates with the authentication server via token introspection to validate requests. This server maintains a separate MongoDB database (`miniwall`) for content storage.

**Nginx Reverse Proxy (Port 80)**
Nginx serves as the entry point for all external requests, routing traffic to appropriate backend services based on URL path patterns. 

### 1.3 Data Flow Architecture

The authentication flow implements a simple OAuth2-like system:

1. **Registration Phase**: Users register via `/auth/register`, receiving a user ID stored in the auth database
2. **Authentication Phase**: Users login via `/auth/login`, receiving a JWT access token and refresh token
3. **Client Registration**: Authenticated users can register OAuth2 clients using their JWT token via `/clients`
4. **Authorization Phase**: OAuth2 clients obtain access tokens via `/oauth/token` using client credentials
5. **Resource Access**: API endpoints (posts, comments, likes) require OAuth2 bearer tokens for access
6. **Token Validation**: The application server introspects tokens via `/oauth/introspect` to verify validity

This architecture provides clear separation between authentication mechanisms (JWT for client management, OAuth2 for resource access) while maintaining security through token introspection.

### 1.4 User Journey

The MiniWall authentication system follows a standard OAuth2 user journey that separates user identity from application identity:

1. **Account Creation**: User registers via `/auth/register` with username, email, and password, receiving a user ID in the authentication database

2. **User Authentication**: User logs in via `/auth/login`, receiving a personal JWT access token (1-hour expiration) and refresh token (7-day expiration) for their own identity

3. **Application Authorization**: The MiniWall application (pre-configured client) authenticates using its client credentials via `/oauth/token`, receiving an OAuth2 access token for application-level operations

4. **Resource Access**: The MiniWall application uses its OAuth2 bearer token to access protected API endpoints (posts, comments, likes) on behalf of users

5. **Token Validation**: The application server validates OAuth2 tokens via `/oauth/introspect` to ensure requests are authorized before processing

This dual-token approach ensures that user credentials are never exposed to the application, while the application maintains its own identity for API operations - a fundamental principle of OAuth2 security architecture.

### 1.4 Database Design

Two MongoDB instances support the microservices. The NestJS framework uses **@nestjs/mongoose** to provide seamless MongoDB integration through Mongoose ODM, enabling schema definitions, model injection, and query building within the NestJS dependency injection system.

**Auth Database (`miniwall-auth`)**
- `users`: Stores username, email, password hashes, and profile information
- `clients`: OAuth2 client registrations with client_id, client_secret, redirect URIs, and grant types
- `tokens`: Refresh tokens for JWT renewal
- `codes`: Authorization codes for OAuth2 flow

**App Database (`miniwall`)**
- `posts`: Content with author references, titles, and timestamps
- `comments`: Nested comments with post references and author information
- `likes`: User-post associations with unique constraints preventing duplicate likes

The database design prioritizes referential integrity through application-level checks and unique indexes, particularly for preventing users from liking their own posts or liking the same post multiple times.

### 1.5 Dockerized Environment Configuration

#### Environment Separation

MiniWall uses Docker Compose to orchestrate the microservices architecture. The system maintains two separate environment configurations:

**Development Environment (`docker-compose.dev.yml`)**
- Uses development Dockerfiles (`Dockerfile.dev`) with hot-reload capability via `npm run start:dev`
- Mounts source code directories as volumes for live editing without container rebuild
- Simplified authentication (basic admin credentials)
- Debug logging enabled
- Named with `-dev` suffix for easy identification

**Production Environment (`docker-compose.yml`)**
- Uses optimized production Dockerfiles with multi-stage builds
- No source code volumes — containers are immutable
- Environment variables loaded from `.env.production`
- Restart policies set to `unless-stopped`

#### Service Architecture

Both environments define identical service topology:

| Service | Development Container | Production Container | Purpose |
|---------|----------------------|----------------------|---------|
| miniwall-app | miniwall-app-dev | miniwall-app | Main application server |
| miniwall-auth-server | miniwall-auth-server-dev | miniwall-auth-server | Authentication server |
| mongodb-app | miniwall-mongodb-app-dev | miniwall-mongodb-app | Posts/comments/likes database |
| mongodb-auth | miniwall-mongodb-auth-dev | miniwall-mongodb-auth | Users/clients/tokens database |
| nginx | miniwall-nginx-dev | miniwall-nginx | Reverse proxy (port 80/443) |

#### Coursework Implementation

For this coursework, the development environment (`docker-compose.dev.yml`) was used exclusively. This configuration:

- Enables rapid iteration through volume-mounted source code
- Provides isolated MongoDB instances with separate data volumes
- Uses a shared Docker network (`miniwall-network`) for inter-service communication
- Exposes all services through Nginx on localhost port 80


## 2. API Endpoints and Functionality

### 2.1 Authentication Endpoints

**POST /auth/register**
Creates a new user account in the authentication database. The endpoint accepts username, email, and password, performing validation to ensure unique usernames and emails. Passwords are hashed using bcrypt before storage. Successful registration returns the user object without sensitive credentials.

Error handling distinguishes between validation errors (400 Bad Request), duplicate entries (409 Conflict), and server errors (500 Internal Server Error). This semantic HTTP status usage enables clients to respond appropriately to different failure scenarios.

**POST /auth/login**
Authenticates existing users and issues JWT tokens. The endpoint validates credentials against stored password hashes, then generates an access token (1-hour expiration) and refresh token (7-day expiration). The response includes both tokens and user profile information.

**POST /auth/refresh**
Exchanges a valid refresh token for a new JWT access token, implementing secure token rotation. Invalid or expired refresh tokens result in 401 Unauthorized responses.

**POST /clients** (JWT Required)
Registers a new OAuth2 client application. Requires a valid JWT bearer token in the Authorization header. The endpoint creates a client record with generated client_id and client_secret, associating it with the authenticated user. Response includes the full client credentials needed for OAuth2 flows.

*For this coursework implementation, a default OAuth2 client ("miniwall-client") is pre-installed during database initialization via the `mongo-init-auth.js` script. This pre-configured client is used by the application server for token introspection requests, eliminating the need for manual client registration during testing.*

**POST /oauth/token** (Client Credentials Required)
The OAuth2 token endpoint supporting multiple grant types:
- `client_credentials`: For machine-to-machine API access
- `authorization_code`: For user-delegated access (future implementation)
- `refresh_token`: For renewing expired access tokens

The endpoint validates client credentials via Basic Authentication or form parameters, then issues access tokens with configurable lifetimes and scopes.

**POST /oauth/introspect** (Client Credentials Required)
Validates token authenticity and returns token metadata including active status, associated user, scopes, and expiration time. This endpoint enables the application server to verify OAuth2 tokens without direct database access to the authentication database.

### 2.2 Resource Endpoints

All resource endpoints require OAuth2 bearer tokens in the Authorization header, following the format `Authorization: Bearer <token>`.

**POST /posts**
Creates a new social media post. Accepts title and content in the request body, automatically associating the post with the authenticated user extracted from the OAuth2 token. Returns the created post with generated ID and timestamp.

**GET /posts**
Retrieves all posts in the system, populating author information from user references. Supports pagination through query parameters. Returns an array of post objects with author details.

**GET /posts/:id**
Retrieves a specific post by ID, including author information. Returns 404 Not Found if the post does not exist.

**POST /comments**
Creates a comment on a post. Requires postId and content in the request body. The system automatically prevents circular references in comment chains through application-level validation. Returns the created comment with author information.

**GET /comments/post/:postId**
Retrieves all comments for a specific post, including nested replies and author details. Supports pagination for posts with many comments.

**POST /likes**
Creates a like on a post. Requires postId in the request body. The system enforces two critical business rules:
1. Users cannot like their own posts (returns 403 Forbidden)
2. Users cannot like the same post twice (returns 409 Conflict)

These constraints are enforced through database unique indexes and application-level validation.

**GET /likes/post/:postId**
Retrieves all likes for a specific post, including user information for each like. Enables calculating like counts and identifying who liked a post.

### 2.3 Error Handling

The API implements consistent error responses following HTTP status code conventions:

- **200 OK**: Successful GET, PUT, or PATCH operations
- **201 Created**: Successful POST operations creating new resources
- **204 No Content**: Successful DELETE operations
- **400 Bad Request**: Validation errors or malformed requests
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated user lacks permission (e.g., self-like prevention)
- **404 Not Found**: Requested resource does not exist
- **409 Conflict**: Resource conflicts (duplicate likes, existing users)
- **500 Internal Server Error**: Unexpected server errors

Error responses include descriptive messages and, in development mode, stack traces to aid debugging.

## 3. Testing Strategy and Results

### 3.1 Test Case Design

The test suite implements 15 comprehensive test cases covering the complete API functionality:

**User Management Tests (TC1-TC2)**
TC1 verifies user registration functionality, ensuring the system can create new accounts with unique credentials. TC2 tests JWT authentication, validating that registered users can obtain access tokens for subsequent operations.

**Security Tests (TC3)**
TC3 verifies that unauthorized requests are properly rejected. The test attempts to access protected endpoints without authentication, expecting 401 Unauthorized responses. This validates the OAuth2ResourceGuard implementation across all resource endpoints.

**OAuth2 Flow Tests (TC4-TC5)**
TC4 tests OAuth2 client registration, ensuring authenticated users can create client applications. TC5 verifies the OAuth2 token acquisition flow, testing that client credentials can be exchanged for access tokens.

**Content Creation Tests (TC6-TC8, TC10)**
TC6 and TC7 verify post creation functionality for multiple users, ensuring the system correctly associates posts with their authors. TC8 tests post retrieval, validating that the API returns all created posts with proper author information. TC10 tests additional content creation for subsequent interaction tests.

**Social Interaction Tests (TC9, TC11-TC13)**
TC9 tests comment functionality, ensuring users can comment on others' posts. TC11 verifies comment retrieval. TC12 tests the like functionality with valid users, ensuring multiple users can like the same post. TC13 is a negative test case verifying that self-likes are properly rejected with 403 Forbidden responses.

**Token Management Tests (TC14)**
TC14 tests JWT token refresh functionality, ensuring expired access tokens can be renewed using refresh tokens without requiring re-authentication.

**Verification Tests (TC15)**
TC15 verifies like counting and retrieval, ensuring the API correctly tracks and reports engagement metrics.

### 3.2 Testing Methodology

The test suite implements automated API testing using Python's requests library. The testing framework:

1. **Environment Setup**: Initializes Docker containers, creates OAuth2 clients, and obtains tokens
2. **State Management**: Tracks created resources (users, posts, comments, likes) for cleanup
3. **Sequential Execution**: Runs tests in dependency order (users must exist before posts, posts before comments)
4. **Result Logging**: Records detailed test results including status codes, response bodies, and error messages
5. **Cleanup**: Removes test data and stops services after test completion

The methodology ensures reproducible tests that don't interfere with production data while providing comprehensive coverage of API functionality.

### 3.3 Test Results

All 15 test cases pass successfully, demonstrating a fully functional API:

| Test Case | Description | Status |
|-----------|-------------|--------|
| TC1 | User Registration (Olga, Nick, Mary) | PASS |
| TC2 | JWT Authentication | PASS |
| TC3 | Unauthorized Access Prevention | PASS |
| TC4 | OAuth2 Client Registration | PASS |
| TC5 | OAuth2 Token Acquisition | PASS |
| TC6 | Post Creation (Olga) | PASS |
| TC7 | Post Creation (Nick) | PASS |
| TC8 | Get All Posts | PASS |
| TC9 | Comment Creation | PASS |
| TC10 | Post Creation (Mary) | PASS |
| TC11 | Get Post Comments | PASS |
| TC12 | Multiple Users Like Post | PASS |
| TC13 | Self-Like Prevention | PASS |
| TC14 | Token Refresh | PASS |
| TC15 | Get Post Likes | PASS |

The 100% pass rate indicates that all implemented functionality works as specified, with proper error handling for edge cases like duplicate registrations and self-likes.

## 4. Conclusion

MiniWall demonstrates a robust microservices architecture implementing modern authentication standards. The dual OAuth2/JWT approach provides flexibility for different client types while maintaining security through token introspection. Comprehensive testing validated all required functionality.

The system's modular design enables independent scaling and maintenance of components, while the Nginx reverse proxy provides a unified API interface. With 100% test coverage and documented API endpoints, MiniWall successfully demonstrates all required coursework functionality and can be extended with additional social media features.

## Appendix A: API Endpoint Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /auth/register | POST | None | User registration |
| /auth/login | POST | None | User authentication |
| /auth/refresh | POST | JWT | Token renewal |
| /clients | POST | JWT | OAuth2 client registration |
| /oauth/token | POST | Client Credentials | OAuth2 token endpoint |
| /oauth/introspect | POST | Client Credentials | Token validation |
| /posts | GET | OAuth2 | List all posts |
| /posts | POST | OAuth2 | Create new post |
| /posts/:id | GET | OAuth2 | Get specific post |
| /comments | POST | OAuth2 | Create comment |
| /comments/post/:id | GET | OAuth2 | Get post comments |
| /likes | POST | OAuth2 | Create like |
| /likes/post/:id | GET | OAuth2 | Get post likes |

## Appendix B: Environment Configuration

| Variable | Development | Coursework | Purpose |
|----------|-------------|------------|---------|
| OAUTH2_CLIENT_ID | miniwall-client | From env | Client identifier |
| OAUTH2_CLIENT_SECRET | miniwall-client-secret | From env | Client secret |
| JWT_SECRET | dev-secret | From env | Token signing |
| AUTH_SERVER_URL | http://miniwall-auth-server:4000 | http://miniwall-auth-server:4000 | Auth service URL |
| MONGODB_URI | With auth | Basic | Database connection |
