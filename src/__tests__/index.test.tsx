import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { FameFabric } from '@naylence/core';
import { Agent } from '@naylence/agent-sdk';
import {
  FabricProvider,
  useFabric,
  useFabricEffect,
  useRemoteAgent,
  type FabricStatus,
} from '../index';

function buildMockFabric() {
  return {
    enter: vi.fn().mockResolvedValue(undefined),
    exit: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
    invoke: vi.fn(),
    invokeByCapability: vi.fn(),
    invokeStream: vi.fn(),
    invokeByCapabilityStream: vi.fn(),
    subscribe: vi.fn(),
    serve: vi.fn(),
    resolveServiceByCapability: vi.fn(),
  };
}

function buildMockAgentProxy() {
  return {
    runTask: vi.fn().mockResolvedValue({ result: 'test' }),
    startTask: vi.fn(),
    getTaskStatus: vi.fn(),
    cancelTask: vi.fn(),
    subscribeToTaskUpdates: vi.fn(),
    unsubscribeTask: vi.fn(),
    registerPushEndpoint: vi.fn(),
    getPushNotificationConfig: vi.fn(),
  };
}

// Mock FameFabric
vi.mock('@naylence/core', () => ({
  FameFabric: {
    create: vi.fn().mockResolvedValue(buildMockFabric()),
  },
}));

// Mock Agent
vi.mock('@naylence/agent-sdk', () => ({
  Agent: {
    remoteByAddress: vi.fn().mockImplementation(() => buildMockAgentProxy()),
  },
}));

const resetDefaultMocks = () => {
  vi.mocked(FameFabric.create).mockReset();
  vi.mocked(FameFabric.create).mockResolvedValue(buildMockFabric() as unknown as FameFabric);

  vi.mocked(Agent.remoteByAddress).mockReset();
  vi.mocked(Agent.remoteByAddress).mockImplementation(() => buildMockAgentProxy());
};

beforeEach(() => {
  resetDefaultMocks();
});

describe('FabricProvider', () => {
  it('should provide fabric context to children', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result } = renderHook(() => useFabric(), { wrapper });

    // Initially should be connecting
    expect(result.current.status).toBe('connecting');
    expect(result.current.fabric).toBeNull();

    // Wait for fabric to be ready
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current.fabric).toBeTruthy();
    expect(result.current.error).toBeNull();
    expect(FameFabric.create).toHaveBeenCalledTimes(1);
  });

  it('should call fabric.enter() on mount', async () => {
    const mockEnter = vi.fn().mockResolvedValue(undefined);
    const mockFabric: Partial<FameFabric> = {
      enter: mockEnter,
      exit: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(FameFabric.create).mockResolvedValue(mockFabric as FameFabric);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    renderHook(() => useFabric(), { wrapper });

    await waitFor(() => {
      expect(mockEnter).toHaveBeenCalledTimes(1);
    });
  });

  it('should call fabric.exit() on unmount', async () => {
    const mockExit = vi.fn().mockResolvedValue(undefined);
    const mockFabric: Partial<FameFabric> = {
      enter: vi.fn().mockResolvedValue(undefined),
      exit: mockExit,
    };
    vi.mocked(FameFabric.create).mockResolvedValue(mockFabric as FameFabric);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { unmount } = renderHook(() => useFabric(), { wrapper });

    await waitFor(() => {
      expect(mockFabric.enter).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockExit).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle fabric creation errors', async () => {
    const error = new Error('Creation failed');
    vi.mocked(FameFabric.create).mockRejectedValue(error);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result } = renderHook(() => useFabric(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe(error);
    expect(result.current.fabric).toBeNull();
  });

  it('should handle fabric enter errors', async () => {
    const error = new Error('Enter failed');
    const mockFabric: Partial<FameFabric> = {
      enter: vi.fn().mockRejectedValue(error),
      exit: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(FameFabric.create).mockResolvedValue(mockFabric as FameFabric);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result } = renderHook(() => useFabric(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe(error);
  });

  it('should pass opts to FameFabric.create', async () => {
    const opts = { rootConfig: { some: 'config' } };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider opts={opts}>{children}</FabricProvider>
    );

    renderHook(() => useFabric(), { wrapper });

    await waitFor(() => {
      expect(FameFabric.create).toHaveBeenCalledWith(opts);
    });
  });

  it('should recreate fabric when opts change', async () => {
    const opts1 = { rootConfig: { version: 1 } };
    const opts2 = { rootConfig: { version: 2 } };

    let currentOpts = opts1;
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider opts={currentOpts}>{children}</FabricProvider>
    );

    const { rerender } = renderHook(() => useFabric(), { wrapper });

    await waitFor(() => {
      expect(FameFabric.create).toHaveBeenCalledWith(opts1);
    });

    currentOpts = opts2;
    rerender();

    await waitFor(() => {
      expect(FameFabric.create).toHaveBeenCalledWith(opts2);
    });

    expect(FameFabric.create).toHaveBeenCalledTimes(2);
  });
});

describe('useFabric', () => {
  it('should throw error when used outside FabricProvider', () => {
    expect(() => {
      renderHook(() => useFabric());
    }).toThrow('useFabric must be used inside a <FabricProvider>.');
  });

  it('should return fabric context value', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result } = renderHook(() => useFabric(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current).toHaveProperty('fabric');
    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('error');
  });
});

