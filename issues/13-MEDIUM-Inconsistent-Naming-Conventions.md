# 🟡 MEDIUM: Inconsistent Naming Conventions

## Issue Summary
The codebase has inconsistent naming conventions across different parts of the application, making it harder to read, maintain, and understand.

## Current State
- Inconsistent naming between database and frontend
- Mixed naming conventions (camelCase vs snake_case)
- Inconsistent variable and function naming
- No clear naming standards documented

## Impact
- **Readability Issues**: Harder to understand code
- **Maintenance Difficulty**: Inconsistent patterns make refactoring harder
- **Developer Experience**: Confusing for new developers
- **Code Quality**: Reduces overall code quality

## Evidence
- Mixed naming conventions mentioned in analysis
- Inconsistent patterns across the codebase
- No documented naming standards

## Solution
### 1. Establish Naming Standards
```typescript
// Naming conventions documentation
interface NamingStandards {
  // Variables and functions: camelCase
  // Examples: userName, getUserById, isOnline
  
  // Constants: UPPER_SNAKE_CASE
  // Examples: MAX_RETRY_ATTEMPTS, DEFAULT_TIMEOUT
  
  // Types and interfaces: PascalCase
  // Examples: User, ChatSession, ApiResponse
  
  // Database columns: snake_case
  // Examples: user_id, created_at, is_online
  
  // API endpoints: kebab-case
  // Examples: /api/chat/create-session, /api/user/update-activity
  
  // CSS classes: kebab-case
  // Examples: .chat-message, .user-avatar, .typing-indicator
  
  // Environment variables: UPPER_SNAKE_CASE
  // Examples: DATABASE_URL, API_BASE_URL, NODE_ENV
}
```

### 2. Create Naming Utility Functions
```typescript
// Naming utility functions
class NamingUtils {
  // Convert snake_case to camelCase
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  // Convert camelCase to snake_case
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  // Convert camelCase to kebab-case
  static camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
  
  // Convert kebab-case to camelCase
  static kebabToCamel(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  // Convert PascalCase to camelCase
  static pascalToCamel(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
  
  // Convert camelCase to PascalCase
  static camelToPascal(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Usage examples
const examples = {
  snakeToCamel: NamingUtils.snakeToCamel('user_id'), // 'userId'
  camelToSnake: NamingUtils.camelToSnake('userId'), // 'user_id'
  camelToKebab: NamingUtils.camelToKebab('userName'), // 'user-name'
  kebabToCamel: NamingUtils.kebabToCamel('user-name'), // 'userName'
  pascalToCamel: NamingUtils.pascalToCamel('UserName'), // 'userName'
  camelToPascal: NamingUtils.camelToPascal('userName') // 'UserName'
};
```

### 3. Create Database Naming Mapper
```typescript
// Database naming mapper
class DatabaseNamingMapper {
  // Map database columns to frontend properties
  static mapDatabaseToFrontend<T extends Record<string, any>>(data: T): T {
    const mapped: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const camelKey = NamingUtils.snakeToCamel(key);
      mapped[camelKey] = value;
    }
    
    return mapped as T;
  }
  
  // Map frontend properties to database columns
  static mapFrontendToDatabase<T extends Record<string, any>>(data: T): T {
    const mapped: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const snakeKey = NamingUtils.camelToSnake(key);
      mapped[snakeKey] = value;
    }
    
    return mapped as T;
  }
}

// Usage example
const userData = {
  user_id: '123',
  created_at: '2023-01-01',
  is_online: true
};

const frontendUser = DatabaseNamingMapper.mapDatabaseToFrontend(userData);
// Result: { userId: '123', createdAt: '2023-01-01', isOnline: true }
```

### 4. Create API Naming Mapper
```typescript
// API naming mapper
class ApiNamingMapper {
  // Map API response to frontend format
  static mapApiResponse<T extends Record<string, any>>(response: T): T {
    return DatabaseNamingMapper.mapDatabaseToFrontend(response);
  }
  
  // Map frontend data to API request format
  static mapApiRequest<T extends Record<string, any>>(data: T): T {
    return DatabaseNamingMapper.mapFrontendToDatabase(data);
  }
  
  // Map API endpoint to consistent format
  static normalizeEndpoint(endpoint: string): string {
    // Ensure consistent kebab-case format
    return endpoint
      .replace(/([A-Z])/g, '-$1')
      .replace(/_/g, '-')
      .toLowerCase()
      .replace(/^-/, '');
  }
}

// Usage examples
const apiEndpoints = {
  createSession: '/api/chat/create-session',
  sendMessage: '/api/chat/send-message',
  updateUser: '/api/user/update-activity'
};

const normalizedEndpoints = Object.entries(apiEndpoints).reduce((acc, [key, value]) => {
  acc[key] = ApiNamingMapper.normalizeEndpoint(value);
  return acc;
}, {} as Record<string, string>);
```

