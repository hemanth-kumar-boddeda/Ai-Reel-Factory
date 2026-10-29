import './StatusBadge.css';

const TONE_BY_STATE = {
  // pipeline / job states
  DISCOVERED: 'neutral',
  RESEARCHING: 'info',
  SCRIPTING: 'info',
  STORYBOARDING: 'info',
  ASSET_GENERATION: 'info',
  VOICE_GENERATION: 'info',
  RENDERING: 'info',
  QA: 'info',
  READY_TO_PUBLISH: 'success',
  PUBLISHING: 'info',
  PUBLISHED: 'success',
  ANALYTICS_PENDING: 'info',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  DEAD_LETTER: 'danger',
  PENDING: 'neutral',
  QUEUED: 'neutral',
  PROCESSING: 'info',
  COMPLETED: 'success',
  RETRYING: 'warning',
  // verification states
  UNVERIFIED: 'neutral',
  SINGLE_SOURCE: 'warning',
  CORROBORATED: 'success',
  OFFICIAL: 'success',
  DISPUTED: 'danger',
  REJECTED: 'danger',
  // provider health
  ok: 'success',
  degraded: 'warning',
  unavailable: 'danger',
  missing_config: 'warning',
  disabled: 'neutral',
  // a stand-in that works but does not do what its name says
  mock: 'warning',
};

export default function StatusBadge({ state, label, tone, className = '' }) {
  const resolved = tone || TONE_BY_STATE[state] || 'neutral';
  const text = label || String(state || 'unknown').replace(/_/g, ' ').toLowerCase();
  return (
    <span className={`status-badge status-badge-${resolved} ${className}`}>
      {text}
    </span>
  );
}
