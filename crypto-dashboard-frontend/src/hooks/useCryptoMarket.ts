import { useState, useEffect, useCallback } from 'react';
import { cryptoApi, type CryptoListResponse } from '../api/cryptoApi';

export interface UseCryptoMarketResult {
  coins: CryptoListResponse[];
  loading: boolean;
  error: string | null;
  watchlist: Set<string>;
  toggleWatchlist: (coinId: string) => void;
  refetch: () => void;
}

const WATCHLIST_KEY = 'market_watchlist';

function loadWatchlist(): Set<string> {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export function useCryptoMarket(limit = 10): UseCryptoMarketResult {
  const [coins, setCoins] = useState<CryptoListResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(loadWatchlist);

  const fetchCoins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cryptoApi.getTop(limit);
      setCoins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void fetchCoins();
  }, [fetchCoins]);

  const toggleWatchlist = useCallback((coinId: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(coinId)) {
        next.delete(coinId);
      } else {
        next.add(coinId);
      }
      try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...next]));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return { coins, loading, error, watchlist, toggleWatchlist, refetch: fetchCoins };
}
