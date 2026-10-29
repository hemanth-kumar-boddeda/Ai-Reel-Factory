import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import StatusBadge from '../components/shared/StatusBadge';
import { usePageEntrance, useScrollReveal } from '../lib/motion';
import './Analytics.css';

Chart.register(...registerables);

const GRID = 'rgba(255, 255, 255, 0.07)';
const TEXT = '#8a93a0';
const LIME = '#c6f24e';
const VIOLET = '#8b5cf6';

function Metric({ label, value, hint }) {
  return (
    <div className="metric-tile">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {hint && <span className="metric-hint">{hint}</span>}
    </div>
  );
}

function TrendChart({ id, title, labels, values, colour, unit }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !labels?.length) return undefined;
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            borderColor: colour,
            borderWidth: 1.6,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0.25,
            fill: true,
            backgroundColor: `${colour}14`,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420 },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: (item) => `${item.parsed.y} ${unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID, drawTicks: false },
            ticks: { color: TEXT, font: { size: 10 } },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: GRID, drawTicks: false },
            ticks: { color: TEXT, font: { size: 10 }, precision: 0 },
            border: { display: false },
          },
        },
      },
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, values, colour, title, unit]);

  if (!labels?.length) {
    return (
      <div className="analytics-chart">
        <p className="section-label">{title}</p>
        <div className="empty-state">
          <p className="empty-state-body">Nothing has been recorded yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-chart">
      <p className="section-label">{title}</p>
      <div className="analytics-chart-canvas">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

/**
 * Analytics.
 *
 * It shows the metrics Instagram actually returned, with the timestamp they
 * were collected at. A rate is only shown when the denominator is known, and
 * the page says so when there is not enough data for a recommendation.
 */
export default function Analytics() {
  const scope = useRef(null);
  const [insights, setInsights] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  usePageEntrance(scope, { selector: '[data-animate]' });
  useScrollReveal(scope);

  const load = async () => {
    try {
      setError(null);
      const [insightsResponse, recommendationsResponse] = await Promise.all([
        api.get('/api/analytics/insights'),
        api.get('/api/analytics/recommendations'),
      ]);
      setInsights(insightsResponse.data || {});
      setRecommendations(recommendationsResponse.data || null);
    } catch (loadError) {
      setError(
        loadError?.response?.data?.detail ||
          loadError?.message ||
          'The analytics could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const collect = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await api.post('/api/analytics/collect');
      setNotice(
        response.data?.message || 'The collection has been requested. It runs on a schedule.'
      );
      await load();
    } catch (collectError) {
      setError(
        collectError?.response?.data?.detail ||
          collectError?.message ||
          'The collection could not be started.'
      );
    } finally {
      setBusy(false);
    }
  };

  const overview = insights?.overview || {};
  const reels = insights?.reels || [];

  return (
    <div className="page stack" ref={scope}>
      {error && (
        <p className="notice notice-error" role="alert" data-animate>
          {error}
        </p>
      )}
      {notice && (
        <p className="notice notice-success" role="status" data-animate>
          {notice}
        </p>
      )}

      <section className="metric-row" data-animate>
        <Metric
          label="Published Reels"
          value={overview.total_reels ?? '–'}
          hint="confirmed by Instagram"
        />
        <Metric
          label="Average reach"
          value={overview.average_reach ?? '–'}
          hint="across the published Reels"
        />
        <Metric
          label="Average engagement"
          value={overview.average_engagement ?? '–'}
          hint="likes, comments, shares and saves"
        />
        <Metric
          label="Engagement rate"
          value={overview.engagement_rate ?? '–'}
          hint="only when the reach is known"
        />
      </section>

      {loading && !insights ? (
        <p className="muted small" data-animate>
          Loading the analytics…
        </p>
      ) : (
        <>
          <div className="analytics-charts" data-animate>
            <TrendChart
              id="reel-trend"
              title="Reels produced"
              unit="Reels"
              colour={LIME}
              labels={(insights?.reel_creation_trend || []).map((row) => row.date)}
              values={(insights?.reel_creation_trend || []).map((row) => row.count)}
            />
            <TrendChart
              id="job-trend"
              title="Jobs run"
              unit="Jobs"
              colour={VIOLET}
              labels={(insights?.job_creation_trend || []).map((row) => row.date)}
              values={(insights?.job_creation_trend || []).map((row) => row.count)}
            />
          </div>

          <section className="panel" data-animate>
            <header className="panel-header">
              <h3 className="panel-title">The published Reels</h3>
              <button
                type="button"
                className="btn btn-sm"
                onClick={collect}
                disabled={busy}
              >
                {busy ? 'Requesting…' : 'Collect now'}
              </button>
            </header>
            <div className="panel-body">
              {reels.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state-title">No metrics yet</p>
                  <p className="empty-state-body">
                    Instagram returns the insights of a Reel after it has been
                    published. Nothing is shown until the API has actually
                    answered.
                  </p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Reel</th>
                        <th>Published</th>
                        <th>Reach</th>
                        <th>Engagement</th>
                        <th>Rate</th>
                        <th>Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reels.map((reel) => (
                        <tr key={reel.id ?? reel.reel_id}>
                          <td className="truncate">{reel.title}</td>
                          <td className="muted small">
                            {reel.published_at
                              ? new Date(reel.published_at).toLocaleDateString()
                              : '–'}
                          </td>
                          <td className="mono-value">{reel.reach ?? '–'}</td>
                          <td className="mono-value">{reel.engagement ?? '–'}</td>
                          <td className="mono-value">
                            {reel.engagement_rate ?? '–'}
                          </td>
                          <td className="muted small">
                            {reel.collected_at || reel.metric_timestamp || '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="panel" data-animate>
            <header className="panel-header">
              <h3 className="panel-title">What the data says</h3>
              <StatusBadge
                state={
                  recommendations?.status === 'insufficient_data'
                    ? 'UNVERIFIED'
                    : 'READY_TO_PUBLISH'
                }
                label={
                  recommendations?.status === 'insufficient_data'
                    ? 'Not enough data'
                    : 'Ready'
                }
              />
            </header>
            <div className="panel-body">
              {!recommendations ? (
                <p className="muted small">
                  The recommendation engine has not answered yet.
                </p>
              ) : recommendations.status === 'insufficient_data' ? (
                <p className="muted small">
                  {recommendations.message ||
                    'Not enough published Reels yet for a reliable recommendation.'}
                </p>
              ) : (
                <div className="kv-list">
                  {Object.entries(recommendations.recommendations || {}).map(
                    ([key, value]) => (
                      <div className="kv" key={key}>
                        <span>{key.replace(/_/g, ' ')}</span>
                        <strong>
                          {value.recommended || value.recommended_bucket}
                        </strong>
                      </div>
                    )
                  )}
                  <p className="muted small">
                    Based on {recommendations.samples} published Reel(s) with
                    metrics.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
