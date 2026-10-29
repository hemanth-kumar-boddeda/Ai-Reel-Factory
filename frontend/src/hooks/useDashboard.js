import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * Loads everything the observability dashboard needs in one place.
 *
 * Each section fails independently: a broken provider-health endpoint must
 * not blank out the whole console.
 */
const EMPTY = {
  stories: [],
  jobs: [],
  failures: [],
  providers: [],
  analytics: { overview: {}, reels: [] },
  recommendations: null,
  scheduler: null,
  connection: null,
  pipeline: null,
};

export function useDashboard({ pollMs = 30000 } = {}) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [
      stories, jobs, failures, providers, analytics, recommendations,
      pipeline, connection,
    ] = await Promise.allSettled([
      api.get('/api/stories?limit=25'),
      api.get('/api/jobs?limit=25'),
      api.get('/api/failures?limit=15'),
      api.get('/api/providers/health'),
      api.get('/api/analytics/insights'),
      api.get('/api/analytics/recommendations'),
      api.get('/api/pipeline/status'),
      api.get('/api/instagram/connection'),
    ]);

    const value = (settled, fallback) =>
      settled.status === 'fulfilled' ? settled.value.data : fallback;

    setData({
      stories: value(stories, []),
      jobs: value(jobs, []),
      failures: value(failures, []),
      providers: value(providers, { providers: [] }).providers || [],
      analytics: value(analytics, { overview: {}, reels: [] }),
      recommendations: value(recommendations, null),
      pipeline: value(pipeline, null),
      connection: value(connection, null),
    });

    const rejected = [stories, jobs, failures, providers, analytics, pipeline]
      .filter((r) => r.status === 'rejected');
    setError(rejected.length ? 'Some dashboard data could not be loaded.' : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (!pollMs) return undefined;
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  const runPipeline = useCallback(async ({ publish = false, dryRun = true } = {}) => {
    setBusy(true);
    try {
      const response = await api.post('/api/pipeline/run', null, {
        params: { publish, dry_run: dryRun },
      });
      await load();
      return response.data;
    } finally {
      setBusy(false);
    }
  }, [load]);

  const runDiscovery = useCallback(async () => {
    setBusy(true);
    try {
      const response = await api.post('/api/discover');
      await load();
      return response.data;
    } finally {
      setBusy(false);
    }
  }, [load]);

  const publishReel = useCallback(async (reelId) => {
    setBusy(true);
    try {
      const response = await api.post(`/api/reels/${reelId}/publish`);
      await load();
      return response.data;
    } finally {
      setBusy(false);
    }
  }, [load]);

  const retryJob = useCallback(async (jobId) => {
    setBusy(true);
    try {
      const response = await api.post(`/api/failures/${jobId}/retry`);
      await load();
      return response.data;
    } finally {
      setBusy(false);
    }
  }, [load]);

  return { data, loading, error, busy, reload: load, runPipeline, runDiscovery, publishReel, retryJob };
}

export default useDashboard;
