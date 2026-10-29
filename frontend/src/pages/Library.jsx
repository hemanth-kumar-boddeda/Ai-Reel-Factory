import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReel } from '../hooks/useReel';
import StatusBadge from '../components/shared/StatusBadge';
import AuthenticatedVideo from '../components/reel/AuthenticatedVideo';
import { usePageEntrance, useScrollReveal } from '../lib/motion';
import './Library.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const ORIGIN_LABELS = {
  language_model: 'Model-written',
  protocol_stub: 'Protocol stub',
  deterministic_composer: 'Composed',
  mock_template: 'Mock script',
  unverified: 'Unverified',
};

const ASSET_LABELS = {
  image_model: 'Model images',
  placeholder: 'Placeholder images',
  branded_background: 'Branded backgrounds',
};

const PRESENTER_LABELS = {
  voiceover: 'Voice-over',
  synthetic_standin: 'Synthetic presenter',
  avatar_provider: 'Presenter',
};

function ReelCard({ reel, onOpen }) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = Boolean(reel.video_path);

  return (
    <article className="library-card">
      <button
        type="button"
        className="library-preview"
        onClick={() => onOpen(reel)}
        aria-label={`Open ${reel.title}`}
      >
        {hasVideo ? (
          <AuthenticatedVideo
            reelId={reel.id}
            className="library-video"
            onActivate={() => setPlaying(true)}
            onDeactivate={() => setPlaying(false)}
          />
        ) : (
          <span className="library-placeholder">
            <span className="library-placeholder-mark" aria-hidden="true" />
            Not rendered yet
          </span>
        )}
        <span className="library-duration mono-value">
          {reel.duration ? `${reel.duration}s` : '–'}
        </span>
      </button>

      <div className="library-body">
        <h3 className="library-title">
          <Link to={`/editor/${reel.id}`}>{reel.title}</Link>
        </h3>
        <p className="muted small">
          {reel.publisher || reel.source}
          {reel.published_at
            ? ` · ${new Date(reel.published_at).toLocaleDateString()}`
            : ''}
        </p>

        <div className="library-badges">
          <StatusBadge state={reel.status} />
          {reel.qa_score != null && (
            <StatusBadge
              state={reel.qa_score >= 70 ? 'READY_TO_PUBLISH' : 'FAILED'}
              label={`QA ${Number(reel.qa_score).toFixed(0)}`}
            />
          )}
          {reel.content_origin && (
            <StatusBadge
              state={
                reel.content_origin === 'language_model'
                  ? 'READY_TO_PUBLISH'
                  : 'UNVERIFIED'
              }
              label={ORIGIN_LABELS[reel.content_origin] || reel.content_origin}
            />
          )}
          {reel.assets_origin && (
            <StatusBadge
              state="NEUTRAL"
              label={ASSET_LABELS[reel.assets_origin] || reel.assets_origin}
            />
          )}
          {reel.presenter_origin && (
            <StatusBadge
              state="NEUTRAL"
              label={PRESENTER_LABELS[reel.presenter_origin] || reel.presenter_origin}
            />
          )}
        </div>

        {reel.caption_text && (
          <p className="library-caption">{reel.caption_text}</p>
        )}
        {reel.url && (
          <a
            className="library-source"
            href={reel.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {reel.source || reel.url}
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * The Library.
 *
 * Every Reel the workspace has produced, with the video, where the content
 * came from and the caption it would publish. A Reel that was never rendered
 * says so instead of showing an empty player.
 */
export default function Library() {
  const scope = useRef(null);
  const { reels, loading, loadingMore, hasMore, error, loadMore, refetch } = useReel();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(null);

  usePageEntrance(scope, { selector: '[data-animate]' });
  useScrollReveal(scope);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reels
      .filter((reel) => {
        if (filter === 'ready') return reel.status === 'READY_TO_PUBLISH';
        if (filter === 'published') return reel.status === 'PUBLISHED';
        if (filter === 'video') return Boolean(reel.video_path);
        return true;
      })
      .filter((reel) => {
        if (!needle) return true;
        return (
          (reel.title || '').toLowerCase().includes(needle) ||
          (reel.publisher || '').toLowerCase().includes(needle)
        );
      })
      // The finished work comes first: a Reel that has been rendered is more
      // interesting than a story that was only discovered.
      .sort((a, b) => {
        const aRendered = a.video_path ? 1 : 0;
        const bRendered = b.video_path ? 1 : 0;
        if (aRendered !== bRendered) return bRendered - aRendered;
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
  }, [reels, query, filter]);

  return (
    <div className="page stack" ref={scope}>
      <section className="panel" data-animate>
        <div className="panel-body library-toolbar">
          <div className="field grow">
            <label htmlFor="library-search">Search the library</label>
            <input
              id="library-search"
              className="input"
              type="search"
              placeholder="A title or a publisher…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="discover-filters" role="group" aria-label="Filter the library">
            {[
              ['all', 'All'],
              ['video', 'With a video'],
              ['ready', 'Ready'],
              ['published', 'Published'],
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
          <button
            type="button"
            className="btn"
            onClick={refetch}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      {loading && reels.length === 0 ? (
        <p className="muted small" data-animate>
          Loading the library…
        </p>
      ) : filtered.length === 0 ? (
        <section className="panel" data-animate>
          <div className="empty-state">
            <p className="empty-state-title">
              {reels.length === 0 ? 'The library is empty' : 'Nothing matches'}
            </p>
            <p className="empty-state-body">
              {reels.length === 0
                ? 'Run the pipeline and every Reel it produces lands here.'
                : 'Clear the search, or pick a different filter.'}
            </p>
          </div>
        </section>
      ) : (
        <div className="library-grid">
          {filtered.map((reel) => (
            <ReelCard key={reel.id} reel={reel} onOpen={setPreview} />
          ))}
        </div>
      )}
      {hasMore && !loading && (
        <div className="library-more">
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Show more Reels'}
          </button>
        </div>
      )}

      {preview && (
        <div
          className="palette-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={preview.title}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <div className="library-lightbox">
            <header className="library-lightbox-head">
              <h2 className="library-lightbox-title">{preview.title}</h2>
              <button
                type="button"
                className="review-close"
                onClick={() => setPreview(null)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            {preview.video_path ? (
              <video
                className="library-lightbox-video"
                src={`${BACKEND}/video/${preview.id}`}
                controls
                autoPlay
                playsInline
              />
            ) : (
              <p className="muted">This Reel has no rendered video yet.</p>
            )}
            {preview.caption_text && (
              <pre className="review-caption">{preview.caption_text}</pre>
            )}
            <div className="library-lightbox-foot">
              <Link className="btn" to={`/editor/${preview.id}`}>
                Open in the editor
              </Link>
              {preview.url && (
                <a
                  className="btn btn-ghost"
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Read the source
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
