import React from 'react';
import { FabricProvider, useFabric, useFabricEffect, useRemoteAgent } from '../src/index';
import type { Agent } from '@naylence/agent-sdk';

// Example: Basic usage of FabricProvider
export function App() {
  return (
    <FabricProvider>
      <MyComponent />
    </FabricProvider>
  );
}

// Example: Using useFabric hook
function MyComponent() {
  const { fabric, status, error } = useFabric();

  if (status === 'idle') {
    return <div>Initializing...</div>;
  }

  if (status === 'connecting') {
    return <div>Connecting to fabric...</div>;
  }

  if (status === 'error') {
    return <div>Error: {String(error)}</div>;
  }

  if (status === 'ready' && fabric) {
    return (
      <div>
        <h1>Connected to Fabric!</h1>
        <ServiceComponent />
      </div>
    );
  }

  return null;
}

// Example: Using useFabricEffect
function ServiceComponent() {
  const [message, setMessage] = React.useState<string>('');

  useFabricEffect(
    (fabric) => {
      console.log('Fabric is ready!', fabric);
      
      // Perform operations with fabric
      setMessage('Fabric initialized successfully');

      // Optional cleanup
      return () => {
        console.log('Cleaning up fabric effect');
      };
    },
    [] // Dependencies
  );

  return <div>{message}</div>;
}

// Example: Using useRemoteAgent
interface MathService extends Agent {
  add(a: number, b: number): Promise<number>;
  multiply(a: number, b: number): Promise<number>;
}

function CalculatorComponent() {
  const mathService = useRemoteAgent<MathService>('math@fame.fabric');
  const [result, setResult] = React.useState<number | null>(null);

  const handleCalculate = async () => {
    if (!mathService) {
      console.log('Service not available yet');
      return;
    }

    try {
      const sum = await mathService.runTask({ operation: 'add', a: 5, b: 3 });
      setResult(sum);
    } catch (error) {
      console.error('Calculation failed:', error);
    }
  };

  if (!mathService) {
    return <div>Waiting for math service...</div>;
  }

  return (
    <div>
      <button onClick={handleCalculate}>Calculate 5 + 3</button>
      {result !== null && <div>Result: {result}</div>}
    </div>
  );
}

// Example: Using FabricProvider with custom options
export function AppWithOptions() {
  const fabricOptions = {
    rootConfig: {
      // Your fabric configuration here
      someOption: 'value',
    },
  };

  return (
    <FabricProvider opts={fabricOptions}>
      <MyComponent />
    </FabricProvider>
  );
}

// Example: Multiple fabric effects with dependencies
function DataComponent() {
  const [userId, setUserId] = React.useState<string>('user-123');
  const [userData, setUserData] = React.useState<Record<string, unknown> | null>(null);

  useFabricEffect(
    (fabric) => {
      console.log('Loading user data for:', userId);
      
      // Fetch user data when userId changes
      // (This is a placeholder - actual implementation would use fabric services)
      setUserData({ id: userId, name: 'Test User' });

      return () => {
        console.log('Cleanup previous user data fetch');
      };
    },
    [userId] // Re-run when userId changes
  );

  return (
    <div>
      <input
        type="text"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="Enter user ID"
      />
      {userData && <pre>{JSON.stringify(userData, null, 2)}</pre>}
    </div>
  );
}
