import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Chart } from 'chart.js/auto';

export default function Analytics() {
  const reducedMotion = useReducedMotion();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reelChart, setReelChart] = useState(null);
  const [jobChart, setJobChart] = useState(null);

  // Insert global styles for metric cards and charts
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .analytics-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
        margin-bottom: 2rem;
      }
      .metric-card {
        background: var(--background-card, #fff);
        border-radius: 8px;
        padding: 1rem;
        text-align: center;
        min-width: 150px;
        box-shadow: var(--shadow-sm, 0 2px 4px rgba(0,0,0,0.1));
      }
      .metric-card h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: var(--text-muted, #666);
      }
      .metric-card p {
        margin: 0;
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--text-primary, #222);
      }
      .analytics-chart-container {
        background: var(--background-card, #fff);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: var(--shadow-sm, 0 2px 4px rgba(0,0,0,0.1));
      }
      .chart-title {
        margin: 0 0 1rem 0;
        font-size: 1.25rem;
        color: var(--text-primary, #222);
        text-align: center;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/analytics');
      setAnalytics(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load analytics data. Please try again.');
      setLoading(false);
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Initialize charts when data is available
  useEffect(() => {
    if (analytics && !loading && !error) {
      const reelCtx = document.getElementById('reel-chart');
      const jobCtx = document.getElementById('job-chart');

      if (reelCtx && analytics.reel_creation_trend.length > 0) {
        const reelChartInstance = new Chart(reelCtx, {
          type: 'line',
          data: {
            labels: analytics.reel_creation_trend.map(item => item.date),
            datasets: [{
              label: 'Reels Created',
              data: analytics.reel_creation_trend.map(item => item.count),
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
              fill: false,
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              tooltip: { mode: 'index', intersect: false }
            },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Count' } },
              x: { title: { display: true, text: 'Date' } }
            }
          }
        });
        setReelChart(reelChartInstance);
      }

      if (jobCtx && analytics.job_creation_trend.length > 0) {
        const jobChartInstance = new Chart(jobCtx, {
          type: 'line',
          data: {
            labels: analytics.job_creation_trend.map(item => item.date),
            datasets: [{
              label: 'Jobs Created',
              data: analytics.job_creation_trend.map(item => item.count),
              borderColor: 'rgb(255, 99, 132)',
              tension: 0.1,
              fill: false,
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              tooltip: { mode: 'index', intersect: false }
            },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Count' } },
              x: { title: { display: true, text: 'Date' } }
            }
          }
        });
        setJobChart(jobChartInstance);
      }
    }
  }, [analytics, loading, error]);

  // Cleanup charts on unmount
  useEffect(() => {
    return () => {
      if (reelChart) reelChart.destroy();
      if (jobChart) jobChart.destroy();
    };
  }, [reelChart, jobChart]);

  if (loading) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 30 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.6 }}
      >
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, x: -50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
        >
          Analytics
        </motion.h1>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, x: 50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
        >
          Loading analytics...
        </motion.p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 30 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.6 }}
      >
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, x: -50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
        >
          Analytics
        </motion.h1>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, x: 50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
        >
          Error loading analytics: {error}
        </motion.p>
      </motion.div>
    );
  }

  if (!analytics) {
    return (
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 30 }}
        animate={reducedMotion ? false : { opacity: 1, y: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.6 }}
      >
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, x: -50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
        >
          Analytics
        </motion.h1>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, x: 50 }}
          animate={reducedMotion ? false : { opacity: 1, x: 0 }}
          transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
        >
          No analytics data available.
        </motion.p>
      </motion.div>
    );
  }

  const { reel_stats, job_stats, total_reels, rendering_success_rate, reel_creation_trend, job_creation_trend } = analytics;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 30 }}
      animate={reducedMotion ? false : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { duration: 0.6 }}
    >
      <motion.h1
        initial={reducedMotion ? false : { opacity: 0, x: -50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
      >
        Analytics
      </motion.h1>
      <motion.p
        initial={reducedMotion ? false : { opacity: 0, x: 50 }}
        animate={reducedMotion ? false : { opacity: 1, x: 0 }}
        transition={reducedMotion ? undefined : { duration: 0.8, delay: 0.4 }}
      >
        Summary metrics based on your reel and job data.
      </motion.p>

      <motion.div
        className="analytics-charts"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={reducedMotion ? false : { opacity: 1 }}
        transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.6 }}
      >
        {/* Summary Metrics */}
        <motion.div
          className="analytics-summary"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 20 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.1 }}
        >
          <div className="metric-card">
            <h3>Total Reels Created</h3>
            <p>{total_reels}</p>
          </div>
          <div className="metric-card">
            <h3>Rendering Success Rate</h3>
            <p>{rendering_success_rate}%</p>
          </div>
          <div className="metric-card">
            <h3>Completed Jobs</h3>
            <p>{job_stats.COMPLETED || 0}</p>
          </div>
          <div className="metric-card">
            <h3>Failed Jobs</h3>
            <p>{job_stats.FAILED || 0}</p>
          </div>
          <div className="metric-card">
            <h3>Pending Jobs</h3>
            <p>{job_stats.PENDING || 0}</p>
          </div>
          <div className="metric-card">
            <h3>Processing Jobs</h3>
            <p>{job_stats.PROCESSING || 0}</p>
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div
          className="analytics-chart-container"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 20 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.3 }}
        >
          <div className="chart-title">Reel Creation Trend (Last 7 Days)</div>
          <canvas id="reel-chart" width="400" height="200" />
        </motion.div>

        <motion.div
          className="analytics-chart-container"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={reducedMotion ? false : { opacity: 1, y: 20 }}
          transition={reducedMotion ? undefined : { duration: 0.5, delay: 0.4 }}
        >
          <div className="chart-title">Job Creation Trend (Last 7 Days)</div>
          <canvas id="job-chart" width="400" height="200" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}