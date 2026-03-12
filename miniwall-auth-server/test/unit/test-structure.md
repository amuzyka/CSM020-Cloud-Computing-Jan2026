# Unit Tests Structure

This directory contains all unit tests for the MiniWall Auth Server.

## Directory Structure

```
test/unit/
├── auth/
│   ├── auth.service.spec.ts
│   ├── auth.controller.spec.ts
│   ├── oauth2.service.spec.ts
│   ├── oauth2.controller.spec.ts
│   └── strategies/
│       └── jwt.strategy.spec.ts
├── app.controller.spec.ts
├── jest.config.ts
├── setup.ts
└── test-structure.md
```

## Available NPM Scripts

### General Unit Test Commands
- `npm run test:unit` - Run all unit tests
- `npm run test:unit:watch` - Run unit tests in watch mode
- `npm run test:unit:cov` - Run unit tests with coverage report

### Specific Test Categories
- `npm run test:auth` - Run only auth service tests
- `npm run test:controllers` - Run only controller tests (auth + app controllers)
- `npm run test:oauth2` - Run only OAuth2 related tests
- `npm run test:strategies` - Run only JWT strategy tests

### Other Test Commands
- `npm run test` - Run all tests (unit + e2e)
- `npm run test:e2e` - Run only end-to-end tests
- `npm run test:cov` - Run all tests with coverage

## Test Coverage Areas

### AppController Tests
- Basic "Hello World" functionality
- Controller setup and initialization

### AuthService Tests
- User registration
- Token generation and validation
- Refresh token functionality
- Error handling for duplicate users

### AuthController Tests
- Registration endpoint
- Token refresh endpoint
- Profile endpoint (protected)
- Error handling and validation

### OAuth2Service Tests
- Authorization URL generation
- Token endpoint (all grant types)
- Token introspection
- Token revocation

### OAuth2Controller Tests
- OAuth2 authorization flow
- Token endpoint handling
- Introspection and revocation endpoints
- OpenID configuration

### JWT Strategy Tests
- Token validation
- Payload processing
- Error handling for invalid tokens

## Running Tests

### Quick Start
```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode for development
npm run test:unit:watch

# Run tests with coverage
npm run test:unit:cov
```

### Specific Categories
```bash
# Test only authentication logic
npm run test:auth

# Test only OAuth2 functionality
npm run test:oauth2

# Test only controllers (includes auth and app controllers)
npm run test:controllers

# Test only JWT strategies
npm run test:strategies
```

## Configuration

The Jest configuration is located in `jest.config.ts` and includes:
- TypeScript support via ts-jest
- Path mapping for cleaner imports
- Coverage reporting
- Test environment setup

Environment variables for tests are set in `setup.ts`.

## Writing New Tests

1. Create test files in the appropriate subdirectory
2. Follow the naming convention: `*.spec.ts`
3. Use the existing test patterns as examples
4. Mock external dependencies properly
5. Test both success and error cases