### 5. Create CSS Naming Mapper
```typescript
// CSS naming mapper
class CssNamingMapper {
  // Convert component name to CSS class
  static componentToClass(componentName: string): string {
    return NamingUtils.camelToKebab(componentName);
  }
  
  // Convert CSS class to component name
  static classToComponent(className: string): string {
    return NamingUtils.kebabToCamel(className);
  }
  
  // Generate consistent CSS class names
  static generateClassName(component: string, element?: string, modifier?: string): string {
    let className = this.componentToClass(component);
    
    if (element) {
      className += `__${this.componentToClass(element)}`;
    }
    
    if (modifier) {
      className += `--${this.componentToClass(modifier)}`;
    }
    
    return className;
  }
}

// Usage examples
const cssClasses = {
  chatMessage: CssNamingMapper.generateClassName('chatMessage'), // 'chat-message'
  chatMessageContent: CssNamingMapper.generateClassName('chatMessage', 'content'), // 'chat-message__content'
  chatMessageActive: CssNamingMapper.generateClassName('chatMessage', null, 'active') // 'chat-message--active'
};
```

### 6. Create Naming Validation
```typescript
// Naming validation
class NamingValidator {
  // Validate camelCase
  static isValidCamelCase(str: string): boolean {
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }
  
  // Validate snake_case
  static isValidSnakeCase(str: string): boolean {
    return /^[a-z][a-z0-9_]*$/.test(str);
  }
  
  // Validate kebab-case
  static isValidKebabCase(str: string): boolean {
    return /^[a-z][a-z0-9-]*$/.test(str);
  }
  
  // Validate PascalCase
  static isValidPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }
  
  // Validate UPPER_SNAKE_CASE
  static isValidUpperSnakeCase(str: string): boolean {
    return /^[A-Z][A-Z0-9_]*$/.test(str);
  }
  
  // Validate naming convention
  static validateNaming(
    str: string,
    convention: 'camelCase' | 'snake_case' | 'kebab-case' | 'PascalCase' | 'UPPER_SNAKE_CASE'
  ): boolean {
    switch (convention) {
      case 'camelCase':
        return this.isValidCamelCase(str);
      case 'snake_case':
        return this.isValidSnakeCase(str);
      case 'kebab-case':
        return this.isValidKebabCase(str);
      case 'PascalCase':
        return this.isValidPascalCase(str);
      case 'UPPER_SNAKE_CASE':
        return this.isValidUpperSnakeCase(str);
      default:
        return false;
    }
  }
}

// Usage examples
const validationExamples = {
  camelCase: NamingValidator.validateNaming('userName', 'camelCase'), // true
  snakeCase: NamingValidator.validateNaming('user_name', 'snake_case'), // true
  kebabCase: NamingValidator.validateNaming('user-name', 'kebab-case'), // true
  pascalCase: NamingValidator.validateNaming('UserName', 'PascalCase'), // true
  upperSnakeCase: NamingValidator.validateNaming('USER_NAME', 'UPPER_SNAKE_CASE') // true
};
```

### 7. Create Naming Migration Tool
```typescript
// Naming migration tool
class NamingMigrationTool {
  // Migrate object keys to new naming convention
  static migrateObjectKeys<T extends Record<string, any>>(
    obj: T,
    fromConvention: 'camelCase' | 'snake_case' | 'kebab-case',
    toConvention: 'camelCase' | 'snake_case' | 'kebab-case'
  ): T {
    const migrated: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      let newKey = key;
      
      // Convert from source convention to camelCase
      switch (fromConvention) {
        case 'snake_case':
          newKey = NamingUtils.snakeToCamel(key);
          break;
        case 'kebab-case':
          newKey = NamingUtils.kebabToCamel(key);
          break;
        case 'camelCase':
          newKey = key;
          break;
      }
      
      // Convert from camelCase to target convention
      switch (toConvention) {
        case 'snake_case':
          newKey = NamingUtils.camelToSnake(newKey);
          break;
        case 'kebab-case':
          newKey = NamingUtils.camelToKebab(newKey);
          break;
        case 'camelCase':
          newKey = newKey;
          break;
      }
      
      migrated[newKey] = value;
    }
    
    return migrated as T;
  }
  
  // Migrate array of objects
  static migrateArrayKeys<T extends Record<string, any>>(
    arr: T[],
    fromConvention: 'camelCase' | 'snake_case' | 'kebab-case',
    toConvention: 'camelCase' | 'snake_case' | 'kebab-case'
  ): T[] {
    return arr.map(obj => this.migrateObjectKeys(obj, fromConvention, toConvention));
  }
}

// Usage example
const userData = {
  user_id: '123',
  created_at: '2023-01-01',
  is_online: true
};

const migratedData = NamingMigrationTool.migrateObjectKeys(
  userData,
  'snake_case',
  'camelCase'
);
// Result: { userId: '123', createdAt: '2023-01-01', isOnline: true }
```

## Testing Required
- [ ] Test naming utility functions
- [ ] Verify database naming mapper
- [ ] Test API naming mapper
- [ ] Verify CSS naming mapper
- [ ] Test naming validation
- [ ] Test naming migration tool

## Priority
**MEDIUM** - Important for code quality and maintainability

## Dependencies
- Can be implemented independently

## Estimated Effort
2-3 days (including testing and implementation)

## Expected Improvements
- Consistent naming conventions
- Better code readability
- Easier maintenance
- Improved developer experience

## Related Issues
- Issue #11: Missing Type Safety
- Issue #14: Missing Documentation
