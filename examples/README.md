# @naylence/react Examples

This directory contains usage examples for the @naylence/react library.

## Basic Setup

```tsx
import { FabricProvider } from '@naylence/react';

function App() {
  return (
    <FabricProvider>
      <YourApp />
    </FabricProvider>
  );
}
```

## Examples

See `usage-examples.tsx` for comprehensive examples including:

1. **Basic FabricProvider usage** - Setting up the provider
2. **useFabric hook** - Accessing fabric status and instance
3. **useFabricEffect hook** - Running effects when fabric is ready
4. **useRemoteAgent hook** - Accessing remote services
5. **Custom configuration** - Passing options to FabricProvider
6. **Multiple effects with dependencies** - Advanced effect usage

## Running Examples

To use these examples in your project:

1. Install dependencies:
   ```bash
   npm install @naylence/react react
   ```

2. Import and use the components in your React application

3. Make sure to wrap your app with `<FabricProvider>` at the root level
