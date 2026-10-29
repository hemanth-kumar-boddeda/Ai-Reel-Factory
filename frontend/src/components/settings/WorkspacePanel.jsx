import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Button from '../shared/Button';
import Card from '../shared/Card';
import StatusBadge from '../shared/StatusBadge';

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
];

const DEFAULTS = {
  niche: 'AI news, AI tools and AI research explained in under a minute',
  language: 'en',
  tone: 'energetic, plain-spoken, non-hyped',
  brand_voice: '',
  hook_style: 'auto',
  cta: '',
  brand_name: '',
  brand_handle: '',
  primary_color: '#0B1120',
  accent_color: '#38BDF8',
  text_color: '#F8FAFC',
  presenter_mode: 'voiceover',
  timezone: 'Asia/Kolkata',
  daily_post_time: '10:00',
  reels_per_day: 1,
  scheduler_enabled: false,
  daily_budget_limit: 5,
  monthly_budget_limit: 50,
  max_retries: 3,
  target_duration_seconds: 45,
};

export default function WorkspacePanel() {
  const [form, setForm] = useState(DEFAULTS);
  const [connection, setConnection] = useState(null);
  const [oauth, setOauth] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [settingsRes, connectionRes] = await Promise.allSettled([
          api.get('/api/workspace/settings'),
          api.get('/api/instagram/connection'),
        ]);
        if (cancelled) return;
        if (settingsRes.status === 'fulfilled') {
          // A setting the server stores as null would make the input
          // uncontrolled, so every value is coerced to its default.
          const merged = { ...DEFAULTS };
          Object.keys(DEFAULTS).forEach((key) => {
            const value = settingsRes.value.data?.[key];
            if (value !== null && value !== undefined) merged[key] = value;
          });
          setForm(merged);
        }
        if (connectionRes.status === 'fulfilled') {
          setConnection(connectionRes.value.data);
        }
      } catch {
        /* the panel degrades gracefully when the API is unavailable */
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const set = (field) => (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setForm((prev) => ({
      ...prev,
      [field]: target.type === 'number' ? Number(value) : value,
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/api/workspace/settings', form);
      setMessage({ tone: 'success', text: 'Workspace saved.' });
    } catch (err) {
      setMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || 'Could not save the workspace.',
      });
    } finally {
      setSaving(false);
    }
  };

  const startConnect = async () => {
    setMessage(null);
    try {
      const response = await api.get('/api/instagram/connect');
      setOauth(response.data);
      if (response.data?.authorize_url) {
        window.open(response.data.authorize_url, '_blank', 'noopener');
      }
    } catch (err) {
      setMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || 'Could not start the Instagram connection.',
      });
    }
  };

  const disconnect = async () => {
    try {
      await api.post('/api/instagram/disconnect');
      const refreshed = await api.get('/api/instagram/connection');
      setConnection(refreshed.data);
      setMessage({ tone: 'success', text: 'Instagram account disconnected.' });
    } catch (err) {
      setMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || 'Could not disconnect the account.',
      });
    }
  };

  return (
    <div className="workspace-panel">
      <h3 className="panel-heading">Content & brand</h3>
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Niche</span>
            <input value={form.niche} onChange={set('niche')} />
            <small>What the factory looks for. Used by the story scorer.</small>
          </label>

          <label className="form-field">
            <span>Language</span>
            <input value={form.language} onChange={set('language')} />
          </label>

          <label className="form-field">
            <span>Tone</span>
            <input value={form.tone} onChange={set('tone')} />
          </label>

          <label className="form-field">
            <span>Hook style</span>
            <select value={form.hook_style} onChange={set('hook_style')}>
              <option value="auto">Auto (rotate, avoid repeats)</option>
              <option value="question">Question</option>
              <option value="bold-claim">Bold claim</option>
              <option value="story">Story</option>
              <option value="news">News</option>
              <option value="number">Number</option>
              <option value="contrarian">Contrarian</option>
            </select>
          </label>

          <label className="form-field">
            <span>Call to action</span>
            <input value={form.cta} onChange={set('cta')} placeholder="Follow for daily AI news" />
          </label>

          <label className="form-field">
            <span>Brand name</span>
            <input value={form.brand_name} onChange={set('brand_name')} />
          </label>

          <label className="form-field">
            <span>Brand handle</span>
            <input value={form.brand_handle} onChange={set('brand_handle')} placeholder="@yourhandle" />
          </label>

          <label className="form-field">
            <span>Primary colour</span>
            <input type="color" value={form.primary_color} onChange={set('primary_color')} />
          </label>

          <label className="form-field">
            <span>Accent colour</span>
            <input type="color" value={form.accent_color} onChange={set('accent_color')} />
          </label>

          <label className="form-field">
            <span>Text colour</span>
            <input type="color" value={form.text_color} onChange={set('text_color')} />
          </label>

          <label className="form-field">
            <span>Presenter mode</span>
            <select value={form.presenter_mode} onChange={set('presenter_mode')}>
              <option value="voiceover">Voice-over with visual storytelling</option>
              <option value="reference_face">Reference face (authorised image)</option>
              <option value="avatar">Generated avatar</option>
            </select>
            <small>
              Reference-face and avatar modes need a configured provider. Voice-over
              never depends on a paid service.
            </small>
          </label>
        </div>

        <h3 className="panel-heading">Daily schedule</h3>
        <div className="form-grid">
          <label className="form-field">
            <span>Timezone</span>
            <select value={form.timezone} onChange={set('timezone')}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Posting time</span>
            <input type="time" value={form.daily_post_time} onChange={set('daily_post_time')} />
          </label>

          <label className="form-field">
            <span>Reels per day</span>
            <input type="number" min="1" max="10" value={form.reels_per_day} onChange={set('reels_per_day')} />
          </label>

          <label className="form-field form-field-wide form-field-check">
            <input type="checkbox" checked={form.scheduler_enabled} onChange={set('scheduler_enabled')} />
            <span>Run the pipeline automatically every day</span>
          </label>
        </div>

        <h3 className="panel-heading">Limits</h3>
        <div className="form-grid">
          <label className="form-field">
            <span>Daily budget (USD)</span>
            <input type="number" min="0" step="0.5" value={form.daily_budget_limit} onChange={set('daily_budget_limit')} />
            <small>0 disables the spend guard.</small>
          </label>

          <label className="form-field">
            <span>Monthly budget (USD)</span>
            <input type="number" min="0" step="1" value={form.monthly_budget_limit} onChange={set('monthly_budget_limit')} />
          </label>

          <label className="form-field">
            <span>Max retries</span>
            <input type="number" min="0" max="10" value={form.max_retries} onChange={set('max_retries')} />
          </label>

          <label className="form-field">
            <span>Target duration (seconds)</span>
            <input type="number" min="15" max="90" value={form.target_duration_seconds} onChange={set('target_duration_seconds')} />
          </label>
        </div>

        {message && (
          <p className={message.tone === 'danger' ? 'settings-error' : 'settings-success'}>
            {message.text}
          </p>
        )}

        <div className="action-buttons">
          <Button variant="primary" size="default" disabled={saving}>
            {saving ? 'Saving…' : 'Save workspace'}
          </Button>
        </div>
      </form>

      <h3 className="panel-heading">Instagram account</h3>
      <Card elevated>
        {connection ? (
          <div className="kv-list">
            <div className="kv">
              <span>Status</span>
              <StatusBadge
                state={connection.connected ? 'ok' : 'missing_config'}
                label={connection.status}
              />
            </div>
            <div className="kv">
              <span>Account</span>
              <strong>{connection.account_username || connection.instagram_account_id || '–'}</strong>
            </div>
            <div className="kv">
              <span>Token expires</span>
              <strong>{connection.expires_at?.replace('T', ' ').slice(0, 19) || 'not reported'}</strong>
            </div>
            <div className="kv">
              <span>Public base URL</span>
              <strong>{connection.public_base_url_configured ? 'configured' : 'missing'}</strong>
            </div>
            {connection.expired && (
              <p className="muted small">The token expired. Reconnect the account to resume publishing.</p>
            )}
          </div>
        ) : (
          <p className="muted">Connection details are unavailable.</p>
        )}

        {oauth?.required_permissions && (
          <p className="muted small">
            Required permissions: {oauth.required_permissions.join(', ')}
          </p>
        )}

        <div className="action-buttons">
          <Button variant="primary" size="small" onClick={startConnect}>
            Connect Instagram
          </Button>
          <Button variant="outline" size="small" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      </Card>
    </div>
  );
}
