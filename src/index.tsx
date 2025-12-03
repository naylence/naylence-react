import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
  type DependencyList,
} from 'react';
import { FameFabric, type FameAddress } from '@naylence/core';
import { Agent, type AgentProxy } from '@naylence/agent-sdk';

// Type for fabric.create() options parameter
type FabricOpts = Parameters<typeof FameFabric.create>[0];

// Fabric status union type
type FabricStatus = 'idle' | 'connecting' | 'ready' | 'error';

// Context value type
interface FabricContextValue {
  fabric: FameFabric | null;
  status: FabricStatus;
  error: unknown;
}

// Create React context
const FabricContext = createContext<FabricContextValue | null>(null);

// Provider props
interface FabricProviderProps {
  opts?: FabricOpts;
  children: ReactNode;
}

/**
 * FabricProvider component that manages the lifecycle of a FameFabric instance.
 *
 * Creates a single FameFabric on mount, calls enter(), keeps it entered for the
 * lifetime of the provider, and calls exit() on unmount.
 *
 * Handles React StrictMode double-mounting by properly cancelling in-flight operations.
 */
export function FabricProvider({ opts, children }: FabricProviderProps): JSX.Element {
  const [contextValue, setContextValue] = useState<FabricContextValue>({
    fabric: null,
    status: 'idle',
    error: null,
  });

  // Use a ref to track the current fabric instance across renders
  const fabricRef = useRef<FameFabric | null>(null);
  // Track pending cleanup to prevent race conditions
  const cleanupPromiseRef = useRef<Promise<void> | null>(null);

  // Track mount instance for logging
  // const mountIdRef = useRef<string>(
  //   `mount-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  // );

  useEffect(() => {
    // Track provider mounting
    const now = Date.now();
    providerMountCount++;
    providerMountTimestamps.push(now);

    // Keep only last 10 timestamps
    if (providerMountTimestamps.length > 10) {
      providerMountTimestamps.shift();
    }

    // const recentMounts = providerMountTimestamps.filter((ts) => now - ts < 200);
    // const isPotentialDoubleMount = recentMounts.length > 1;

    // Check if this is a page reload or cache restore
    // const navigationType =
    //   typeof performance !== 'undefined' && performance.navigation
    //     ? performance.navigation.type
    //     : undefined;
    // const navigationTypeStr =
    //   navigationType === 0
    //     ? 'navigate'
    //     : navigationType === 1
    //       ? 'reload'
    //       : navigationType === 2
    //         ? 'back_forward'
    //         : navigationType === 255
    //           ? 'reserved'
    //           : 'unknown';

    // console.log('[FabricProvider] Effect running', {
    //   mount_id: mountIdRef.current,
    //   mount_count: providerMountCount,
    //   potential_double_mount: isPotentialDoubleMount,
    //   recent_mounts_within_200ms: recentMounts.length,
    //   has_pending_cleanup: cleanupPromiseRef.current !== null,
    //   current_fabric_exists: fabricRef.current !== null,
    //   navigation_type: navigationTypeStr,
    //   page_visible: typeof document !== 'undefined' ? !document.hidden : undefined,
    // });

    let cancelled = false;
    let fabricInstance: FameFabric | null = null;

    const initFabric = async () => {
      // Wait for any pending cleanup from previous mount
      if (cleanupPromiseRef.current) {
        // console.log('[FabricProvider] Waiting for pending cleanup', {
        //   mount_id: mountIdRef.current,
        // });
        try {
          await cleanupPromiseRef.current;
          // console.log('[FabricProvider] Pending cleanup completed', {
          //   mount_id: mountIdRef.current,
          // });
        } catch (error) {
          // Cleanup errors are already logged, just continue
        // console.error('[FabricProvider] Cleanup error', {
        //   mount_id: mountIdRef.current,
        //   error,
        // });
        }
        cleanupPromiseRef.current = null;
      }

      if (cancelled) {
        // console.log('[FabricProvider] Cancelled before fabric creation', {
        //   mount_id: mountIdRef.current,
        // });
        return;
      }
      try {
        // Set status to connecting
        if (!cancelled) {
          // console.log('[FabricProvider] Setting status to connecting', {
          //   mount_id: mountIdRef.current,
          // });
          setContextValue({ fabric: null, status: 'connecting', error: null });
        }

        // Create the fabric
        // console.log('[FabricProvider] Creating fabric', {
        //   mount_id: mountIdRef.current,
        //   has_opts: opts !== undefined,
        // });
        const fabric =
          opts === undefined
            ? await (FameFabric.create as () => Promise<FameFabric>)()
            : await (FameFabric.create as (o: FabricOpts) => Promise<FameFabric>)(opts);

        if (cancelled) {
          // Cancelled during creation - exit immediately without entering
          // console.log('[FabricProvider] Cancelled after fabric creation, exiting immediately', {
          //   mount_id: mountIdRef.current,
          // });
          await fabric.exit?.();
          return;
        }

        // console.log('[FabricProvider] Fabric created successfully', {
        //   mount_id: mountIdRef.current,
        // });

        fabricInstance = fabric;
        fabricRef.current = fabric;

        // Enter the fabric
        // console.log('[FabricProvider] Entering fabric', {
        //   mount_id: mountIdRef.current,
        // });
        await fabric.enter();

        if (cancelled) {
          // Cancelled during enter - exit now
          // console.log('[FabricProvider] Cancelled during enter, exiting', {
          //   mount_id: mountIdRef.current,
          // });
          await fabric.exit?.();
          fabricRef.current = null;
          return;
        }

        // console.log('[FabricProvider] Fabric ready', {
        //   mount_id: mountIdRef.current,
        // });
        // Update state to ready
        setContextValue({ fabric, status: 'ready', error: null });
      } catch (err) {
        // console.error('[FabricProvider] Error during fabric initialization', {
        //   mount_id: mountIdRef.current,
        //   error: err,
        //   cancelled,
        // });
        if (!cancelled) {
          setContextValue({ fabric: null, status: 'error', error: err });
        }
        // Clean up on error
        if (fabricInstance) {
          try {
            await fabricInstance.exit?.();
          } catch (exitErr) {
            console.error('Error during fabric cleanup:', exitErr);
          }
        }
        fabricRef.current = null;
      }
    };

    void initFabric();

    // Cleanup function
    return () => {
      // console.log('[FabricProvider] Cleanup starting', {
      //   mount_id: mountIdRef.current,
      //   has_fabric: fabricRef.current !== null,
      // });
      cancelled = true;

      // Clean up the fabric instance if it exists
      const fabric = fabricRef.current;
      if (fabric) {
        fabricRef.current = null;

        // console.log('[FabricProvider] Exiting fabric', {
        //   mount_id: mountIdRef.current,
        // });

        // Store the cleanup promise so the next mount can wait for it
        const cleanup = fabric.exit?.().catch((err: unknown) => {
          console.error('Error during fabric exit:', err);
        });

        if (cleanup) {
          cleanupPromiseRef.current = cleanup;
        }
      }

      // console.log('[FabricProvider] Cleanup complete', {
      //   mount_id: mountIdRef.current,
      // });
    };
  }, [JSON.stringify(opts ?? {})]);

  return <FabricContext.Provider value={contextValue}>{children}</FabricContext.Provider>;
}

