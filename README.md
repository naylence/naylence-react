# @naylence/react

React integration library for Naylence Fame Fabric.

## Installation

```bash
npm install @naylence/react react
```

## Usage

### FabricProvider

Wrap your React application with `FabricProvider` to manage a long-lived FameFabric instance:

```tsx
import { FabricProvider } from '@naylence/react';

function App() {
  return (
    <FabricProvider opts={{ /* fabric options */ }}>
      <YourApp />
    </FabricProvider>
  );
}
```

### useFabric Hook

Access the current fabric and its status:

```tsx
import { useFabric } from '@naylence/react';

function MyComponent() {
  const { fabric, status, error } = useFabric();

  if (status === 'connecting') {
    return <div>Connecting to fabric...</div>;
  }

  if (status === 'error') {
    return <div>Error: {String(error)}</div>;
  }

  if (status === 'ready' && fabric) {
    // Use fabric here
    return <div>Connected!</div>;
  }

  return <div>Idle</div>;
}
```

### useFabricEffect Hook

Run effects that depend on a ready fabric:

```tsx
import { useFabricEffect } from '@naylence/react';

function MyComponent() {
  useFabricEffect((fabric) => {
    // This only runs when fabric is ready
    console.log('Fabric is ready:', fabric);

    return () => {
      // Optional cleanup
      console.log('Cleaning up');
    };
  }, [/* dependencies */]);

  return <div>Component</div>;
}
```

### useRemoteAgent Hook

Access remote agents by address:

```tsx
import { useRemoteAgent } from '@naylence/react';

function MyComponent() {
  const agent = useRemoteAgent<MyAgentType>('my-agent@fame.fabric');

  if (!agent) {
    return <div>Agent not available</div>;
  }

  // Use agent methods
  return <div>Agent ready</div>;
}
```

## API

### `FabricProvider`

Props:
- `opts?: FabricOpts` - Optional configuration for `FameFabric.create()`
- `children: ReactNode` - Child components

### `useFabric()`

Returns: `FabricContextValue`
- `fabric: FameFabric | null` - The fabric instance (null if not ready)
- `status: FabricStatus` - Current status: `'idle' | 'connecting' | 'ready' | 'error'`
- `error: unknown` - Error if status is `'error'`

Throws: Error if used outside of `<FabricProvider>`

### `useFabricEffect(effect, deps?)`

Parameters:
- `effect: (fabric: FameFabric) => void | (() => void | Promise<void>)` - Effect function
- `deps?: DependencyList` - Optional dependency list

Runs the effect only when fabric status is `'ready'`.

### `useRemoteAgent<T>(address)`

Parameters:
- `address: string | FameAddress` - Address of the remote agent

Returns: `T | null` - The remote agent proxy, or null if fabric is not ready

## License

Apache-2.0
