# 🟡 MEDIUM: Development Workflow

## Issue Summary
The application lacks a comprehensive development workflow with proper CI/CD pipelines, automated testing, code quality checks, and deployment processes, making it difficult to maintain code quality and deploy changes safely.

## Current State
- No CI/CD pipeline
- No automated testing in development workflow
- No code quality checks in development workflow
- No automated deployment process
- No development environment standardization

## Impact
- **Quality Issues**: Code quality issues can slip through to production
- **Deployment Risk**: Manual deployments are error-prone
- **Development Speed**: Slower development due to manual processes
- **Consistency Issues**: Inconsistent development environments

## Evidence
- No CI/CD pipeline mentioned in analysis
- No automated testing in development workflow
- No code quality checks in development workflow

## Solution
### 1. Set Up CI/CD Pipeline
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:coverage
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: test-results/
  
  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: .next/
  
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-artifacts
        path: .next/
    
    - name: Deploy to production
      run: |
        # Deploy to your production environment
        echo "Deploying to production..."
    
    - name: Notify deployment
      run: |
        # Send deployment notification
        echo "Deployment completed successfully"
```

### 2. Create Development Environment Setup
```bash
#!/bin/bash
# scripts/setup-dev-environment.sh

set -e

echo "Setting up development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm and try again."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Install development dependencies
echo "Installing development dependencies..."
npm install --save-dev

# Set up environment variables
echo "Setting up environment variables..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "Created .env.local from .env.example"
    echo "Please update .env.local with your configuration"
fi

# Set up Supabase
echo "Setting up Supabase..."
if command -v supabase &> /dev/null; then
    supabase start
else
    echo "Supabase CLI is not installed. Please install it and run 'supabase start'"
fi

# Set up database
echo "Setting up database..."
npm run db:setup

# Run initial tests
echo "Running initial tests..."
npm run test

echo "Development environment setup complete!"
echo "Run 'npm run dev' to start the development server"
```

### 3. Create Pre-commit Hooks
```json
// package.json
{
  "scripts": {
    "pre-commit": "lint-staged",
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.{ts,tsx}": [
      "tsc --noEmit"
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test && npm run build"
    }
  }
}
```

```bash
#!/bin/sh
# .husky/pre-commit

. "$(dirname "$0")/_/husky.sh"

npm run pre-commit
```

```bash
#!/bin/sh
# .husky/pre-push

. "$(dirname "$0")/_/husky.sh"

npm run test
npm run build
```

### 4. Create Development Scripts
```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "db:setup": "supabase db reset",
    "db:migrate": "supabase db push",
    "db:seed": "supabase db seed",
    "db:reset": "supabase db reset",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "analyze": "npm run build && npm run analyze:bundle",
    "analyze:bundle": "npx @next/bundle-analyzer",
    "clean": "rm -rf .next node_modules/.cache",
    "clean:all": "rm -rf .next node_modules package-lock.json",
    "install:clean": "npm run clean:all && npm install",
    "docker:build": "docker build -t cozy-chat .",
    "docker:run": "docker run -p 3000:3000 cozy-chat",
    "docker:dev": "docker-compose -f docker-compose.dev.yml up",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up",
    "deploy:staging": "npm run build && npm run deploy:staging:upload",
    "deploy:production": "npm run build && npm run deploy:production:upload",
    "deploy:staging:upload": "echo 'Deploying to staging...'",
    "deploy:production:upload": "echo 'Deploying to production...'"
  }
}
```

### 5. Create Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev

  supabase:
    image: supabase/postgres:14.1.0
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=postgres
    volumes:
      - supabase_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  supabase_data:
  redis_data:
```

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

  supabase:
    image: supabase/postgres:14.1.0
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=postgres
    volumes:
      - supabase_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  supabase_data:
  redis_data:
```

### 6. Create Development Tools
```typescript
// scripts/dev-tools.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

class DevTools {
  private projectRoot: string;
  
  constructor() {
    this.projectRoot = process.cwd();
  }
  
  // Generate component boilerplate
  generateComponent(name: string, type: 'component' | 'page' | 'hook' = 'component') {
    const componentName = this.capitalizeFirst(name);
    const fileName = `${componentName}.tsx`;
    const testFileName = `${componentName}.test.tsx`;
    
    let template: string;
    let testTemplate: string;
    
    switch (type) {
      case 'component':
        template = this.getComponentTemplate(componentName);
        testTemplate = this.getComponentTestTemplate(componentName);
        break;
      case 'page':
        template = this.getPageTemplate(componentName);
        testTemplate = this.getPageTestTemplate(componentName);
        break;
      case 'hook':
        template = this.getHookTemplate(componentName);
        testTemplate = this.getHookTestTemplate(componentName);
        break;
    }
    
    const componentPath = join(this.projectRoot, 'src', 'components', fileName);
    const testPath = join(this.projectRoot, 'src', 'components', testFileName);
    
    writeFileSync(componentPath, template);
    writeFileSync(testPath, testTemplate);
    
    console.log(`Generated ${type}: ${componentName}`);
    console.log(`Component: ${componentPath}`);
    console.log(`Test: ${testPath}`);
  }
  
