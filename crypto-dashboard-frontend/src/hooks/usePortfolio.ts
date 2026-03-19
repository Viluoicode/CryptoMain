import { useState, useEffect, useCallback } from 'react';
import { portfolioApi, type PortfolioSummary, type PortfolioPerformance } from '../api/portfolioApi';
import { useAuth } from '../context/AuthContext';

interface PortfolioState {
  summary: PortfolioSummary | null;
  performance: PortfolioPerformance | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePortfolio(): PortfolioState {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryData, performanceData] = await Promise.all([
        portfolioApi.getSummary(),
        portfolioApi.getPerformance(),
      ]);
      setSummary(summaryData);
      setPerformance(performanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchPortfolio();
  }, [fetchPortfolio]);

  return { summary, performance, loading, error, refresh: fetchPortfolio };
}
