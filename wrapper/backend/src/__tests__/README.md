# Backend Tests

This directory contains automated tests for the backend API.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Files

- `health.test.js` - Tests for health check endpoints
- `example.test.js` - Example test patterns and common testing scenarios

## Writing New Tests

1. Create a new file: `src/__tests__/your-feature.test.js`
2. Import necessary modules:
   ```javascript
   import { describe, it, expect } from 'vitest';
   import Fastify from 'fastify';
   ```
3. Write your tests following the patterns in `example.test.js`

## Test Structure

```javascript
describe('Feature Name', () => {
  it('should do something specific', async () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = await myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Testing API Endpoints

Use Fastify's `inject` method to test routes:

```javascript
const response = await app.inject({
  method: 'GET',
  url: '/api/endpoint'
});

expect(response.statusCode).toBe(200);
expect(response.json()).toHaveProperty('data');
```

## Best Practices

1. **One test = One assertion** (when possible)
2. **Test both success and error cases**
3. **Use descriptive test names**
4. **Clean up test data after tests**
5. **Mock external services** (don't call real APIs)



