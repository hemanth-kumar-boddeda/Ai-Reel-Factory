import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export function useReel() {
  const [reels, setReels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reelsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/reels`),
        axios.get(`${API_BASE}/api/stats`)
      ]);
      setReels(reelsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Optionally, set up an interval to refresh data
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return { reels, stats, loading, error, refetch: fetchData };
}
