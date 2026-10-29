import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import StatusBadge from '../components/shared/StatusBadge';
import { usePageEntrance, useJobProgress } from '../lib/motion';
import './Jobs.css';

const RETRYABLE = ['FAILED', 'DEAD_LETTER'];
const LIVE = ['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING'];

/**
 * The one-line summary of a finished job.
 *
 * The stored result is a JSON document that can be thousands of characters
 * long.  Printing it turns the table into a wall of text, so only the few
 * facts a person needs are shown.
 *
 * A result that was truncated in the database no longer parses as JSON.  The
 * raw text is never printed - the fields that are still readable are picked
 * out of it, and when nothing can be picked out the job is simply reported
 * as finished.
 */
function summariseResult(result) {
  if (!result) return '';
  let data = null;
  try {
    data = typeof result === 'string' ? JSON.parse(result) : result;
  } catch {
    // It is not JSON - it was truncated, or it is not JSON at all.  The
    // readable fields are salvaged rather than the raw document.
    return summariseTruncated(result);
  }
  if (!data || typeof data !== 'object') return summariseTruncated(result);
  const parts = [];
  if (data.status) parts.push(data.status);
  if (data.stage) parts.push(`at ${data.stage}`);
  if (data.reel_id) parts.push(`reel ${data.reel_id}`);
  if (typeof data.duration === 'number' && data.duration > 0) {
    parts.push(`${data.duration.toFixed(1)}s`);
  }
  if (data.is_mock) parts.push('mock content');
  if (Array.isArray(data.warnings) && data.warnings.length) {
    parts.push(`${data.warnings.length} warning(s)`);
  }
  return parts.join(' · ') || 'Finished';
}

/**
 * The summary of a result that does not parse.
 *
 * The fields are read out of the text with a pattern rather than a parser,
 * because a truncated document is not valid JSON and a parser would throw
 * away everything it could still have told the operator.
 */
function summariseTruncated(result) {
  const text = typeof result === 'string' ? result : JSON.stringify(result);
  const pick = (key) => {
    const match = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`).exec(text);
    return match ? match[1] : '';
  };
  const parts = [];
  const status = pick('status');
  if (status) parts.push(status);
  const stage = pick('stage');
  if (stage) parts.push(`at ${stage}`);
  const reel = pick('reel_id');
  if (reel) parts.push(`reel ${reel}`);
  if (!parts.length) return 'Finished';
  return `${parts.join(' · ')} (the stored result was truncated)`;
}

function JobProgress({ job }) {
  const fill = useJobProgress(job.progress);
  const live = LIVE.includes(job.status);
  return (
    <div className="jobs-progress">
      <div className="progress-track">
        <div
          className={`progress-fill${live ? ' progress-fill-indeterminate' : ''}`}
          ref={fill}
          style={{ width: `${Math.max(0, Math.min(100, job.progress || 0))}%` }}
        />
      </div>
      <span className="jobs-progress-value mono-value">{job.progress ?? 0}%</span>
    </div>
  );
}

function JobRow({ job, onRetry, busy }) {
  const canRetry = RETRYABLE.includes(job.status);
  return (
    <tr>
      <td className="mono-value">{job.id}</td>
      <td>
        {job.reel_id ? (
          <Link to={`/editor/${job.reel_id}`}>Reel {job.reel_id}</Link>
        ) : (
          <span className="muted">Workspace</span>
        )}
      </td>
      <td>{job.type}</td>
      <td>
        <StatusBadge state={job.status} />
      </td>
      <td className="jobs-progress-cell">
        <JobProgress job={job} />
      </td>
      <td className="muted small">
        {new Date(job.created_at).toLocaleString()}
      </td>
      <td>
        {canRetry && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => onRetry(job)}
          >
            Retry
          </button>
        )}
        {job.result && (
          <p className="muted small jobs-result">{summariseResult(job.result)}</p>
        )}
        {job.error && <p className="jobs-error">{job.error}</p>}
      </td>
    </tr>
  );
}

/**
 * The pipeline jobs.
 *
 * The real queue, with the progress the backend reported, the error it
 * returned and the recovery the backend actually supports. A progress bar
 * only ever moves to a value the API reported.
 */
export default function Jobs() {
  const scope = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  usePageEntrance(scope, { selector: '[data-animate]' });

  const load = useCallback(async () => {
    try {
      setError(null);
      const [jobsResponse, failuresResponse] = await Promise.all([
        api.get('/api/jobs?limit=60'),
        api.get('/api/failures?limit=20'),
      ]);
      setJobs(jobsResponse.data || []);
      setFailures(failuresResponse.data || []);
    } catch (loadError) {
      setError(
        loadError?.response?.data?.detail ||
          loadError?.message ||
          'The jobs could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const retry = async (job) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await api.post(`/api/failures/${job.id}/retry`);
      setNotice(`Job ${job.id} was queued again.`);
      await load();
    } catch (retryError) {
      setError(
        retryError?.response?.data?.detail ||
          retryError?.message ||
          'The job could not be retried.'
      );
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const live = jobs.filter((job) => LIVE.includes(job.status));
    const done = jobs.filter((job) => !LIVE.includes(job.status));
    return { live, done };
  }, [jobs]);

  return (
    <div className="page stack" ref={scope}>
      {notice && (
        <p className="notice notice-success" role="status" data-animate>
          {notice}
        </p>
      )}
      {error && (
        <p className="notice notice-error" role="alert" data-animate>
          {error}
        </p>
      )}

      <section className="panel" data-animate>
        <header className="panel-header">
          <h3 className="panel-title">In flight</h3>
          <span className="muted small">{grouped.live.length} running</span>
        </header>
        <div className="panel-body">
          {loading && jobs.length === 0 ? (
            <p className="muted small">Loading the jobs…</p>
          ) : grouped.live.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">Nothing is running</p>
              <p className="empty-state-body">
                A job appears here the moment the factory is asked to do
                something.
              </p>
            </div>
          ) : (
            <ul className="jobs-live">
              {grouped.live.map((job) => (
                <li key={job.id} className="jobs-live-row">
                  <div className="row-between">
                    <span className="jobs-live-type">{job.type}</span>
                    <StatusBadge state={job.status} />
                  </div>
                  <JobProgress job={job} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel" data-animate>
        <header className="panel-header">
          <h3 className="panel-title">Job history</h3>
          <span className="muted small">{grouped.done.length} finished</span>
        </header>
        <div className="panel-body">
          {grouped.done.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">No jobs have finished</p>
              <p className="empty-state-body">
                Every finished job keeps its result and its error here.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Reel</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Started</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.done.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onRetry={retry}
                      busy={busy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {failures.length > 0 && (
        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Needs attention</h3>
            <span className="muted small">{failures.length} failed</span>
          </header>
          <div className="panel-body">
            <ul className="jobs-live">
              {failures.map((job) => (
                <li key={job.id} className="jobs-live-row">
                  <div className="row-between">
                    <span className="jobs-live-type">
                      {job.type} · {job.reel_id ? `Reel ${job.reel_id}` : 'Workspace'}
                    </span>
                    <StatusBadge state={job.status} />
                  </div>
                  {job.error && <p className="jobs-error">{job.error}</p>}
                  {job.recovery_hint && (
                    <p className="muted small">{job.recovery_hint}</p>
                  )}
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => retry(job)}
                    >
                      Retry this job
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