describe('useFabricEffect', () => {
  it('should run effect when fabric is ready', async () => {
    const effectFn = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    renderHook(() => useFabricEffect(effectFn), { wrapper });

    await waitFor(() => {
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    expect(effectFn).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should not run effect when fabric is not ready', () => {
    const error = new Error('Not ready');
    vi.mocked(FameFabric.create).mockRejectedValue(error);

    const effectFn = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    renderHook(() => useFabricEffect(effectFn), { wrapper });

    expect(effectFn).not.toHaveBeenCalled();
  });

  it('should call cleanup function on unmount', async () => {
    const cleanup = vi.fn();
    const effectFn = vi.fn(() => cleanup);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { unmount } = renderHook(() => useFabricEffect(effectFn), { wrapper });

    await waitFor(() => {
      expect(effectFn).toHaveBeenCalled();
    });

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('should re-run effect when dependencies change', async () => {
    const effectFn = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { rerender } = renderHook(({ dep }) => useFabricEffect(effectFn, [dep]), {
      initialProps: { dep: 1 },
      wrapper,
    });

    await waitFor(() => {
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    rerender({ dep: 2 });

    await waitFor(() => {
      expect(effectFn).toHaveBeenCalledTimes(2);
    });
  });

  it('should support async cleanup functions', async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const effectFn = vi.fn(() => cleanup);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { unmount } = renderHook(() => useFabricEffect(effectFn), { wrapper });

    await waitFor(() => {
      expect(effectFn).toHaveBeenCalled();
    });

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('useRemoteAgent', () => {
  it('should return null when fabric is not ready', () => {
    const error = new Error('Not ready');
    vi.mocked(FameFabric.create).mockRejectedValue(error);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result } = renderHook(() => useRemoteAgent('test@fame.fabric'), {
      wrapper,
    });

    expect(result.current).toBeNull();
  });

  it('should return agent proxy when fabric is ready', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result } = renderHook(() => useRemoteAgent('test@fame.fabric'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current).toBeTruthy();
    expect(typeof result.current).toBe('object');
  });

  it('should memoize agent for the same address', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result, rerender } = renderHook(() => useRemoteAgent('test@fame.fabric'), { wrapper });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const firstAgent = result.current;

    rerender();

    expect(result.current).toBe(firstAgent);
  });

  it('should create new agent when address changes', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result, rerender } = renderHook(({ address }) => useRemoteAgent(address), {
      initialProps: { address: 'test1@fame.fabric' },
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const firstAgent = result.current;

    rerender({ address: 'test2@fame.fabric' });

    await waitFor(() => {
      expect(result.current).not.toBe(firstAgent);
    });
  });

  it('should create agent proxy when fabric is ready', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FabricProvider>{children}</FabricProvider>
    );

    const { result } = renderHook(() => useRemoteAgent('test@fame.fabric'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(Agent.remoteByAddress).toHaveBeenCalled();
    expect(result.current).toBeTruthy();
  });
});

describe('Type exports', () => {
  it('should export FabricStatus type', () => {
    const statuses: FabricStatus[] = ['idle', 'connecting', 'ready', 'error'];
    expect(statuses).toHaveLength(4);
  });
});
