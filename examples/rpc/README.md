# RPC Example

This example demonstrates using the Naylence React integration with a MathAgent that exposes RPC operations using the `@operation` decorator.

## Features

- **MathAgent** with three operations:
  - `add(x, y)` - Simple addition
  - `multiply(x, y)` - Simple multiplication  
  - `fib_stream(n)` - Streaming Fibonacci sequence

- **Decorator Support** - Uses `@operation` decorator with proper Vite/Babel configuration

- **Streaming RPC** - Demonstrates async generator streaming from agent to client

## Running

```bash
npm install
npm run dev
```

## Architecture

- **MathSentinel** - Serves the MathAgent on the Sentinel node
- **MathClient** - Connects to the agent and invokes operations
- **BroadcastChannel** - Communication between client and sentinel in the browser
