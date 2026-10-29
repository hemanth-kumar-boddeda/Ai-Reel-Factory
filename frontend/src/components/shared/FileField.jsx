import { useRef, useState } from 'react';

/**
 * A file field.
 *
 * The native file input cannot be styled, so it is hidden and a real button
 * stands in for it. The chosen file is named next to the button, so the
 * operator can see what they picked.
 */
export default function FileField({ id, label, hint, accept, onChange, disabled }) {
  const inputRef = useRef(null);
  const [name, setName] = useState(null);

  return (
    <div className="file-field">
      <span className="file-field-label">{label}</span>
      <div className="file-field-row">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Choose a file
        </button>
        <span className="file-field-name truncate">
          {name || 'No file chosen'}
        </span>
      </div>
      {hint && <small className="muted small">{hint}</small>}
      <input
        ref={inputRef}
        id={id}
        className="visually-hidden"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          setName(file ? file.name : null);
          if (onChange) onChange(file, event);
        }}
      />
    </div>
  );
}
