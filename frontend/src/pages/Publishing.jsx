import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import PublishReviewDialog from '../components/PublishReviewDialog';
import { usePageEntrance, useScrollReveal } from '../lib/motion';
import './Publishing.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Publishing.
 *
 * It answers three questions with what the API actually returned:
 * is the account connected, is anything ready to publish, and what has been
 * published already. Nothing here invents a permalink.
 */
export default function Publishing() {
  const scope = useRef(null);
  const [connection, setConnection] = useState(null);
  const [validation, setValidation] = useState(null);
  const [reels, setReels] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewReelId, setReviewReelId] = useState(null);
  const [notice, setNotice] = useState(null);

  usePageEntrance(scope, { selector: '[data-animate]' });
  useScrollReveal(scope);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [connectionResponse, reelsResponse] = await Promise.all([
        api.get('/api/instagram/connection'),
        // The Reels are asked for newest first and in pages.  The list used
        // to ask for the first hundred, so a Reel that had just been
        // created never appeared here and could not be published.
        api.get('/api/reels', {
          params: { skip: 0, limit: 100, order: 'newest' },
        }),
      ]);
      setConnection(connectionResponse.data);
      setReels(
        (reelsResponse.data || []).filter((reel) => reel.status === 'READY_TO_PUBLISH')
      );

      // The validation reaches Instagram, so it is only asked for when there
      // is something to validate.
      if (connectionResponse.data?.connected) {
        try {
          const validationResponse = await api.get('/api/instagram/validate');
          setValidation(validationResponse.data);
        } catch (validationError) {
          setValidation({
            ok: false,
            problems: [
              validationError?.response?.data?.detail ||
                'The connection could not be validated.',
            ],
          });
        }
      } else {
        setValidation(null);
      }
    } catch (loadError) {
      setError(
        loadError?.response?.data?.detail ||
          loadError?.message ||
          'The publishing state could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const checks = useMemo(() => {
    const list = [];
    list.push({
      name: 'The Meta app',
      ok: Boolean(connection?.connected) || connection?.connected === false ? true : false,
      detail: 'The credentials have to be set on the server.',
    });
    list.push({
      name: 'The account',
      ok: Boolean(connection?.connected),
      detail: connection?.connected
        ? `Connected as ${connection.account_username || connection.instagram_account_id}.`
        : connection?.message || 'No Instagram account is connected.',
    });
    list.push({
      name: 'The public media host',
      ok: Boolean(connection?.public_base_url_configured),
      detail: connection?.public_base_url_configured
        ? 'Instagram can download the rendered video.'
        : 'INSTAGRAM_PUBLIC_BASE_URL is not set, so Instagram cannot download the video.',
    });
    return list;
  }, [connection]);

  return (
    <div className="page stack" ref={scope}>
      <section className="publishing-hero panel" data-animate>
        <div className="publishing-hero-body">
          <p className="section-label">Instagram</p>
          <h2 className="publishing-hero-title">
            {connection?.connected
              ? 'The account is connected.'
              : 'The account is not connected yet.'}
          </h2>
          <p className="publishing-hero-copy">
            {connection?.connected
              ? 'A Reel that has passed quality control can be reviewed and published from here.'
              : 'Connect a Business or Creator account, make the rendered video reachable from the internet, and then a Reel can be reviewed and published.'}
          </p>
          <div className="row">
            {connection?.connected ? (
              <a className="btn" href={`${BACKEND}/api/instagram/connect`}>
                Re-authorise the account
              </a>
            ) : (
              <a className="btn btn-primary" href={`${BACKEND}/api/instagram/connect`}>
                Connect the Instagram account
              </a>
            )}
            <Button variant="ghost" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
        <dl className="publishing-facts">
          <div>
            <dt>Account</dt>
            <dd className="mono-value">
              {connection?.instagram_account_id || '–'}
            </dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd className="mono-value">
              {connection?.expires_at
                ? new Date(connection.expires_at).toLocaleDateString()
                : '–'}
            </dd>
          </div>
          <div>
            <dt>Public host</dt>
            <dd className="mono-value">
              {connection?.public_base_url_configured ? 'Configured' : 'Missing'}
            </dd>
          </div>
        </dl>
      </section>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      )}

      <div className="publishing-grid">
        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">What is still missing</h3>
          </header>
          <div className="panel-body stack">
            {checks.map((check) => (
              <div key={check.name} className="publishing-check">
                <StatusBadge
                  state={check.ok ? 'READY_TO_PUBLISH' : 'FAILED'}
                  label={check.ok ? 'Ready' : 'Missing'}
                />
                <div>
                  <p className="publishing-check-name">{check.name}</p>
                  <p className="muted small">{check.detail}</p>
                </div>
              </div>
            ))}

            {validation && validation.problems?.length > 0 && (
              <ul className="publishing-problems">
                {validation.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}

            {validation?.checks?.length > 0 && (
              <div className="publishing-validation">
                {validation.checks.map((check) => (
                  <div key={check.name} className="publishing-check">
                    <StatusBadge
                      state={check.ok ? 'READY_TO_PUBLISH' : 'FAILED'}
                      label={check.ok ? 'Pass' : 'Fail'}
                    />
                    <div>
                      <p className="publishing-check-name">{check.name}</p>
                      <p className="muted small">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Ready to publish</h3>
            <span className="muted small">
              {reels.length} {reels.length === 1 ? 'reel' : 'reels'}
            </span>
          </header>
          <div className="panel-body">
            {loading ? (
              <p className="muted small">Loading the ready Reels…</p>
            ) : reels.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">Nothing is ready to publish</p>
                <p className="empty-state-body">
                  A Reel appears here once it has been rendered and has passed
                  quality control.
                </p>
              </div>
            ) : (
              <ul className="publishing-list">
                {reels.map((reel) => (
                  <li key={reel.id} className="publishing-item" data-reveal>
                    <div className="grow">
                      <p className="publishing-item-title">{reel.title}</p>
                      <p className="muted small">
                        QA {reel.qa_score != null ? Number(reel.qa_score).toFixed(0) : '–'}
                        {reel.content_origin ? ` · ${reel.content_origin.replace(/_/g, ' ')}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => setReviewReelId(reel.id)}
                      data-testid="review-open"
                    >
                      Review
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="panel" data-animate>
        <header className="panel-header">
          <h3 className="panel-title">Confirmed publications</h3>
        </header>
        <div className="panel-body">
          <PublishedList onChanged={load} />
        </div>
      </section>

      {reviewReelId !== null && (
        <PublishReviewDialog
          reelId={reviewReelId}
          onClose={() => setReviewReelId(null)}
          onPublished={(result) => {
            setNotice(result?.message || 'The Reel was submitted for publishing.');
            setReviewReelId(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/** The Reels that Instagram has confirmed, read from the Reel list. */
function PublishedList() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/reels')
      .then((response) => {
        if (cancelled) return;
        setReels(
          (response.data || []).filter((reel) => reel.status === 'PUBLISHED')
        );
      })
      .catch(() => {
        if (!cancelled) setReels([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="muted small">Loading the published Reels…</p>;
  }

  if (reels.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nothing has been published</p>
        <p className="empty-state-body">
          A Reel appears here only after Instagram confirms it with a media id
          and a permalink.
        </p>
      </div>
    );
  }

  return (
    <ul className="publishing-list">
      {reels.map((reel) => (
        <li key={reel.id} className="publishing-item">
          <div className="grow">
            <p className="publishing-item-title">{reel.title}</p>
            <p className="muted small">
              {reel.published_at
                ? new Date(reel.published_at).toLocaleString()
                : 'No timestamp recorded.'}
            </p>
            {reel.permalink ? (
              <a href={reel.permalink} target="_blank" rel="noreferrer noopener">
                {reel.permalink}
              </a>
            ) : (
              <p className="muted small">No permalink was recorded.</p>
            )}
          </div>
          <StatusBadge state="PUBLISHED" label="Published" />
        </li>
      ))}
    </ul>
  );
}
