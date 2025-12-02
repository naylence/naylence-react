# Hello App - 3 Node Architecture

This example demonstrates a 3-node Naylence fabric architecture running entirely in the browser—every node stays in the same tab, no backend services required.

## Architecture

- **Client Node**: Makes requests to the agent service
- **Sentinel Node**: Routes messages between the client and agent nodes
- **Agent Node**: Hosts and runs the HelloAgent service

All three nodes communicate via `BroadcastChannel` API in the browser, so you can inspect the full distributed topology with only DevTools open.

## Key Differences from 2-Node Setup

In the 2-node setup (`hello`), the agent runs directly on the sentinel node. In this 3-node setup:
- The sentinel acts purely as a router/coordinator
- The agent runs on its own separate node
- This mirrors distributed backend architectures where agents run on separate services

## Running the Example

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open your browser to the URL shown (typically http://localhost:5173)

## How It Works

1. **Sentinel starts first** - Acts as the message router
2. **Agent connects to sentinel** - Registers the `hello@fame.fabric` service
3. **Client connects to sentinel** - Can now call the remote agent
4. **Message flow**: Client → Sentinel → Agent → Sentinel → Client

## Files

- `config-3node.ts` - Configuration for all three node types
- `ClientNode.tsx` - UI and logic for the client node
- `SentinelNode.tsx` - UI for the sentinel (pure routing)
- `AgentNode.tsx` - UI and agent hosting logic
- `App.tsx` - Orchestrates initialization order
- `HelloAgent.ts` - Simple echo agent implementation

Because each node is browser-resident, you can open a single page and watch the entire fabric handshake happen client-side—ideal for learning or demos without standing up infrastructure.