  // Generate API route boilerplate
  generateApiRoute(name: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') {
    const routeName = name.toLowerCase();
    const fileName = `${routeName}.ts`;
    const testFileName = `${routeName}.test.ts`;
    
    const template = this.getApiRouteTemplate(routeName, method);
    const testTemplate = this.getApiRouteTestTemplate(routeName, method);
    
    const routePath = join(this.projectRoot, 'src', 'pages', 'api', routeName, fileName);
    const testPath = join(this.projectRoot, 'src', 'pages', 'api', routeName, testFileName);
    
    writeFileSync(routePath, template);
    writeFileSync(testPath, testTemplate);
    
    console.log(`Generated API route: ${routeName}`);
    console.log(`Route: ${routePath}`);
    console.log(`Test: ${testPath}`);
  }
  
  // Run database migrations
  runMigrations() {
    try {
      execSync('supabase db push', { stdio: 'inherit' });
      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Database migration failed:', error);
    }
  }
  
  // Reset database
  resetDatabase() {
    try {
      execSync('supabase db reset', { stdio: 'inherit' });
      console.log('Database reset completed successfully');
    } catch (error) {
      console.error('Database reset failed:', error);
    }
  }
  
  // Run all tests
  runTests() {
    try {
      execSync('npm run test', { stdio: 'inherit' });
      console.log('All tests passed');
    } catch (error) {
      console.error('Tests failed:', error);
    }
  }
  
  // Run linting
  runLinting() {
    try {
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('Linting passed');
    } catch (error) {
      console.error('Linting failed:', error);
    }
  }
  
  // Format code
  formatCode() {
    try {
      execSync('npm run format', { stdio: 'inherit' });
      console.log('Code formatting completed');
    } catch (error) {
      console.error('Code formatting failed:', error);
    }
  }
  
  // Build application
  buildApplication() {
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('Application built successfully');
    } catch (error) {
      console.error('Build failed:', error);
    }
  }
  
  // Clean build artifacts
  cleanBuild() {
    try {
      execSync('npm run clean', { stdio: 'inherit' });
      console.log('Build artifacts cleaned');
    } catch (error) {
      console.error('Clean failed:', error);
    }
  }
  
  // Generate documentation
  generateDocumentation() {
    try {
      execSync('npm run docs:generate', { stdio: 'inherit' });
      console.log('Documentation generated successfully');
    } catch (error) {
      console.error('Documentation generation failed:', error);
    }
  }
  
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  private getComponentTemplate(name: string): string {
    return `import React from 'react';

interface ${name}Props {
  // Define props here
}

const ${name}: React.FC<${name}Props> = ({}) => {
  return (
    <div className="${name.toLowerCase()}">
      {/* Component content */}
    </div>
  );
};

export default ${name};
`;
  }
  
  private getComponentTestTemplate(name: string): string {
    return `import { render, screen } from '@testing-library/react';
import ${name} from './${name}';

describe('${name}', () => {
  it('should render correctly', () => {
    render(<${name} />);
    expect(screen.getByText('${name}')).toBeInTheDocument();
  });
});
`;
  }
  
  private getPageTemplate(name: string): string {
    return `import React from 'react';
import { GetServerSideProps } from 'next';

interface ${name}PageProps {
  // Define page props here
}

const ${name}Page: React.FC<${name}PageProps> = ({}) => {
  return (
    <div className="${name.toLowerCase()}-page">
      {/* Page content */}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Server-side logic here
  return {
    props: {
      // Return props here
    }
  };
};

export default ${name}Page;
`;
  }
  
  private getPageTestTemplate(name: string): string {
    return `import { render, screen } from '@testing-library/react';
import ${name}Page from './${name}';

describe('${name}Page', () => {
  it('should render correctly', () => {
    render(<${name}Page />);
    expect(screen.getByText('${name}')).toBeInTheDocument();
  });
});
`;
  }
  
  private getHookTemplate(name: string): string {
    return `import { useState, useEffect } from 'react';

interface ${name}Return {
  // Define return type here
}

const use${name} = (): ${name}Return => {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Hook logic here
  }, []);
  
  return {
    // Return values here
  };
};

export default use${name};
`;
  }
  
  private getHookTestTemplate(name: string): string {
    return `import { renderHook } from '@testing-library/react';
import use${name} from './use${name}';

describe('use${name}', () => {
  it('should work correctly', () => {
    const { result } = renderHook(() => use${name}());
    expect(result.current).toBeDefined();
  });
});
`;
  }
  
  private getApiRouteTemplate(name: string, method: string): string {
    return `import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== '${method}') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // API logic here
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
`;
  }
  
  private getApiRouteTestTemplate(name: string, method: string): string {
    return `import { createMocks } from 'node-mocks-http';
import handler from './${name}';

describe('/api/${name}', () => {
  it('should handle ${method} requests', async () => {
    const { req, res } = createMocks({
      method: '${method}'
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
  });
  
  it('should return 405 for non-${method} requests', async () => {
    const { req, res } = createMocks({
      method: 'POST'
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
  });
});
`;
  }
}

