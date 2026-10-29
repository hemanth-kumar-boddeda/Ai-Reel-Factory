import './Input.css';

export default function Input({
  type = 'text',
  label,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  error = null,
  className = '',
  rows = 4,
  // An <input> is a void element: it must never receive children, so they
  // are taken out of the rest and dropped.
  children: _children,
  ...rest
}) {
  const shared = {
    value,
    onChange,
    placeholder,
    disabled,
    className: `input-input ${className}`,
  };

  // A textarea is a different element, and asking an <input> to be a
  // textarea is not a thing - React rejected the result.
  const control =
    type === 'textarea' ? (
      <textarea {...shared} rows={rows} {...rest} />
    ) : (
      <input type={type} {...shared} {...rest} />
    );

  return (
    <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
      {label && <label className="input-label">{label}</label>}
      {control}
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
