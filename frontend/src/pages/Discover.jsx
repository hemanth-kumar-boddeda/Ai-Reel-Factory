import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReel } from '../hooks/useReel';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import { usePageEntrance, useScrollReveal } from '../lib/motion';
import './Discover.css';

const SCORE_KEYS = ['relevance', 'novelty', 'recency', 'interest', 'reliability'];

function ScoreBreakdown({ signals }) {
  if (!signals) return null;
  return (
    <div className="discover-scores">
      {SCORE_KEYS.map((key) => {
        const value = Number(signals[key]);
        if (!Number.isFinite(value)) return null;
        const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
        return (
          <div className="discover-score" key={key} title={`${key}: ${value}`}>
            <span className="discover-score-label">{key}</span>
            <span className="discover-score-track">
              <span className="discover-score-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="discover-score-value">{pct}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Discover.
 *
 * The stories the factory has found, with the score breakdown, the sources
 * and the claims that were extracted. A story that has not been verified says
 * so - it is never given a verification badge it has not earned.
 */
export default function Discover() {
  const scope = useRef(null);
  const { reels, loading, loadingMore, hasMore, error, loadMore, refetch } = useReel();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  usePageEntrance(scope, { selector: '[data-animate]' });
  useScrollReveal(scope);

  const stories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reels
      .filter((reel) => {
        if (filter === 'verified') {
          return ['OFFICIAL', 'CORROBORATED'].includes(reel.verification_status);
        }
        if (filter === 'unverified') {
          return !reel.verification_status || reel.verification_status === 'UNVERIFIED';
        }
        return true;
      })
      .filter((reel) => {
        if (!needle) return true;
        return (
          (reel.title || '').toLowerCase().includes(needle) ||
          (reel.publisher || '').toLowerCase().includes(needle) ||
          (reel.summary || '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [reels, query, filter]);

  return (
    <div className="page stack" ref={scope}>
      <section className="panel" data-animate>
        <div className="panel-body discover-toolbar">
          <div className="field grow">
            <label htmlFor="discover-search">Search the stories</label>
            <input
              id="discover-search"
              className="input"
              type="search"
              placeholder="A headline, a publisher, a keyword…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="discover-filters" role="group" aria-label="Filter the stories">
            {[
              ['all', 'All'],
              ['verified', 'Verified'],
              ['unverified', 'Not verified'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`discover-filter${filter === value ? ' is-active' : ''}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={refetch} disabled={loading}>
            Refresh
          </Button>
        </div>
      </section>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      {loading && reels.length === 0 ? (
        <p className="muted small" data-animate>
          Loading the stories…
        </p>
      ) : stories.length === 0 ? (
        <section className="panel" data-animate>
          <div className="empty-state">
            <p className="empty-state-title">
              {reels.length === 0 ? 'No stories have been discovered' : 'Nothing matches'}
            </p>
            <p className="empty-state-body">
              {reels.length === 0
                ? 'Run discovery from the Overview and the factory pulls the latest AI news into the queue.'
                : 'Clear the search, or pick a different filter.'}
            </p>
            {reels.length === 0 && (
              <Link className="btn btn-sm" to="/">
                Go to the Overview
              </Link>
            )}
          </div>
        </section>
      ) : (
        <div className="discover-grid">
          {stories.map((story) => (
            <article className="discover-card" key={story.id} data-reveal>
              <header className="discover-card-head">
                <div className="grow">
                  <h3 className="discover-card-title">{story.title}</h3>
                  <p className="muted small">
                    {story.publisher || story.source}
                    {story.published_at
                      ? ` · ${new Date(story.published_at).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <span className="discover-score-total mono-value">
                  {story.score ?? '–'}
                </span>
              </header>

              {story.url && (
                <a
                  className="discover-card-link"
                  href={story.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {story.url}
                </a>
              )}

              {story.verification_status && (
                <div className="discover-badges">
                  <StatusBadge state={story.verification_status} />
                  {story.score != null && (
                    <StatusBadge state="NEUTRAL" label={`Score ${story.score}`} />
                  )}
                </div>
              )}

              <ScoreBreakdown signals={story.score_breakdown} />

              {story.claims?.length > 0 && (
                <div className="discover-claims">
                  <p className="section-label">The claims that were extracted</p>
                  <ul>
                    {story.claims.slice(0, 3).map((claim, index) => (
                      <li key={index}>
                        <StatusBadge
                          state={claim.support_level || 'UNVERIFIED'}
                          label={claim.support_level || 'unverified'}
                        />
                        {claim.text.length > 220 ? (
                          <details className="discover-claim-detail">
                            <summary>{claim.text.slice(0, 220).trimEnd()}…</summary>
                            <p>{claim.text}</p>
                          </details>
                        ) : (
                          <span>{claim.text}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
            {hasMore && (
              <div className="discover-more">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Show more stories'}
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
