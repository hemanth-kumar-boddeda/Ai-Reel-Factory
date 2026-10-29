import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Button from '../components/shared/Button';
import StatusBadge from '../components/shared/StatusBadge';
import AuthenticatedVideo from '../components/reel/AuthenticatedVideo';
import FileField from '../components/shared/FileField';
import { usePageEntrance, useJobProgress } from '../lib/motion';
import './Creator.css';

const CAPTION_STYLES = [
  { value: 'highlight', label: 'Highlighted words' },
  { value: 'plain', label: 'Plain' },
  { value: 'boxed', label: 'Boxed' },
];

/**
 * The four output modes.  These are the *caption* languages, and they are
 * deliberately separate from the source-language control: a transliteration
 * changes the script, a translation changes the language.
 */
const OUTPUT_MODES = [
  {
    value: 'english_translation',
    label: 'English translation',
    note: 'The speech is translated. Nothing is transliterated.',
  },
  {
    value: 'telugu_script',
    label: 'Telugu script',
    note: 'The original Telugu, with the English names and terms left as spoken.',
  },
  {
    value: 'tanglish',
    label: 'Tanglish',
    note: 'Telugu in Latin letters. English that was spoken stays in English.',
  },
  {
    value: 'bilingual',
    label: 'Bilingual',
    note: 'The English translation with the Telugu line underneath it.',
  },
];

/** The four source-language controls. */
const SOURCE_MODES = [
  { value: 'auto', label: 'Automatic', note: 'Detect the language per recording.' },
  { value: 'te', label: 'Telugu', note: 'The speaker is speaking Telugu.' },
  { value: 'en', label: 'English', note: 'The speaker is speaking English.' },
  { value: 'te_en', label: 'Telugu + English', note: 'The speaker code-switches.' },
];

/**
 * The language the translator is told the source is.
 *
 * The source *mode* is what the recogniser expects to hear; the source
 * *language* is the language code the translation model is given.  They
 * were two separate controls, and an operator could set "Telugu" in one
 * and "Automatic" in the other without being told what that combination
 * meant.  One choice now drives both: the mode names the language, and
 * the automatic mode falls back to Telugu, which is what the local
 * translation model is for.
 */
const SOURCE_LANGUAGE_FOR_MODE = {
  auto: 'te',
  te: 'te',
  en: 'en',
  te_en: 'te',
};

const STAGES = [
  'VALIDATING',
  'PROBING',
  'EXTRACTING_AUDIO',
  'TRANSCRIBING',
  'TRANSLATING',
  'TRANSLITERATING',
  'PLANNING',
  'TRIMMING',
  'RENDERING',
  'QA',
];

const STAGE_LABELS = {
  VALIDATING: 'Validating the upload',
  PROBING: 'Reading the media',
  EXTRACTING_AUDIO: 'Extracting the audio',
  TRANSCRIBING: 'Transcribing the speech',
  TRANSLATING: 'Translating to English',
  TRANSLITERATING: 'Transliterating',
  PLANNING: 'Building the edit plan',
  TRIMMING: 'Removing silence',
  RENDERING: 'Rendering the Reel',
  QA: 'Checking the output',
};

function formatTime(value) {
  if (!value) return '–';
  return new Date(value).toLocaleString();
}

/** A time in seconds as mm:ss.d */
function formatSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return '–';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '–';
  return `${Math.round(number * 100)}%`;
}

/** The stage list. It shows what the job reported, never a guess. */
function StageList({ state }) {
  const stages = state?.stages || state?.stage_history || [];
  const current = (state?.stage || '').toUpperCase();
  const done = new Set(
    (stages || []).map((entry) => String(entry.stage || entry.name || '').toUpperCase())
  );

  return (
    <ol className="creator-stages">
      {STAGES.map((stage) => {
        const isDone = done.has(stage);
        const isCurrent = current === stage;
        return (
          <li
            key={stage}
            className={`creator-stage${isDone ? ' is-done' : ''}${
              isCurrent ? ' is-current' : ''
            }`}
          >
            <span className="creator-stage-dot" aria-hidden="true" />
            <span className="creator-stage-label">
              {STAGE_LABELS[stage] || stage}
            </span>
            {isCurrent && <StatusBadge state="PROCESSING" label="Running" />}
            {isDone && <StatusBadge state="COMPLETED" label="Done" />}
          </li>
        );
      })}
    </ol>
  );
}

