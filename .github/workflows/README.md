# GitHub Actions Workflows

## Test Workflow (`test.yml`)

Comprehensive testing pipeline that runs on every push and pull request.

### Features

- **Matrix Testing**: Tests on Node.js 18.x and 20.x
- **Database Setup**: PostgreSQL 15 with health checks
- **Complete Environment**: All required environment variables for testing
- **Multi-Stage Testing**:
  - Dependency caching with pnpm
  - Database migrations
  - Linting
  - Type checking
  - Unit tests with coverage
  - Build verification
  - Integration tests (PR only)

### Environment Variables

The workflow sets up all necessary environment variables for testing:
- Database connection for PostgreSQL
- Mock values for OAuth providers
- Test API keys
- Contact email for testing

### Test Coverage

- Uploads coverage reports to Codecov
- Runs on Node.js 20.x matrix
- Continues on coverage failures

### Integration Tests

- Runs only on pull requests
- Uses separate database instance
- Full end-to-end validation

## Deploy Workflow (`deploy.yml`)

Production deployment pipeline for the main branch using Docker and Kubernetes.