// CLI interface
const devTools = new DevTools();
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'generate:component':
    devTools.generateComponent(args[0], 'component');
    break;
  case 'generate:page':
    devTools.generateComponent(args[0], 'page');
    break;
  case 'generate:hook':
    devTools.generateComponent(args[0], 'hook');
    break;
  case 'generate:api':
    devTools.generateApiRoute(args[0], args[1] as any);
    break;
  case 'migrate':
    devTools.runMigrations();
    break;
  case 'reset:db':
    devTools.resetDatabase();
    break;
  case 'test':
    devTools.runTests();
    break;
  case 'lint':
    devTools.runLinting();
    break;
  case 'format':
    devTools.formatCode();
    break;
  case 'build':
    devTools.buildApplication();
    break;
  case 'clean':
    devTools.cleanBuild();
    break;
  case 'docs':
    devTools.generateDocumentation();
    break;
  default:
    console.log('Available commands:');
    console.log('  generate:component <name> - Generate a new component');
    console.log('  generate:page <name> - Generate a new page');
    console.log('  generate:hook <name> - Generate a new hook');
    console.log('  generate:api <name> [method] - Generate a new API route');
    console.log('  migrate - Run database migrations');
    console.log('  reset:db - Reset database');
    console.log('  test - Run tests');
    console.log('  lint - Run linting');
    console.log('  format - Format code');
    console.log('  build - Build application');
    console.log('  clean - Clean build artifacts');
    console.log('  docs - Generate documentation');
}
```

### 7. Create Development Documentation
```markdown
# Development Workflow

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase CLI
- Docker (optional)

### Setup
1. Clone the repository
2. Run `npm run setup:dev` to set up the development environment
3. Update `.env.local` with your configuration
4. Run `npm run dev` to start the development server

## Development Commands

### Basic Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run E2E tests

### Database Commands
- `npm run db:setup` - Set up database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed database
- `npm run db:reset` - Reset database

### Development Tools
- `npm run generate:component <name>` - Generate a new component
- `npm run generate:page <name>` - Generate a new page
- `npm run generate:hook <name>` - Generate a new hook
- `npm run generate:api <name> [method]` - Generate a new API route

### Docker Commands
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:dev` - Run development environment with Docker
- `npm run docker:prod` - Run production environment with Docker

## Workflow

### Feature Development
1. Create a new branch from `develop`
2. Make your changes
3. Run tests and linting
4. Create a pull request
5. Wait for code review and CI checks
6. Merge to `develop`

### Release Process
1. Create a release branch from `develop`
2. Run full test suite
3. Update version and changelog
4. Create pull request to `main`
5. Deploy to staging for testing
6. Deploy to production

### Code Quality
- All code must pass linting and type checking
- All tests must pass
- Code coverage must be above 80%
- All new features must have tests
- All API endpoints must have tests

### Git Workflow
- Use conventional commits
- Create feature branches from `develop`
- Use pull requests for all changes
- Require code review for all changes
- Use squash and merge for feature branches

## Environment Setup

### Development Environment
- Node.js 18+
- npm or yarn
- Supabase CLI
- Docker (optional)

### Production Environment
- Node.js 18+
- PM2 or similar process manager
- Nginx or similar reverse proxy
- PostgreSQL database
- Redis cache
- SSL certificates

## Troubleshooting

### Common Issues
1. **Database connection issues**: Check Supabase configuration
2. **Build failures**: Check Node.js version and dependencies
3. **Test failures**: Check test environment setup
4. **Linting errors**: Run `npm run lint:fix`

### Getting Help
- Check the documentation
- Search existing issues
- Create a new issue with detailed information
- Ask in the development chat
```

## Testing Required
- [ ] Test CI/CD pipeline
- [ ] Verify development environment setup
- [ ] Test pre-commit hooks
- [ ] Verify development scripts
- [ ] Test Docker configuration
- [ ] Verify development tools
- [ ] Test development documentation

## Priority
**MEDIUM** - Important for development efficiency and code quality

## Dependencies
- Can be implemented independently

## Estimated Effort
4-5 days (including testing and implementation)

## Expected Improvements
- Automated quality checks
- Consistent development environment
- Faster development workflow
- Better code quality
- Safer deployments

## Related Issues
- Issue #19: Code Quality Metrics
- Issue #21: Production Readiness
