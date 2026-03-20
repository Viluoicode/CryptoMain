import { useState, useEffect, useCallback } from 'react';
import { transactionApi, type TransactionResponse } from '../api/transactionApi';
import { useAuth } from '../context/AuthContext';

interface TransactionsState {
  transactions: TransactionResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTransactions(): TransactionsState {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await transactionApi.getAll();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, refresh: fetchTransactions };
}