/**
 * useFabric hook to access the current fabric context.
 *
 * @throws Error if used outside of a FabricProvider
 * @returns The current fabric context value
 */
export function useFabric(): FabricContextValue {
  const ctx = useContext(FabricContext);
  if (!ctx) {
    throw new Error('useFabric must be used inside a <FabricProvider>.');
  }
  return ctx;
}

/**
 * useFabricEffect hook that runs an effect only when the fabric is ready.
 *
 * @param effect - Effect function that receives the fabric instance
 * @param deps - Dependency list for the effect
 */
export function useFabricEffect(
  effect: (fabric: FameFabric) => void | (() => void),
  deps: DependencyList = []
): void {
  const { fabric, status } = useFabric();

  useEffect(() => {
    if (status === 'ready' && fabric) {
      return effect(fabric);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabric, status, ...deps]);
}

/**
 * Creates a remote agent proxy for the given address using the provided fabric.
 *
 * @template T - Type of the agent interface extending Agent
 * @param address - The FameAddress of the remote agent
 * @param fabric - The FameFabric instance to use for communication
 * @returns An AgentProxy that can be used to invoke methods on the remote agent
 */
function createRemoteAgent<T extends Agent>(
  address: string | FameAddress,
  fabric: FameFabric
): AgentProxy<T> {
  return Agent.remoteByAddress<T>(address, { fabric });
}

/**
 * useRemoteAgent hook for convenient access to remote agents by address.
 *
 * @template T - Type of the agent interface extending Agent
 * @param address - The address of the remote agent
 * @returns The remote agent proxy when ready, or null if fabric is not ready
 */
export function useRemoteAgent<T extends Agent = Agent>(
  address: string | FameAddress
): AgentProxy<T> | null {
  const { fabric, status } = useFabric();

  return useMemo(() => {
    if (status !== 'ready' || !fabric) {
      return null;
    }

    return createRemoteAgent<T>(address, fabric);
  }, [fabric, status, address]);
}

// Re-export types
export type { FabricOpts, FabricStatus, FabricContextValue, FabricProviderProps };

// Debug tracking for StrictMode double-mount detection
let providerMountCount = 0;
const providerMountTimestamps: number[] = [];
