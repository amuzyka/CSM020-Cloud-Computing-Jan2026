# MiniWall - Cloud-Based Social Media API

A microservices-based social media API built with NestJS, MongoDB, and Docker. Features dual authentication (JWT + OAuth2) and automated deployment to Google Cloud Platform.

## Architecture

- **MiniWall App** (Port 3000): Posts, comments, likes API
- **MiniWall Auth Server** (Port 4000): JWT/OAuth2 authentication
- **MongoDB**: Two instances (app + auth databases)
- **Nginx**: Reverse proxy and load balancing

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.x (for testing)
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/amuzyka/CSM020-Cloud-Computing-Jan2026.git
cd CSM020-Cloud-Computing-Jan2026

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Access services
#  http://localhost
```

## Testing

### Run Test Suite

```bash
# Setup test environment
cd tests
python setup_test_environment.py

# Run all 15 test cases
python miniwall-api-tests.py

# Cleanup test data
python cleanup_test_data.py
```

### Manual API Testing

```bash
# Register user
curl -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'

# Get posts (requires OAuth2 token)
curl http://localhost/posts \
  -H "Authorization: Bearer YOUR_OAUTH2_TOKEN"
```

## Production Deployment

### Prerequisites
- GCP Project with billing enabled
- Service Account with Compute Engine permissions
- GitHub repository secrets configured

### Required GitHub Secrets

Add these in GitHub → Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Service account JSON key |
| `JWT_SECRET` | JWT signing secret (32+ chars) |
| `OAUTH2_CLIENT_ID` | OAuth2 client ID |
| `OAUTH2_CLIENT_SECRET` | OAuth2 client secret |

### Deploy

```bash
# Push to main branch triggers automatic deployment
git add .
git commit -m "Deploy to GCP"
git push origin main
```

Or trigger manually in GitHub → Actions → "Deploy MiniWall" → Run workflow

### Post-Deployment

Access your application at the IP shown in GitHub Actions logs:
- **API**: `http://[SERVER_IP]`
- **Auth**: `http://[SERVER_IP]/auth/*`
- **OAuth**: `http://[SERVER_IP]/oauth/*`

## Manual Terraform Deployment

```bash
cd terraform

# Copy and edit the example variables file
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values

# Deploy
terraform init
terraform apply
```

## Project Structure

```
├── miniwall-app/              # Main application API
├── miniwall-auth-server/       # Authentication service
├── nginx/                      # Reverse proxy config
├── tests/                      # Python test suite
├── terraform/                  # GCP infrastructure
│   ├── main.tf                 # Compute instance, firewall
│   ├── variables.tf            # Input variables
│   ├── outputs.tf              # Deployment outputs
│   └── backend.tf              # GCS state backend
└── .github/workflows/          # CI/CD pipeline
    └── deploy.yml              # GitHub Actions workflow
```

## Security

- JWT tokens with configurable expiration
- OAuth2 client credentials flow
- MongoDB authentication enabled
- Firewall rules restrict access to necessary ports only
- Secrets managed via GitHub Actions (never committed to repo)


## API Documentation

See [report/MiniWall_Coursework_Report.md](report/MiniWall_Coursework_Report.md) for detailed API endpoint documentation.



