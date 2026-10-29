import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export function useReelOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createReel = useCallback(async (reelData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/reels`, reelData);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to create reel. Please try again.');
      throw err;
    }
  }, []);

  const updateReel = useCallback(async (id, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_BASE}/api/reel/${id}`, updateData);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to update reel. Please try again.');
      throw err;
    }
  }, []);

  const getReel = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/reel/${id}`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch reel. Please try again.');
      throw err;
    }
  }, []);

  const createRenderJob = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/reels/${reelId}/render`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to create render job. Please try again.');
      throw err;
    }
  }, []);

  const getJob = useCallback(async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/jobs/${jobId}`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch job. Please try again.');
      throw err;
    }
  }, []);

  // Publishing operations
  const publishReel = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/reels/${reelId}/publish`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to publish reel. Please try again.');
      throw err;
    }
  }, []);

  const schedulePublish = useCallback(async (reelId, scheduledAt, timezone) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/reels/${reelId}/schedule`, {
        scheduled_at: scheduledAt,
        timezone: timezone
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to schedule publish. Please try again.');
      throw err;
    }
  }, []);

  const getSchedule = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/reels/${reelId}/schedule`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch schedule. Please try again.');
      throw err;
    }
  }, []);

  const updateSchedule = useCallback(async (reelId, scheduledAt, timezone) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch(`${API_BASE}/api/reels/${reelId}/schedule`, {
        scheduled_at: scheduledAt,
        timezone: timezone
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to update schedule. Please try again.');
      throw err;
    }
  }, []);

  const cancelSchedule = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/reels/${reelId}/schedule/cancel`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to cancel schedule. Please try again.');
      throw err;
    }
  }, []);

  const retryPublish = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/reels/${reelId}/publish/retry`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to retry publish. Please try again.');
      throw err;
    }
  }, []);

  const getPublicationHistory = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/reels/${reelId}/publications`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch publication history. Please try again.');
      throw err;
    }
  }, []);

  // Analytics operations
  const getAnalytics = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/reels/${reelId}/analytics`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch analytics. Please try again.');
      throw err;
    }
  }, []);

  const refreshAnalytics = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/reels/${reelId}/analytics/refresh`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to refresh analytics. Please try again.');
      throw err;
    }
  }, []);

  const getAnalyticsHistory = useCallback(async (reelId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/reels/${reelId}/analytics/history`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch analytics history. Please try again.');
      throw err;
    }
  }, []);

  // Keep the old triggerRender for backward compatibility with global pipeline
  const triggerRender = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/run`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to trigger rendering. Please try again.');
      throw err;
    }
  }, []);

  return {
    createReel,
    updateReel,
    getReel,
    createRenderJob,
    getJob,
    publishReel,
    schedulePublish,
    getSchedule,
    updateSchedule,
    cancelSchedule,
    retryPublish,
    getPublicationHistory,
    getAnalytics,
    refreshAnalytics,
    getAnalyticsHistory,
    triggerRender, // Keeping for backward compatibility
    loading,
    error,
    setError,
  };
}
