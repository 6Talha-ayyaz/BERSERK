export default function Toast({ msg, on }) {
  return <div className={`toast${on ? ' is-on' : ''}`} role="status" aria-live="polite">{msg}</div>;
}
