# MiniWall API Testing Instructions

## Overview
This document provides instructions for running comprehensive test cases for the MiniWall API using the Python test suite.

## Prerequisites

### 1. Ensure Services are Running
Make sure all MiniWall services are running through nginx:
- Nginx Reverse Proxy: `http://localhost` (port 80)
- Auth Server: Available via nginx at `/auth/`
- App Server: Available via nginx at `/`
- OAuth2 Endpoints: Available via nginx at `/oauth/`
- Client Management: Available via nginx at `/clients/`

Check with:
```bash
docker-compose -f docker-compose.dev.yml ps
```

If services are not running, start them:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Install Python Dependencies
```bash
pip3 install -r tests/requirements.txt
```

## Running the Tests

### Execute All Test Cases

First, set up the test environment:
```bash
python3 tests/setup_test_environment.py
```

Then run the test suite:
```bash
python3 tests/miniwall-api-tests.py
```

Optional - Clean up test data:
```bash
python3 tests/cleanup_test_data.py
```

### Test Cases Covered
The test suite covers all 15 required test cases:

1. **TC 1** - User Registration (Olga, Nick, Mary)
2. **TC 2** - JWT Authentication
3. **TC 3** - Unauthorized Access Test
4. **TC 4** - Olga Posts Text
5. **TC 5** - Nick Posts Text
6. **TC 6** - Mary Posts Text
7. **TC 7** - Browse Posts (Reverse Chronological)
8. **TC 8** - Round-Robin Comments
9. **TC 9** - Mary Comments Own Post (Should Fail)
10. **TC 10** - Mary Browse Posts
11. **TC 11** - Mary See Comments
12. **TC 12** - Nick and Olga Like Mary's Post
13. **TC 13** - Mary Likes Own Post (Should Fail)
14. **TC 14** - Mary See Likes
15. **TC 15** - Nick See Posts (Liked Posts First)

## Expected Output

### Console Output
The test script provides real-time feedback:
- PASS for successful tests
- FAIL for failed tests
- Detailed error messages for failures
- Final summary with success rate

### Generated Files
After running tests, two files are generated:

1. **JSON Results**: `miniwall_test_results_YYYYMMDD_HHMMSS.json`
   - Detailed machine-readable results
   - Contains all test data and responses

2. **Markdown Report**: `miniwall_test_report_YYYYMMDD_HHMMSS.md`
   - Human-readable summary
   - Suitable for documentation

## Test Data

### Test Users
- **Olga**: `olga@example.com` / `olga123`
- **Nick**: `nick@example.com` / `nick123`
- **Mary**: `mary@example.com` / `mary123`

### Test Scenarios
The tests simulate realistic user interactions:
- Registration and authentication
- OAuth2 client setup and token acquisition
- Content creation (posts, comments, likes)
- Access control and authorization
- Data retrieval and sorting

## Authentication Architecture

### OAuth2 Client Credentials Flow
The test suite automatically:
1. Creates a test user for OAuth2 client registration
2. Registers an OAuth2 client with the auth server
3. Obtains an OAuth2 access token using client credentials
4. Uses the OAuth2 token for all API calls to protected endpoints

### JWT Authentication
User-specific operations still use JWT tokens:
- User registration and login
- User profile management
- Personal data access

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Docker containers are running
   - Check nginx accessibility on port 80

2. **Authentication Failures**
   - Verify auth server is accessible via nginx at `/auth/`
   - Check OAuth2 client registration

3. **Missing Endpoints**
   - Verify API routes match expected paths
   - Check controller implementations

4. **OAuth2 Setup Failures**
   - Ensure auth server can create clients
   - Check client credentials flow

### Debug Mode
To debug specific test failures, examine the JSON results file for detailed error information and API responses.

## API Endpoints Tested

### Auth Server (via nginx)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /clients` - OAuth2 client registration
- `POST /oauth/token` - OAuth2 token endpoint

### App Server (via nginx)
- `GET /posts` - Get all posts
- `POST /posts` - Create post
- `GET /posts/:id` - Get specific post
- `POST /comments` - Create comment
- `GET /comments/post/:postId` - Get post comments
- `POST /likes` - Create like
- `GET /likes/post/:postId` - Get post likes

## Security Features Tested

1. **OAuth2 Authentication** - All protected endpoints require valid OAuth2 tokens
2. **JWT Authentication** - User-specific operations use JWT tokens
3. **Authorization** - Users can only perform allowed actions
4. **Ownership Rules** - Users cannot comment/like their own posts
5. **Access Control** - Unauthorized requests are rejected


## Reporting

Test results are automatically saved to JSON files for analysis.
