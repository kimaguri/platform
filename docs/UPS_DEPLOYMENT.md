# 🚀 Deployment on UPS (Unified Platform Service)

This guide provides detailed instructions for deploying the SimplX Platform on UPS using Docker with proper secrets management.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Encore CLI installed (`npm install -g encore.dev`)
- Access to Supabase projects for admin and tenant databases
- UPS account with appropriate permissions

## 🔐 Secrets Management

The platform uses Encore's built-in secrets management system instead of `.env` files for security.

### Setting Secrets

For self-host deployment, you must set the required secrets using Encore CLI:

```bash
# Set admin Supabase credentials for all environments
encore secret set --type dev,prod,local,pr AdminSupabaseUrl
encore secret set --type dev,prod,local,pr AdminSupabaseServiceKey
```

### Verifying Secrets

```bash
# List all secrets
encore secret list

# View a specific secret (masked)
encore secret get AdminSupabaseUrl
```

## 🐳 Docker Deployment

### Building and Running Services

The platform consists of multiple microservices that are deployed together using Docker Compose:

```bash
# Build all services
docker-compose build

# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Service Architecture

- **API Gateway** (Port 4000): Main entry point for all API requests
- **Tenant Management** (Port 4001): Internal service for tenant operations
- **User Management** (Port 4002): Internal service for user authentication
- **Data Processing** (Port 4003): Internal service for data operations
- **Event Management** (Port 4004): Internal service for event handling

Only the API Gateway exposes a public port (4000). All other services communicate internally through the Docker network.

## 🧪 Health Checks

After deployment, verify that all services are running correctly:

```bash
# Check API Gateway health
curl http://localhost:4000/health

# Check specific service health
curl http://localhost:4000/health/tenant-management
```

## 📊 Monitoring

The platform includes built-in monitoring endpoints:

```bash
# Get system metrics
curl http://localhost:4000/metrics

# Get metrics summary
curl http://localhost:4000/metrics/summary
```

## 🛠️ Troubleshooting

### Common Issues

1. **Services not starting**:
   - Check that all required secrets are set
   - Verify Docker Compose file syntax
   - Ensure sufficient system resources

2. **Connection issues**:
   - Verify internal service communication through Docker network
   - Check service ports in docker-compose.yml

3. **Secrets not loading**:
   - Ensure secrets are set for the correct environment
   - Restart services after setting secrets

### Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f gateway
```

## 🔒 Security Considerations

- All secrets are managed through Encore's secure secrets system
- No sensitive data is stored in `.env` files or committed to Git
- Services communicate internally through isolated Docker network
- CORS is configured to allow only trusted origins

## 🔄 Updates and Maintenance

To update the platform:

```bash
# Pull latest changes
git pull

# Rebuild services
docker-compose build

# Restart services
docker-compose up -d
```

For zero-downtime deployments, consider using Docker Compose's rolling update strategy.