function JobProgressBar({ job }) {
  const fill = useJobProgress(job.progress);
  const live = ['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING'].includes(job.status);
  return (
    <div className="creator-progress">
      <div className="progress-track">
        <div
          className={`progress-fill${live ? ' progress-fill-indeterminate' : ''}`}
          ref={fill}
          style={{ width: `${Math.max(0, Math.min(100, job.progress || 0))}%` }}
        />
      </div>
      <span className="creator-progress-value mono-value">{job.progress ?? 0}%</span>
    </div>
  );
}

/** A radio group that reads as a set of choices, not a dropdown. */
function ModePicker({ legend, hint, options, value, onChange, name }) {
  return (
    <fieldset className="creator-mode-picker">
      <legend className="creator-mode-legend">{legend}</legend>
      {hint && <p className="muted small creator-mode-hint">{hint}</p>}
      <div className="creator-mode-options">
        {options.map((option) => (
          <label
            key={option.value}
            className={`creator-mode-option${value === option.value ? ' is-selected' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="creator-mode-label">{option.label}</span>
            {option.note && (
              <span className="creator-mode-note muted small">{option.note}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The review of one project: what was said, what the caption says, and where
 * the timings came from.  Everything here is what the backend actually
 * reported - nothing is inferred in the browser.
 */
function ReviewPanel({ job, onMessage, onRefresh }) {
  const review = job?.review;
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEdits({});
  }, [job?.id, review?.scenes?.length]);

  const scenes = useMemo(() => review?.scenes || [], [review]);
  const corrections = useMemo(() => {
    const next = {};
    scenes.forEach((scene) => {
      const saved = review?.corrections?.[String(scene.index)] || {};
      const value = edits[scene.index] ?? saved.caption ?? scene.caption ?? '';
      if (value !== (scene.caption ?? '')) next[scene.index] = value;
    });
    return next;
  }, [scenes, edits, review?.corrections]);

  const dirty = Object.keys(corrections).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const payload = { corrections: {} };
      Object.entries(corrections).forEach(([index, caption]) => {
        payload.corrections[index] = { caption };
      });
      await api.post(`/api/creator/jobs/${job.id}/captions`, payload);
      onMessage({
        tone: 'success',
        text: 'The corrections were saved. Re-render the Reel to see them in the subtitles.',
      });
      onRefresh?.();
    } catch (err) {
      onMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || 'The corrections could not be saved.',
      });
    } finally {
      setSaving(false);
    }
  };

  const rerender = async () => {
    setSaving(true);
    try {
      await api.post(`/api/creator/jobs/${job.id}/rerender`);
      onMessage({ tone: 'success', text: 'The Reel is being re-rendered.' });
      onRefresh?.();
    } catch (err) {
      onMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || 'The Reel could not be re-rendered.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!review) {
    return (
      <p className="muted small">
        The review appears here once the pipeline has produced a transcript.
      </p>
    );
  }

  const detected = review.detected_language;
  const probability = review.language_probability;

  return (
    <div className="creator-review-detail">
      {/* ------------------------------------------------- the facts */}
      <div className="creator-facts">
        <div className="creator-fact">
          <span className="creator-fact-label">Output mode</span>
          <span className="creator-fact-value">
            {OUTPUT_MODES.find((mode) => mode.value === review.output_mode)?.label ||
              review.output_mode ||
              '–'}
          </span>
        </div>
        <div className="creator-fact">
          <span className="creator-fact-label">Source mode</span>
          <span className="creator-fact-value">
            {SOURCE_MODES.find((mode) => mode.value === review.source_mode)?.label ||
              review.source_mode ||
              '–'}
          </span>
        </div>
        <div className="creator-fact">
          <span className="creator-fact-label">Detected language</span>
          <span className="creator-fact-value">
            {detected || '–'}
            {probability != null && (
              <span className="muted small"> · {formatPercent(probability)} sure</span>
            )}
          </span>
        </div>
        <div className="creator-fact">
          <span className="creator-fact-label">Caption coverage</span>
          <span className="creator-fact-value">
            {formatPercent(review.coverage_ratio)}
            {review.media_duration ? (
              <span className="muted small">
                {' '}
                of {formatSeconds(review.media_duration)}
              </span>
            ) : null}
          </span>
        </div>
        <div className="creator-fact">
          <span className="creator-fact-label">Where the text came from</span>
          <span className="creator-fact-value">{review.translation_origin_label}</span>
        </div>
        <div className="creator-fact">
          <span className="creator-fact-label">Models</span>
          <span className="creator-fact-value mono-value">
            {review.stt_provider || '–'}
            {review.stt_model ? `/${review.stt_model}` : ''}
            {review.translation_provider && review.translation_provider !== 'none'
              ? ` · ${review.translation_provider}${
                  review.translation_model ? `/${review.translation_model}` : ''
                }`
              : ''}
          </span>
        </div>
      </div>

      {review.language_confidence_note && (
        <p className="muted small">{review.language_confidence_note}</p>
      )}

      {/* ------------------------------------------------ the warnings */}
      {review.warnings?.length > 0 && (
        <div className="creator-warnings">
          <p className="section-label">What still needs a look</p>
          <ul>
            {review.warnings.map((warning, index) => (
              <li key={`${index}-${warning.slice(0, 24)}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {review.untranslated_count > 0 && (
        <p className="creator-warnings-note">
          {review.untranslated_count} line(s) came back without a translation. They
          still show the source text and are marked in the table below.
        </p>
      )}

      {/* ------------------------------------------- the side-by-side table */}
      {scenes.length > 0 && (
        <div className="creator-captions">
          <p className="section-label">The captions, line by line</p>
          <div className="creator-captions-scroll">
            <table className="creator-captions-table">
              <thead>
                <tr>
                  <th scope="col">In the source</th>
                  <th scope="col">On screen</th>
                  <th scope="col">Original speech</th>
                  <th scope="col">Tanglish</th>
                  <th scope="col">English</th>
                </tr>
              </thead>
              <tbody>
                {scenes.map((scene) => {
                  const flagged =
                    scene.uncertain ||
                    review.untranslated_segments?.some(
                      (entry) => entry.index === scene.index
                    );
                  return (
                    <tr
                      key={scene.index}
                      className={flagged ? 'is-flagged' : undefined}
                    >
                      <td className="mono-value">
                        {formatSeconds(scene.source_start ?? scene.start)} –{' '}
                        {formatSeconds(scene.source_end ?? scene.end)}
                      </td>
                      <td className="mono-value">
                        {formatSeconds(scene.start)} – {formatSeconds(scene.end)}
                      </td>
                      <td>{scene.source_text || '–'}</td>
                      <td>{scene.transliterated_text || '–'}</td>
                      <td>{scene.translated_text || '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------- the correction editor */}
      {scenes.length > 0 && (
        <div className="creator-corrections">
          <p className="section-label">Correct a caption</p>
          <p className="muted small">
            The caption is what is drawn on the video. A correction here is used the
            next time the Reel is rendered.
          </p>
          <ul className="creator-correction-list">
            {scenes.map((scene) => {
              const saved = review.corrections?.[String(scene.index)] || {};
              const value = edits[scene.index] ?? saved.caption ?? scene.caption ?? '';
              return (
                <li key={scene.index} className="creator-correction">
                  <span className="creator-correction-time mono-value">
                    {formatSeconds(scene.start)}
                  </span>
                  <input
                    className="input"
                    value={value}
                    aria-label={`Caption ${scene.index + 1}`}
                    onChange={(event) =>
                      setEdits((prev) => ({ ...prev, [scene.index]: event.target.value }))
                    }
                  />
                </li>
              );
            })}
          </ul>
          <div className="row">
            <Button variant="outline" size="small" disabled={!dirty || saving} onClick={save}>
              {saving ? 'Saving…' : 'Save the corrections'}
            </Button>
            <Button
              variant="primary"
              size="small"
              disabled={!dirty || saving}
              onClick={rerender}
            >
              Save and re-render
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The Creator Studio.
 *
 * It is an editor, not a form: the source sits on a canvas on the left, the
 * settings are on the right, and the result - the plan, the captions and the
 * video - is where you review it.
 */
export default function Creator() {
  const scope = useRef(null);
  const fileInput = useRef(null);
  const referenceInput = useRef(null);
  const identityInput = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState(null);
  const [providers, setProviders] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [consentNote, setConsentNote] = useState('');

  const [form, setForm] = useState({
    source_language: 'te',
    subtitle_language: 'en',
    source_mode: 'auto',
    output_mode: 'english_translation',
    stt_provider: '',
    translation_provider: '',
    show_transliteration: false,
    remove_silence: true,
    caption_style: 'highlight',
    use_broll: true,
    use_sfx: true,
    show_brand: true,
    brand_handle: '',
    title: '',
    hotwords: '',
  });

  usePageEntrance(scope, { selector: '[data-animate]' });

  const set = (field) => (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadJobs = useCallback(async () => {
    try {
      const response = await api.get('/api/creator/jobs?limit=20');
      setJobs(response.data || []);
      if (selected) {
        const fresh = (response.data || []).find((job) => job.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      setMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || 'The creator jobs could not be loaded.',
      });
    }
  }, [selected]);

  // The full job detail carries the review: the transcript, the timings and
  // the warnings.
  const loadDetail = useCallback(async (jobId) => {
    try {
      const response = await api.get(`/api/creator/jobs/${jobId}`);
      setSelectedDetail(response.data);
    } catch {
      // The job detail is optional; the list is still shown without it.
      setSelectedDetail(null);
    }
  }, []);

  useEffect(() => {
    api
      .get('/api/creator/providers')
      .then((response) => setProviders(response.data))
      .catch(() => {});
    loadJobs();
    const timer = setInterval(loadJobs, 6000);
    return () => clearInterval(timer);
  }, [loadJobs]);

  useEffect(() => {
    if (selected?.id) {
      loadDetail(selected.id);
    } else {
      setSelectedDetail(null);
    }
  }, [selected?.id, loadDetail]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    const video = fileInput.current?.files?.[0];
    if (!video) {
      setMessage({ tone: 'danger', text: 'Choose a video file first.' });
      return;
    }
    const body = new FormData();
    body.append('video', video);
    const reference = referenceInput.current?.files?.[0];
    if (reference) body.append('reference_image', reference);
    Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));

    setUploading(true);
    try {
      const response = await api.post('/api/creator/uploads', body);
      setMessage({
        tone: 'success',
        text: `Upload accepted. Job #${response.data.job_id} is running.`,
      });
      if (fileInput.current) fileInput.current.value = '';
      if (referenceInput.current) referenceInput.current.value = '';
      setSource(null);
      await loadJobs();
    } catch (err) {
      setMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || err?.message || 'The upload failed.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleIdentityUpload = async (event) => {
    event.preventDefault();
    setMessage(null);
    const image = identityInput.current?.files?.[0];
    if (!image) {
      setMessage({ tone: 'danger', text: 'Choose a reference image first.' });
      return;
    }
    const body = new FormData();
    body.append('image', image);
    body.append('consent_note', consentNote);
    setUploading(true);
    try {
      const response = await api.post('/api/creator/identity', body);
      setMessage({
        tone: 'success',
        text: response.data.message || 'The reference image is registered.',
      });
      if (identityInput.current) identityInput.current.value = '';
      const refreshed = await api.get('/api/creator/providers');
      setProviders(refreshed.data);
    } catch (err) {
      setMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || 'The reference image was not registered.',
      });
    } finally {
      setUploading(false);
    }
  };

  const act = async (path, okMessage) => {
    setMessage(null);
    setBusy(true);
    try {
      const response = await api.post(path);
      setMessage({ tone: 'success', text: okMessage || response.data?.message || 'Done.' });
      await loadJobs();
    } catch (err) {
      setMessage({
        tone: 'danger',
        text: err?.response?.data?.detail || err?.message || 'The request failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const estimate = providers?.cost_estimate?.['5_minutes'];
  const profile = providers?.profile;
  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file || !fileInput.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.current.files = transfer.files;
    setSource(URL.createObjectURL(file));
  };

  return (
    <div className="page stack" ref={scope}>
      {message && (
        <p
          className={`notice ${message.tone === 'danger' ? 'notice-error' : 'notice-success'}`}
          role={message.tone === 'danger' ? 'alert' : 'status'}
          data-animate
        >
          {message.text}
        </p>
      )}

      {profile?.local_free && (
        <p className="notice notice-info creator-profile-note" data-animate>
          The <strong>{profile.active}</strong> profile is in force: everything runs on
          this machine. {profile.blocked_providers?.length > 0 && (
            <>The billable providers ({profile.blocked_providers.join(', ')}) are refused.</>
          )}
        </p>
      )}

      <div className="creator-workspace">
        {/* --------------------------------------------------------- the rail */}
        <div className="creator-rail">
        {/* ---------------------------------------------------- the canvas */}
        <section className="creator-canvas panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">The source</h3>
            {source && (
              <span className="muted small">the local preview, not the upload</span>
            )}
          </header>
          <div className="panel-body">
            <div
              className={`creator-dropzone${dragging ? ' is-dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {source ? (
                <video
                  className="creator-source-video"
                  src={source}
                  controls
                  playsInline
                />
              ) : (
                <div className="creator-dropzone-empty">
                  <span className="creator-dropzone-icon" aria-hidden="true">
                    +
                  </span>
                  <p className="creator-dropzone-title">Drop a video here</p>
                  <p className="muted small">
                    MP4, MOV, MKV, WebM or AVI. The studio transcribes it, trims the
                    silence and renders a vertical Reel with subtitles.
                  </p>
                </div>
              )}
              <input
                ref={fileInput}
                className="visually-hidden"
                type="file"
                accept="video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setSource(URL.createObjectURL(file));
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => fileInput.current?.click()}
              >
                {source ? 'Choose a different file' : 'Choose a file'}
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ the projects */}
        <section className="creator-projects-panel panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">The projects</h3>
            <span className="muted small">{jobs.length} in this workspace</span>
          </header>
          <div className="panel-body">
            {jobs.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No projects yet</p>
                <p className="empty-state-body">
                  Drop a video on the left and the studio turns it into a vertical
                  Reel with subtitles.
                </p>
              </div>
            ) : (
              <ul className="creator-projects">
                {jobs.map((job) => (
                  <li key={job.id} className="creator-project">
                    <button
                      type="button"
                      className={`creator-project-select${
                        selected?.id === job.id ? ' is-selected' : ''
                      }`}
                      onClick={() => setSelected(job)}
                    >
                      <span className="creator-project-id mono-value">#{job.id}</span>
                      <span className="creator-project-meta">
                        {job.reel_id ? `Reel ${job.reel_id}` : 'No reel yet'} ·{' '}
                        {formatTime(job.created_at)}
                      </span>
                      <StatusBadge state={job.status} />
                    </button>
                    <JobProgressBar job={job} />
                    {job.error && <p className="jobs-error">{job.error}</p>}
                    <div className="creator-project-actions">
                      {['FAILED', 'DEAD_LETTER'].includes(job.status) && (
                        <Button
                          variant="outline"
                          size="small"
                          disabled={busy}
                          onClick={() =>
                            act(`/api/creator/jobs/${job.id}/retry`, 'The job was queued again.')
                          }
                        >
                          Retry
                        </Button>
                      )}
                      {['PENDING', 'QUEUED', 'PROCESSING'].includes(job.status) && (
                        <Button
                          variant="outline"
                          size="small"
                          disabled={busy}
                          onClick={() =>
                            act(`/api/creator/jobs/${job.id}/cancel`, 'The job was cancelled.')
                          }
                        >
                          Cancel
                        </Button>
                      )}
                      {job.reel_id && (
                        <Link className="btn btn-sm" to={`/editor/${job.reel_id}`}>
                          Open the Reel
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        </div>

        {/* ------------------------------------------------- the settings */}
        <section className="creator-settings panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">The edit</h3>
          </header>
          <div className="panel-body">
            <form onSubmit={submit} className="creator-form">
              <ModePicker
                name="creator-source-mode"
                legend="What is being said"
                hint="This tells the recogniser what language to expect. It is separate from the caption language below."
                options={SOURCE_MODES}
                value={form.source_mode}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    source_mode: value,
                    source_language: SOURCE_LANGUAGE_FOR_MODE[value] || prev.source_language,
                  }))
                }
              />

              <p className="creator-source-language muted small">
                The translation will read the source as{' '}
                <strong>{form.source_language === 'en' ? 'English' : 'Telugu'}</strong>.
                {form.source_mode === 'auto' &&
                  ' The language is detected per recording, so the translator is given the studio default until a recording proves otherwise.'}
              </p>

              <label className="field creator-hotwords">
                <span>Words the recogniser should expect</span>
                <input
                  className="input"
                  type="text"
                  value={form.hotwords}
                  placeholder="OpenAI, Telangana, inference, GPT-5"
                  onChange={set('hotwords')}
                />
                <small className="muted">
                  A name, a brand or a term the recogniser does not know is
                  written as a phonetic guess. List the words here and it
                  writes them the way you mean them. Separate them with
                  commas.
                </small>
              </label>

              <ModePicker
                name="creator-output-mode"
                legend="What the caption says"
                hint="A translation changes the language. A transliteration only changes the script - Tanglish is not an English translation."
                options={OUTPUT_MODES}
                value={form.output_mode}
                onChange={(value) => setForm((prev) => ({ ...prev, output_mode: value }))}
              />

              <div className="creator-grid">
                <label className="field">
                  <span>Caption style</span>
                  <select
                    className="input"
                    value={form.caption_style}
                    onChange={set('caption_style')}
                  >
                    {CAPTION_STYLES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Speech to text</span>
                  <select
                    className="input"
                    value={form.stt_provider}
                    onChange={set('stt_provider')}
                  >
                    <option value="">Automatic (best available)</option>
                    {(providers?.speech_to_text || []).map((item) => (
                      <option
                        key={item.provider}
                        value={item.provider}
                        disabled={!item.available}
                      >
                        {item.provider}
                        {item.available ? '' : ' (unavailable)'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Translation</span>
                  <select
                    className="input"
                    value={form.translation_provider}
                    onChange={set('translation_provider')}
                  >
                    <option value="">Automatic (best available)</option>
                    {(providers?.translation || []).map((item) => (
                      <option
                        key={item.provider}
                        value={item.provider}
                        disabled={!item.available}
                      >
                        {item.provider}
                        {item.available ? '' : ' (unavailable)'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Brand handle</span>
                  <input
                    className="input"
                    value={form.brand_handle}
                    onChange={set('brand_handle')}
                    placeholder="@yourhandle"
                  />
                </label>
              </div>

              <label className="field">
                <span>Project title</span>
                <input
                  className="input"
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Optional"
                />
              </label>

              <FileField
                id="creator-reference"
                label="Reference image (optional)"
                accept="image/*"
                hint="An authorised photo of the presenter. It keeps the same person across the generated scenes - the face is never reshaped."
                onChange={(file) => {
                  if (file && referenceInput.current) {
                    const transfer = new DataTransfer();
                    transfer.items.add(file);
                    referenceInput.current.files = transfer.files;
                  }
                }}
              />
              <input
                ref={referenceInput}
                className="visually-hidden"
                type="file"
                accept="image/*"
              />

              <div className="creator-toggles">
                {[
                  ['show_transliteration', 'Also show the transliteration'],
                  ['remove_silence', 'Remove silence and dead sections'],
                  ['use_broll', 'Suggest B-roll'],
                  ['use_sfx', 'Sound effects'],
                  ['show_brand', 'Show the brand handle'],
                ].map(([field, label]) => (
                  <label key={field}>
                    <input
                      type="checkbox"
                      checked={form[field]}
                      onChange={set(field)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {estimate && (
                <p className="creator-estimate">
                  A 5 minute video costs ${Number(estimate.total_usd).toFixed(4)}:
                  transcription ${Number(estimate.transcription_usd).toFixed(4)} plus
                  translation ${Number(estimate.translation_usd).toFixed(4)}.
                </p>
              )}

              <Button variant="primary" disabled={uploading || busy}>
                {uploading ? 'Uploading…' : 'Upload and edit'}
              </Button>
            </form>
          </div>
        </section>

      </div>
      {/* --------------------------------------------------- the review panel */}
      {selected && (
        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">Job #{selected.id}</h3>
            <StatusBadge state={selected.status} />
          </header>
          <div className="panel-body creator-review">
            <div>
              <p className="section-label">The stages</p>
              <StageList state={selected.state} />
            </div>
            <div>
              {selected.reel_id ? (
                <>
                  <p className="section-label">The result</p>
                  <AuthenticatedVideo
                    reelId={selected.reel_id}
                    className="creator-review-video"
                    controls
                    autoPlay
                  />
                  <div className="row">
                    <Link className="btn btn-sm" to={`/editor/${selected.reel_id}`}>
                      Open in the editor
                    </Link>
                    <Link className="btn btn-ghost btn-sm" to="/library">
                      See it in the library
                    </Link>
                  </div>
                </>
              ) : (
                <p className="muted small">
                  The result appears here once the Reel has been rendered.
                </p>
              )}
            </div>
          </div>
          <div className="panel-body">
            <p className="section-label">The review</p>
            <ReviewPanel
              job={selectedDetail}
              onMessage={setMessage}
              onRefresh={() => {
                loadJobs();
                if (selected?.id) loadDetail(selected.id);
              }}
            />
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ the presenter */}
      {providers?.talking_head && (
        <section className="panel" data-animate>
          <header className="panel-header">
            <h3 className="panel-title">The presenter</h3>
          </header>
          <div className="panel-body creator-presenter">
            <p className="muted small">{providers.talking_head.note}</p>
            <ul className="creator-provider-list">
              {(providers.talking_head.providers || []).map((item) => (
                <li key={item.provider}>
                  <span className="creator-provider-name">{item.provider}</span>
                  <StatusBadge
                    state={item.usable ? 'ok' : 'missing_config'}
                    label={
                      item.synthetic
                        ? 'synthetic stand-in'
                        : item.usable
                          ? 'usable'
                          : 'not configured'
                    }
                  />
                </li>
              ))}
            </ul>
            <form onSubmit={handleIdentityUpload} className="creator-identity">
              <FileField
                id="creator-identity"
                label="Authorised reference image"
                accept="image/*"
                hint="Register the image and record the consent. It is only used by a licensed talking-head provider."
                onChange={(file) => {
                  if (file && identityInput.current) {
                    const transfer = new DataTransfer();
                    transfer.items.add(file);
                    identityInput.current.files = transfer.files;
                  }
                }}
              />
              <input
                ref={identityInput}
                className="visually-hidden"
                type="file"
                accept="image/*"
              />
              <label className="field">
                <span>Consent note</span>
                <input
                  className="input"
                  value={consentNote}
                  onChange={(event) => setConsentNote(event.target.value)}
                  placeholder="I own this image and consent to it being animated."
                />
              </label>
              <Button variant="outline" size="small" disabled={uploading || busy}>
                {uploading ? 'Uploading…' : 'Register the reference image'}
              </Button>
            </form>
            {(providers.talking_head.reference_images || []).length > 0 && (
              <ul className="creator-reference-list">
                {providers.talking_head.reference_images.map((item) => (
                  <li key={item.id}>
                    <span>{item.filename}</span>
                    <StatusBadge
                      state={item.consent_granted ? 'ok' : 'missing_config'}
                      label={item.consent_granted ? 'consent recorded' : 'no consent'}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
