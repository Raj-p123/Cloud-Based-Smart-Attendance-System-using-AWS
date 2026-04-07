export function Input({ label, className = "", ...props }) {
  return (
    <label className={`field ${className}`.trim()}>
      {label ? <span className="field-label">{label}</span> : null}
      <input className="input" {...props} />
    </label>
  );
}
