import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export function useReel() {
  const [reels, setReels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reelsRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/reels`),
          axios.get(`${API_BASE}/api/stats`)
        ]);
        setReels(reelsRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Optionally, set up an interval to refresh data
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return { reels, stats, loading };
}