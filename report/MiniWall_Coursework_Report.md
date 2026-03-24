<div align="center" style="padding: 0 40px 60px 40px; font-family: Arial, sans-serif; min-height: 297mm; display: flex; flex-direction: column; justify-content: flex-start; page-break-after: always;">

<img src="logo.png" alt="MiniWall Logo" style="width: 280px; height: auto; margin: 0 auto 30px auto; display: block;">

<p style="font-size: 22px; margin-bottom: 30px; color: #666;">
  Module: CSM020 - Cloud Computing
</p>

<h1 style="font-size: 42px; margin-bottom: 40px; color: #333;">MiniWall API Development Report</h1>

<p style="font-size: 26px; margin-bottom: 20px; color: #555;">
  <strong>Andrey Muzyka, MSc Computer Science</strong>
</p>

<p style="font-size: 20px; margin-bottom: 60px; color: #777;">
  Coursework: January to March 2026 study session
</p>

<p style="font-size: 16px; color: #999; font-style: italic; margin-top: auto;">
  Word Count: 2,983 words (excluding front page, table of contents, appendixes, and tables)
</p>

</div>


## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#2-system-architecture)
   - 2.1 [Overview](#21-overview)
   - 2.2 [Component Structure](#22-component-structure)
   - 2.3 [Data Flow Architecture](#23-data-flow-architecture)
   - 2.4 [User Journey](#24-user-journey)
   - 2.5 [Database Design](#25-database-design)
   - 2.6 [Dockerized Environment Configuration](#26-dockerized-environment-configuration)
3. [API Endpoints and Functionality](#3-api-endpoints-and-functionality)
   - 3.1 [Authentication Endpoints](#31-authentication-endpoints)
   - 3.2 [Resource Endpoints](#32-resource-endpoints)
   - 3.3 [Error Handling](#33-error-handling)
4. [Testing Strategy and Results](#4-testing-strategy-and-results)
   - 4.1 [Test Case Design](#41-test-case-design)
   - 4.2 [Testing Methodology](#42-testing-methodology)
   - 4.3 [Test Results](#43-test-results)
5. [GCP Deployment](#5-gcp-deployment)
   - 5.1 [Infrastructure as Code with Terraform](#51-infrastructure-as-code-with-terraform)
   - 5.2 [CI/CD Pipeline with GitHub Actions](#52-cicd-pipeline-with-github-actions)
   - 5.3 [Deployment Commands](#53-deployment-commands)
   - 5.4 [Deployment Verification](#54-deployment-verification)
   - 5.5 [Screenshots](#55-screenshots)
6. [Conclusion](#6-conclusion)
- [Appendix A: API Endpoint Reference](#appendix-a-api-endpoint-reference)
- [Appendix B: Environment Configuration](#appendix-b-environment-configuration)
- [Appendix C: Search API Examples](#appendix-c-search-api-examples)
- [Appendix D: API User Journey with curl](#appendix-d-api-user-journey-with-curl)

</div>

## Executive Summary

This report documents the development of MiniWall, a microservices-based social media API designed for cloud deployment. The system implements a dual authentication architecture combining OAuth2 and JWT tokens, with separate services for authentication and resource management. A comprehensive test suite of 15 test cases validates all API functionality including user registration, authentication, content creation, social interactions, and security enforcement. All test cases pass successfully, demonstrating a robust and fully functional API with proper error handling for edge cases such as duplicate registrations, unauthorized access, and self-like prevention.

**Source Code Repository:** [https://github.com/amuzyka/CSM020-Cloud-Computing-Jan2026](https://github.com/amuzyka/CSM020-Cloud-Computing-Jan2026)

## 2. System Architecture

### 2.1 Overview

MiniWall follows a microservices architecture pattern, separating concerns between authentication and resource management. This design enables independent scaling, deployment, and maintenance of each service while maintaining a unified API interface through an Nginx reverse proxy.

Both the authentication and application servers are built with **NestJS** (using the Express platform by default), a progressive Node.js framework that provides several architectural advantages:

- **Modular Architecture**: NestJS organizes code into modules with clear boundaries, making the codebase maintainable and testable. Each feature (auth, posts, comments, likes) exists as a self-contained module with its own controller, service, and repository.

- **Dependency Injection**: Built-in DI container manages service dependencies, enabling loose coupling between components and simplifying unit testing through mock injection.

- **Decorator-Based API Definition**: Controllers use TypeScript decorators (`@Controller`, `@Get`, `@Post`) for declarative route definition, reducing boilerplate and improving code readability.

- **Built-in Validation**: Integration with `class-validator` enables automatic request validation through DTOs (Data Transfer Objects), ensuring data integrity before processing.

- **TypeScript Support**: Full TypeScript support provides compile-time type checking, improving code quality and developer productivity through IDE autocompletion and refactoring tools.

- **Interceptors and Guards**: Middleware patterns like interceptors (for logging/transforming responses) and guards (for authentication/authorization) enable cross-cutting concerns to be handled consistently across endpoints.

- **Passport.js Integration**: The authentication server leverages `@nestjs/passport` with Passport.js strategies (JWT, OAuth2) for flexible, modular authentication middleware that integrates seamlessly with NestJS guards and decorators.

### 2.2 Component Structure

The system comprises three primary components:

**Authentication Server (Port 4000)**
The authentication server handles all identity-related operations including user registration, login, token generation, and token introspection. Built with NestJS and MongoDB, it implements both JWT for session management and OAuth2 for third-party client authorization. The server maintains its own database (`miniwall-auth`) for user credentials, OAuth2 client registrations, and refresh token storage.

**Application Server (Port 3000)**
The application server manages core social media functionality including posts, comments, and likes. It requires OAuth2 bearer tokens for access control and communicates with the authentication server via token introspection to validate requests. This server maintains a separate MongoDB database (`miniwall`) for content storage.

**Nginx Reverse Proxy (Port 80)**
Nginx serves as the entry point for all external requests, routing traffic to appropriate backend services based on URL path patterns. 

### 2.3 Data Flow Architecture

The authentication flow implements a simple OAuth2-like system:

1. **Registration Phase**: Users register via `/auth/register`, receiving a user ID stored in the auth database
2. **Authentication Phase**: Users login via `/auth/login`, receiving a JWT access token and refresh token
3. **Client Registration**: Authenticated users can register OAuth2 clients using their JWT token via `/clients`
4. **Authorization Phase**: OAuth2 clients obtain access tokens via `/oauth/token` using client credentials
5. **Resource Access**: API endpoints (posts, comments, likes) require OAuth2 bearer tokens for access
6. **Token Validation**: The application server introspects tokens via `/oauth/introspect` to verify validity

This architecture provides clear separation between authentication mechanisms (JWT for client management, OAuth2 for resource access) while maintaining security through token introspection.

### 2.4 User Journey

The MiniWall authentication system follows a standard OAuth2 user journey that separates user identity from application identity:

1. **Account Creation**: User registers via `/auth/register` with username, email, and password, receiving a user ID in the authentication database

2. **User Authentication**: User logs in via `/auth/login`, receiving a personal JWT access token (1-hour expiration) and refresh token (7-day expiration) for their own identity

3. **Application Authorization**: The MiniWall application (pre-configured client) authenticates using its client credentials via `/oauth/token`, receiving an OAuth2 access token for application-level operations

4. **Resource Access**: The MiniWall application uses its OAuth2 bearer token to access protected API endpoints (posts, comments, likes) on behalf of users

5. **Token Validation**: The application server validates OAuth2 tokens via `/oauth/introspect` to ensure requests are authorized before processing

This dual-token approach ensures that user credentials are never exposed to the application, while the application maintains its own identity for API operations - a fundamental principle of OAuth2 security architecture.

### 2.5 Database Design

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

### 2.6 Dockerized Environment Configuration

MiniWall uses Docker and Docker Compose to containerise and orchestrate the microservices architecture. Containerisation ensures consistent deployment across environments, eliminates "works on my machine" issues, and provides process-level isolation for each service.

#### Container Architecture

Each service runs in its own container based on lightweight Alpine Linux images:

**Node.js Application Containers**
- **Base Image**: `node:25-alpine` - Minimal footprint with Node.js 25
- **Security**: Runs as non-root `nestjs` user (UID 1001) following security best practices
- **Port Exposure**: Application server exposes port 3000, auth server exposes port 4000
- **Development Only**: Port 9229 exposed for Node.js debugger attachment

**MongoDB Containers**
- **Base Image**: `mongo:8.0` - Official MongoDB 8.0 release
- **Data Persistence**: Named volumes for database storage survive container restarts
- **Authentication**: SCRAM-SHA-256 authentication enabled with admin credentials

**Nginx Reverse Proxy Container**
- **Base Image**: `nginx:alpine` - Minimal web server image
- **Port Mapping**: Exposes ports 80 (HTTP) and 443 (HTTPS) to host
- **Configuration**: Read-only volume mount for nginx configuration files

#### Dockerfile Strategy

The system employs different Dockerfile strategies for development and production:

**Production Dockerfile (Multi-Stage Build)**

```dockerfile
# Build stage
FROM node:25-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:25-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1
```

This multi-stage approach:
- **Reduces image size** by excluding build dependencies from final image
- **Improves security** by running as non-root user
- **Enables health monitoring** via built-in healthcheck probes
- **Separates concerns** between build environment and runtime

**Development Dockerfile**
- Single-stage build with all dependencies
- Volume-mounted source code for hot-reload
- Debug port 9229 exposed for IDE debugging
- `npm run start:dev` command enables file watching

#### Docker Compose Orchestration

Docker Compose coordinates multi-container deployment through declarative YAML configuration:

**Service Dependencies**
```yaml
depends_on:
  - mongodb-app
  - miniwall-auth-server
```

This ensures startup order: databases initialise first, then application servers, finally Nginx.

**Networking**
- **Bridge Network**: All services connect to `miniwall-network` (isolated from host network)
- **Service Discovery**: Containers communicate via service names (e.g., `http://miniwall-auth-server:4000`)
- **Internal Only**: Application servers and databases have no external port mappings, accessible only through Nginx

**Volume Management**
- **Named Volumes**: Persistent storage for databases (`mongodb-app-dev-data`, `mongodb-auth-dev-data`)
- **Bind Mounts**: Source code directories mounted for development hot-reload
- **Anonymous Volumes**: `node_modules` volumes prevent host/node_modules conflicts

**Environment Configuration**
- Environment variables injected via `environment:` directives
- External env files (`.env.development`, `.env.production`) for sensitive data
- Variable substitution with defaults: `${JWT_SECRET:-default-value}`

#### Environment Separation

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

To start the development environment:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This command:
1. Builds images from Dockerfiles if they don't exist
2. Creates the `miniwall-network` bridge network
3. Starts containers in dependency order
4. Mounts volumes and binds ports
5. Runs containers in detached mode (`-d`)


## 3. API Endpoints and Functionality

### 3.1 Authentication Endpoints

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

### 3.2 Resource Endpoints

All resource endpoints require OAuth2 bearer tokens in the Authorization header, following the format `Authorization: Bearer <token>`.

**POST /posts**
Creates a new social media post. Accepts title and content in the request body, automatically associating the post with the authenticated user extracted from the OAuth2 token. Returns the created post with generated ID and timestamp.

**GET /posts**
Retrieves all posts in the system, populating author information from user references. Supports pagination through query parameters. Returns an array of post objects with author details.

**GET /posts/:id**
Retrieves a specific post by ID, including author information. Returns 404 Not Found if the post does not exist.

**GET /posts/search**
Searches posts by title keyword, author, or date range. Supports the following query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Title keyword search (uses MongoDB text index) |
| `authorId` | string | Filter by post author ID |
| `startDate` | ISO 8601 | Filter posts created on or after this date |
| `endDate` | ISO 8601 | Filter posts created on or before this date |

Results are sorted by relevance (for text search), then by like count and recency. Multiple parameters can be combined for refined searches.

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

### 3.3 Error Handling

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

## 4. Testing Strategy and Results

### 4.1 Test Case Design

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

### 4.2 Testing Methodology

The test suite implements automated API testing using Python's requests library. The testing framework:

1. **Environment Setup**: Initializes Docker containers, creates OAuth2 clients, and obtains tokens
2. **State Management**: Tracks created resources (users, posts, comments, likes) for cleanup
3. **Sequential Execution**: Runs tests in dependency order (users must exist before posts, posts before comments)
4. **Result Logging**: Records detailed test results including status codes, response bodies, and error messages
5. **Cleanup**: Removes test data and stops services after test completion

The methodology ensures reproducible tests that don't interfere with production data while providing comprehensive coverage of API functionality.

### 4.3 Test Results

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

## 5. GCP Deployment

This section documents the deployment of MiniWall to Google Cloud Platform (GCP) using Terraform for infrastructure provisioning and GitHub Actions for CI/CD automation.

### 5.1 Infrastructure as Code with Terraform

Terraform provisions the GCP infrastructure using the University of London provided GCP account. The configuration files are located in the `terraform/` directory:

**`main.tf`** - Defines the compute instance and networking:
- `google_compute_firewall`: Opens ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (app), 4000 (auth)
- `google_compute_address`: Static IP for consistent access
- `google_compute_instance`: e2-medium VM (2 vCPU, 4GB RAM) with Debian 12

**`variables.tf`** - Configurable inputs:
- `gcp_project_id`, `gcp_region`, `gcp_zone`
- `jwt_secret`, `oauth2_client_secret` (sensitive)

**`backend.tf`** - GCS backend for state management

### 5.2 CI/CD Pipeline with GitHub Actions

The `.github/workflows/deploy.yml` automates deployment:

1. **Trigger**: Push to `main` branch
2. **Terraform Steps**:
   - Checkout code
   - Setup Terraform
   - Authenticate to GCP using service account key (stored as GitHub secret)
   - `terraform init` with GCS backend
   - `terraform plan` and `terraform apply -auto-approve`
3. **Deployment**: Terraform startup script clones repo and runs Docker Compose

**Required GitHub Secrets**:
- `GCP_SA_KEY`: Service account JSON key
- `GCP_PROJECT_ID`: Project identifier
- `JWT_SECRET`: JWT signing secret
- `OAUTH2_CLIENT_SECRET`: OAuth2 client secret
- `MONGO_APP_PASSWORD`: MongoDB app database password
- `MONGO_AUTH_PASSWORD`: MongoDB auth database password

### 5.3 Deployment Commands

**Initial Deployment**:
```bash
cd terraform/
terraform init
terraform plan
terraform apply -auto-approve
```

**Accessing the Deployed Instance**:
```bash
# SSH into the VM
gcloud compute ssh miniwall-server --zone=us-central1-a

# Or use the output from terraform
$(terraform output ssh_command)
```

**Checking Deployment Status**:
```bash
# View instance details
gcloud compute instances describe miniwall-server --zone=us-central1-a

# Check firewall rules
gcloud compute firewall-rules list --filter="name:miniwall"
```

**Redeployment**:
```bash
# Destroy and recreate
cd terraform/
terraform destroy -auto-approve
terraform apply -auto-approve
```

### 5.4 Deployment Verification

The deployment is verified through:
1. **Terraform Outputs**: Display server IP and SSH command
2. **Health Check**: Access `http://<IP>/` (Nginx should respond)
3. **API Test**: Use curl commands from Appendix D
4. **Docker Status**: SSH in and run `docker compose ps`

### 5.5 Screenshots

*[Screenshots to be added showing:]*
- Terraform plan/apply output
- GCP Console VM instance running
- GitHub Actions workflow success
- API health check response
- Docker containers running on VM

## 6. Conclusion

This coursework demonstrates the complete software development lifecycle of MiniWall, from requirements analysis through to production deployment on GCP. The project successfully delivers a microservices-based social media API with dual OAuth2/JWT authentication, MongoDB search functionality, Docker containerization, and automated CI/CD pipelines using Terraform and GitHub Actions.

Key achievements include: modular NestJS architecture with clear service separation, advanced post search with MongoDB indexing, multi-stage Docker builds, Infrastructure as Code deployment to UoL-provided GCP resources, and 100% test coverage across 15 test cases. MiniWall showcases industry-standard practices in API design, cloud deployment, and DevOps automation.

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
| /posts/search | GET | OAuth2 | Search posts by title, author, date |
| /comments | POST | OAuth2 | Create comment |
| /comments/post/:id | GET | OAuth2 | Get post comments |
| /likes | POST | OAuth2 | Create like |
| /likes/post/:id | GET | OAuth2 | Get post likes |

## Appendix B: Environment Configuration

| Variable | Development | Production | Purpose |
|----------|-------------|------------|---------|
| OAUTH2_CLIENT_ID | miniwall-client | Production env value | Client identifier |
| OAUTH2_CLIENT_SECRET | miniwall-client-secret | Production env value | Client secret |
| JWT_SECRET | dev-secret | Production env value | Token signing |
| AUTH_SERVER_URL | miniwall-auth-server:4000 | miniwall-auth-server:4000 | Auth service URL |
| MONGODB_URI | With auth | Basic | Database connection |

## Appendix C: Search API Examples

The following examples demonstrate the search functionality available via the `/posts/search` endpoint:

### Search by Title Keyword

```
GET /posts/search?q=cloud
```

Searches for posts with titles containing the keyword "cloud" using MongoDB's text search index.

### Search by Author and Date Range

```
GET /posts/search?authorId=65a1b2...&startDate=2026-01-01
```

Retrieves posts by a specific author created on or after January 1, 2026.

### Combined Search with Multiple Parameters

```
GET /posts/search?q=miniwall&startDate=2026-01-01&endDate=2026-03-31
```

Searches for posts with titles containing "miniwall" created within the study period 2026.

### Database Index Design

The search functionality is supported by the following MongoDB indexes defined in the Post schema:

- **Text index on title**: `PostSchema.index({ title: 'text' })` - Enables efficient full-text search on post titles
- **Compound index on authorId and createdAt**: `PostSchema.index({ authorId: 1, createdAt: -1 })` - Optimises author-based queries with date filtering
- **Index on createdAt**: `PostSchema.index({ createdAt: -1 })` - Supports date range queries

## Appendix D: API User Journey with curl

The following curl commands demonstrate the complete user journey against the deployed MiniWall API at `http://35.208.186.197/`.

### 1. User Registration

```bash
curl -X POST http://35.208.186.197/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. User Login (JWT Token Acquisition)

```bash
curl -X POST http://35.208.186.197/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Response includes `access_token` and `refresh_token`.

### 3. OAuth2 Token Acquisition

```bash
curl -X POST http://35.208.186.197/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=miniwall-client" \
  -d "client_secret=miniwall-client-secret"
```

Response includes OAuth2 `access_token` for resource access.

### 4. Create a Post

```bash
curl -X POST http://35.208.186.197/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <oauth2_access_token>" \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my post"
  }'
```

### 5. Get All Posts

```bash
curl -X GET http://35.208.186.197/posts \
  -H "Authorization: Bearer <oauth2_access_token>"
```

### 6. Search Posts

```bash
curl -X GET "http://35.208.186.197/posts/search?q=cloud" \
  -H "Authorization: Bearer <oauth2_access_token>"
```

### 7. Create a Comment

```bash
curl -X POST http://35.208.186.197/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <oauth2_access_token>" \
  -d '{
    "postId": "<post_id>",
    "content": "Great post!"
  }'
```

### 8. Like a Post

```bash
curl -X POST http://35.208.186.197/likes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <oauth2_access_token>" \
  -d '{
    "postId": "<post_id>"
  }'
```
