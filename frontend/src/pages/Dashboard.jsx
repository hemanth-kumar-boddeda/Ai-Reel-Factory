import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useDashboard from '../hooks/useDashboard';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import { usePageEntrance, useScrollReveal } from '../lib/motion';
import './Dashboard.css';

/*
 * The hero is the only piece of the product with volume, so it is the only
 * piece that is loaded on demand: Three.js is a large dependency and it must
 * not be in the bundle of every route.
 */
const ReelLensHero = lazy(() => import('../components/hero/ReelLensHero'));

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function Metric({ label, value, hint, tone }) {
  return (
    <div className={`metric-tile${tone ? ` metric-tile-${tone}` : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {hint && <span className="metric-hint">{hint}</span>}
    </div>
  );
}

function ProviderRow({ provider }) {
  return (
    <li className="provider-row">
      <div className="grow">
        <p className="provider-name">{provider.name || provider.provider}</p>
        <p className="muted small">{provider.message || provider.detail}</p>
      </div>
      <StatusBadge
        state={provider.status || (provider.ok ? 'ok' : 'unavailable')}
        label={provider.status || (provider.ok ? 'Ready' : 'Unavailable')}
      />
    </li>
  );
}

function JobRow({ job }) {
  return (
    <li className="job-row">
      <div className="grow">
        <p className="job-type">{job.type}</p>
        <p className="muted small">
          {job.reel_id ? `Reel ${job.reel_id}` : 'No reel'} · {job.progress ?? 0}%
        </p>
        {job.error && <p className="job-error">{job.error}</p>}
      </div>
      <StatusBadge state={job.status} />
    </li>
  );
}

/**
 * The Overview.
 *
 * It shows the state of the pipeline and nothing else: what was discovered,
 * what is ready, what failed, and whether the providers are able to work.
 * Every number comes from the API.
 */
export default function Dashboard() {
  const scope = useRef(null);
  const { data, loading, error, busy, reload, runPipeline, runDiscovery, retryJob } =
    useDashboard();
  const [message, setMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  usePageEntrance(scope, { selector: '[data-animate]' });
  useScrollReveal(scope);

  const today = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (data.stories || []).filter((story) => {
      if (!story.first_seen_at) return false;
      return new Date(story.first_seen_at).getTime() >= cutoff;
    });
  }, [data.stories]);

  const readyToPublish = useMemo(
    () => (data.stories || []).filter((story) => story.status === 'READY_TO_PUBLISH'),
    [data.stories]
  );
  const published = useMemo(
    () => (data.stories || []).filter((story) => story.status === 'PUBLISHED'),
    [data.stories]
  );
  const failedJobs = useMemo(
    () => (data.jobs || []).filter((job) => job.status === 'FAILED'),
    [data.jobs]
  );
  const recentReels = useMemo(
    () => (data.stories || []).slice(0, 6),
    [data.stories]
  );

  const handle = async (action, successMessage) => {
    setActionError(null);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: successMessage });
    } catch (err) {
      setActionError(
        err?.response?.data?.detail || err?.message || 'The action did not complete.'
      );
    }
  };

  const overview = data.analytics?.overview || {};

  return (
    <div className="page stack" ref={scope}>
      <section className="hero" data-animate>
        <div className="hero-body">
          <p className="hero-eyebrow">The factory</p>
          <h2 className="hero-title">
            Research in. Vertical video out. A human says yes.
          </h2>
          <p className="hero-copy">
            The pipeline discovers a story, checks the source, writes the script,
            renders the Reel and hands it to you. Nothing reaches Instagram
            without your approval.
          </p>
          <div className="hero-actions">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                handle(
                  () => runPipeline({ publish: false, dryRun: false }),
                  'A new reel was created from the top story.'
                )
              }
            >
              Make a reel now
            </Button>

            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                handle(
                  () => runPipeline({ publish: false, dryRun: true }),
                  'The dry run finished. Nothing was published.'
                )
              }
            >
              Run a dry run
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                handle(() => runDiscovery(), 'Discovery finished.')
              }
            >
              Fetch the latest stories
            </Button>
          </div>
        </div>
        <Suspense
          fallback={<div className="hero-canvas hero-canvas-loading" aria-hidden="true" />}
        >
          <ReelLensHero />
        </Suspense>
      </section>

      {(message || error || actionError) && (
        <div data-animate>
          {message && (
            <p className="notice notice-success" role="status">
              {message.text}
            </p>
          )}
          {error && (
            <p className="notice notice-warn" role="status">
              {error}
            </p>
          )}
          {actionError && (
            <p className="notice notice-error" role="alert">
              {actionError}
            </p>
          )}
        </div>
      )}

      <section className="metric-row" data-animate>
        <Metric label="Stories today" value={today.length} hint="discovered in the last 24h" />
        <Metric
          label="Ready to publish"
          value={readyToPublish.length}
          hint="passed quality control"
          tone={readyToPublish.length ? 'signal' : undefined}
        />
        <Metric
          label="Published"
          value={published.length}
          hint="confirmed by Instagram"
        />
        <Metric
          label="Failed jobs"
          value={failedJobs.length}
          hint="need attention"
          tone={failedJobs.length ? 'alert' : undefined}
        />
        <Metric
          label="Average reach"
          value={overview.average_reach ?? '–'}
          hint="across the published Reels"
        />
        <Metric
          label="Engagement rate"
          value={overview.engagement_rate ?? '–'}
          hint="when the denominator is known"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Recent research</h3>
            <Link className="panel-link" to="/discover">
              All stories
            </Link>
          </header>
          <div className="panel-body">
            {loading && (data.stories || []).length === 0 ? (
              <p className="muted small">Loading the stories…</p>
            ) : recentReels.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No stories yet</p>
                <p className="empty-state-body">
                  Run discovery and the factory pulls the latest AI news into
                  the queue.
                </p>
              </div>
            ) : (
              <ul className="story-list">
                {recentReels.map((story) => (
                  <li key={story.id} className="story-row" data-reveal>
                    <div className="grow">
                      <p className="story-title truncate">{story.title}</p>
                      <p className="muted small">
                        {story.publisher || story.source}
                        {story.score != null ? ` · score ${story.score}` : ''}
                      </p>
                    </div>
                    <StatusBadge state={story.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Provider readiness</h3>
          </header>
          <div className="panel-body">
            {(data.providers || []).length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No provider report</p>
                <p className="empty-state-body">
                  The provider health endpoint did not answer.
                </p>
              </div>
            ) : (
              <ul className="provider-list">
                {data.providers.map((provider, index) => (
                  <ProviderRow
                    key={`${provider.name || provider.provider}-${provider.capability || ''}-${index}`}
                    provider={provider}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Pending approvals</h3>
            <Link className="panel-link" to="/publishing">
              Publishing
            </Link>
          </header>
          <div className="panel-body">
            {readyToPublish.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">Nothing is waiting</p>
                <p className="empty-state-body">
                  A Reel appears here after it has been rendered and has passed
                  quality control.
                </p>
              </div>
            ) : (
              <ul className="story-list">
                {readyToPublish.map((story) => (
                  <li key={story.id} className="story-row" data-reveal>
                    <div className="grow">
                      <p className="story-title truncate">{story.title}</p>
                      <p className="muted small">
                        QA {story.qa_score != null ? Number(story.qa_score).toFixed(0) : '–'}
                        {story.content_origin
                          ? ` · ${String(story.content_origin).replace(/_/g, ' ')}`
                          : ''}
                      </p>
                    </div>
                    <Link className="btn btn-sm" to="/publishing">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Recent jobs</h3>
            <Link className="panel-link" to="/jobs">
              All jobs
            </Link>
          </header>
          <div className="panel-body">
            {(data.jobs || []).length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No jobs have run</p>
                <p className="empty-state-body">
                  A job appears here the moment the factory is asked to do
                  something.
                </p>
              </div>
            ) : (
              <ul className="job-list">
                {data.jobs.slice(0, 6).map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {failedJobs.length > 0 && (
        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Failed jobs</h3>
          </header>
          <div className="panel-body">
            <ul className="job-list">
              {failedJobs.map((job) => (
                <li key={job.id} className="job-row">
                  <div className="grow">
                    <p className="job-type">{job.type}</p>
                    <p className="job-error">{job.error}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="small"
                    disabled={busy}
                    onClick={() =>
                      handle(
                        () => retryJob(job.id),
                        'The job was queued again.'
                      )
                    }
                  >
                    Retry
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="panel" data-animate>
        <header className="panel-header">
          <h3 className="panel-title">What the data says</h3>
          <Link className="panel-link" to="/analytics">
            Analytics
          </Link>
        </header>
        <div className="panel-body">
          {!data.recommendations ? (
            <p className="muted small">
              The recommendation engine has not answered yet.
            </p>
          ) : data.recommendations.status === 'insufficient_data' ? (
            <p className="muted small">
              {data.recommendations.message ||
                'Not enough published Reels yet for a reliable recommendation.'}
            </p>
          ) : (
            <div className="kv-list">
              {Object.entries(data.recommendations.recommendations || {}).map(
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
                Based on {data.recommendations.samples} published Reel(s) with
                metrics.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
