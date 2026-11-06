/** Bounded live refresh; backend authorization still runs on every request. */
export const liveQueryPolicy = {
  refetchInterval: 300_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: 'always',
  refetchOnReconnect: 'always',
} as const;
