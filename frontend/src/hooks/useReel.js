import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/api';

// How many Reels are fetched at a time.  The list used to fetch all of them
// at once, so a workspace with a hundred Reels produced a page over thirty
// thousand pixels tall.
const PAGE_SIZE = 24;

/**
 * The Reels and the workspace counters.
 *
 * The hook used to declare its cancellation flag inside the fetch function
 * and read it in the effect, which threw a ReferenceError before the first
 * response. It also polled every five seconds, which is far more often than
 * the workspace changes.
 */
export function useReel({ pollMs = 0 } = {}) {
  const [reels, setReels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const mounted = useRef(true);

  const fetchPage = useCallback(async (skip) => {
    const response = await api.get('/api/reels', {
      params: { skip, limit: PAGE_SIZE },
    });
    const items = response.data || [];
    return { items, hasMore: items.length === PAGE_SIZE };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [{ items, hasMore: more }, statsResponse] = await Promise.all([
        fetchPage(0),
        api.get('/api/stats'),
      ]);
      if (!mounted.current) return;
      setReels(items);
      setHasMore(more);
      setStats(statsResponse.data || {});
    } catch (err) {
      if (!mounted.current) return;
      setError(err?.response?.data?.detail || err?.message || 'The Reels could not be loaded.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { items, hasMore: more } = await fetchPage(reels.length);
      if (!mounted.current) return;
      setReels((previous) => [...previous, ...items]);
      setHasMore(more);
    } catch (err) {
      if (!mounted.current) return;
      setError(err?.response?.data?.detail || err?.message || 'More Reels could not be loaded.');
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, reels.length]);

  useEffect(() => {
    mounted.current = true;
    fetchData();
    if (!pollMs) {
      return () => {
        mounted.current = false;
      };
    }
    const timer = setInterval(fetchData, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [fetchData, pollMs]);

  return {
    reels,
    stats,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refetch: fetchData,
  };
}

export default useReel;
