import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager, onlineManager, useQuery } from '@tanstack/react-query';
import { liveQueryPolicy } from '@/lib/live-query-policy';

let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers(); focusManager.setFocused(true); onlineManager.setOnline(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); focusManager.setFocused(undefined); onlineManager.setOnline(true); vi.useRealTimers(); });
function mount(staleTime = 0) {
  const read = vi.fn().mockResolvedValue({ revision: 1 });
  const hook = renderHook(() => useQuery({ queryKey: ['live'], queryFn: read, staleTime, ...liveQueryPolicy }), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  return { read, ...hook };
}
async function tick(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
it('keeps multi-user data refreshing after five minutes, without minute polling', async () => {
  const { read } = mount(); await tick(); expect(read).toHaveBeenCalledTimes(1);
  await tick(60_000); expect(read).toHaveBeenCalledTimes(1);
  read.mockResolvedValue({ revision: 2 }); await tick(240_000); expect(read).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(['live'])).toEqual({ revision: 2 });
});
it('does not poll a hidden tab and refreshes on return even with a fresh cache', async () => {
  const { read } = mount(Infinity); await tick();
  act(() => focusManager.setFocused(false)); await tick(900_000); expect(read).toHaveBeenCalledTimes(1);
  act(() => focusManager.setFocused(true)); await tick(); expect(read).toHaveBeenCalledTimes(2);
});
it('refreshes on reconnect and supports immediate post-write invalidation', async () => {
  const { read } = mount(Infinity); await tick();
  act(() => onlineManager.setOnline(false)); await tick(300_000); expect(read).toHaveBeenCalledTimes(1);
  act(() => onlineManager.setOnline(true)); await tick(); expect(read).toHaveBeenCalledTimes(2);
  await act(async () => { await client.invalidateQueries({ queryKey: ['live'] }); });
  expect(read).toHaveBeenCalledTimes(3);
});
it('surfaces a rejected refresh and recovers on the next invalidation', async () => {
  const { read, result } = mount(); await tick();
  read.mockRejectedValueOnce(new Error('access denied'));
  await act(async () => { await client.invalidateQueries({ queryKey: ['live'] }); }); await tick();
  expect(result.current.isError).toBe(true);
  read.mockResolvedValue({ revision: 3 });
  await act(async () => { await client.invalidateQueries({ queryKey: ['live'] }); }); await tick();
  expect(result.current.data).toEqual({ revision: 3 });
});
