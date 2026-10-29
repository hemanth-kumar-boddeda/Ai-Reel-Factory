import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import WorkspacePanel from '../components/settings/WorkspacePanel';
import { usePageEntrance, useScrollReveal } from '../lib/motion';
import './Settings.css';

const THEMES = [
  { value: 'system', label: 'Match the system' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

function ProviderRow({ provider }) {
  const ok = provider.status === 'ok' || provider.available === true;
  // Two providers can share a name - Instagram is both the publishing
  // provider and the analytics provider - so the capability is shown with
  // it.  Without it the list showed two rows called "instagram" and the
  // operator could not tell which one was misconfigured.
  const capability = provider.capability ? ` · ${provider.capability}` : '';
  return (
    <li className="provider-row">
      <div className="grow">
        <p className="provider-name">
          {provider.name || provider.provider}
          <span className="provider-capability">{capability}</span>
        </p>
        <p className="muted small">{provider.message || provider.detail}</p>
      </div>
      <StatusBadge
        state={ok ? 'ok' : provider.status || 'unavailable'}
        label={provider.status || (ok ? 'Ready' : 'Unavailable')}
      />
    </li>
  );
}

/**
 * Settings.
 *
 * The provider configuration the workspace actually uses, the schedule, the
 * budget controls the backend supports and the account that is connected.
 */
export default function Settings() {
  const scope = useRef(null);
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    notify_on_job_completion: true,
    theme_preference: 'system',
  });
  const [providers, setProviders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  usePageEntrance(scope, { selector: '[data-animate]' });
  useScrollReveal(scope);

  useEffect(() => {
    setForm({
      notify_on_job_completion: user?.notify_on_job_completion ?? true,
      theme_preference: user?.theme_preference ?? 'system',
    });
  }, [user]);

  useEffect(() => {
    api
      .get('/api/providers/health')
      .then((response) => setProviders(response.data?.providers || []))
      .catch(() => setProviders([]));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.patch('/auth/me', form);
      setMessage('Your preferences were saved.');
      if (refresh) refresh();
    } catch (saveError) {
      setError(
        saveError?.response?.data?.detail ||
          saveError?.message ||
          'The preferences could not be saved.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page stack" ref={scope}>
      {message && (
        <p className="notice notice-success" role="status" data-animate>
          {message}
        </p>
      )}
      {error && (
        <p className="notice notice-error" role="alert" data-animate>
          {error}
        </p>
      )}

      <div className="settings-grid">
        <div className="settings-column">
        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Your preferences</h3>
          </header>
          <div className="panel-body">
            <form onSubmit={save} className="stack">
              <label className="field">
                <span>Theme</span>
                <select
                  className="input"
                  value={form.theme_preference}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      theme_preference: event.target.value,
                    }))
                  }
                >
                  {THEMES.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="creator-toggles-label">
                <input
                  type="checkbox"
                  checked={form.notify_on_job_completion}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notify_on_job_completion: event.target.checked,
                    }))
                  }
                />
                <span>Tell me when a job finishes</span>
              </label>

              <div>
                <Button variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save the preferences'}
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">The providers</h3>
          </header>
          <div className="panel-body">
            {providers.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No provider report</p>
                <p className="empty-state-body">
                  The provider health endpoint did not answer.
                </p>
              </div>
            ) : (
              <ul className="provider-list">
                {providers.map((provider, index) => (
                  <ProviderRow
                    key={`${provider.name || provider.provider}-${provider.capability || ''}-${index}`}
                    provider={provider}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
        </div>

        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">The workspace</h3>
          </header>
          <div className="panel-body">
            <WorkspacePanel />
          </div>
        </section>
      </div>
    </div>
  );
}
