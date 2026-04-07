export function Card({ children, className = "" }) {
  return <article className={`card ${className}`.trim()}>{children}</article>;
}
