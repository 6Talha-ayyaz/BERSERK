import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { STORE } from '../data/products.js';
import { fmtPrice, pad } from '../lib/format.js';

const MAX_LISTED = 4;   // the landing lists the first few pieces; the rest are inside

/* Landing hero over the live 3D shopfront.
   The 3D models download in the background while this is on screen.
   Scrolling walks the camera through the doors; the scene writes that
   progress to the CSS variable --p (0..1) on this element every frame,
   which drives every scroll-linked fade below without re-rendering React. */
const Landing = forwardRef(function Landing({ products, progress, ready, waiting, error, opening, onEnter }, ref) {
  const pct = Math.round(progress * 100);
  const words = STORE.collection.split(/\s+/);

  let status;
  if (error) status = error;
  else if (opening) status = ready ? `Opening ${opening.name}` : `Opening ${opening.name} · ${pct}%`;
  else if (waiting) status = `Bringing out the collection · ${pct}%`;
  else status = ready ? 'Scroll to step inside' : `Scroll to step inside · collection ${pct}%`;

  return (
    <section ref={ref} className={`landing${ready ? ' is-ready' : ''}${error ? ' is-error' : ''}`} aria-label="Welcome" tabIndex={-1}>
      <div className="landing-scrim" aria-hidden="true" />

      {/* .landing-fg fades and lifts with the scroll; the .l-rv pieces inside play the entrance reveal */}
      <div className="landing-fg">
      <div className="landing-hero">
        <p className="eyebrow l-rv" style={{ '--i': 0 }}>New season · Featured collection</p>
        <h1 className="landing-title">
          {words.map((w, k) => (
            <span key={k}><span className="ln" style={{ '--i': 1 + k }}><span>{w}</span></span>{' '}</span>
          ))}
        </h1>
        <p className="landing-lede l-rv" style={{ '--i': 5 }}>
          Step inside {STORE.name.charAt(0) + STORE.name.slice(1).toLowerCase()} and see every piece the way it hangs in store.
          Turn it in your hands, look closer, then make it yours.
        </p>
        <div className="landing-actions l-rv" style={{ '--i': 6 }}>
          <button type="button" className="btn-enter" onClick={onEnter}>
            <span>Enter the boutique</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <span className="landing-note">{products.length} {products.length === 1 ? 'piece' : 'pieces'} in 3D · free returns</span>
        </div>
      </div>

      <nav className="landing-edit" aria-label="In the edit">
        <div className="l-rv" style={{ '--i': 7 }}>
        <p className="landing-edit-label">
          In the edit{products.length > MAX_LISTED ? ` · ${products.length - MAX_LISTED} more inside` : ''}
        </p>
        <ol>
          {products.slice(0, MAX_LISTED).map((p, i) => (
            <li key={p.id}>
              <Link to={`/product/${p.id}`}>
                <span className="landing-edit-num">{pad(i + 1)}</span>
                <span className="landing-edit-name">{p.name}</span>
                <span className="landing-edit-price">{fmtPrice(p.price)}</span>
              </Link>
            </li>
          ))}
        </ol>
        </div>
      </nav>
      </div>

      <div className={`landing-cue${waiting || opening || error ? ' is-busy' : ''}`} role="status" aria-live="polite">
        <div className="landing-cue-inner l-rv" style={{ '--i': 8 }}>
          <span className="landing-cue-line" aria-hidden="true"><span /></span>
          <span className="landing-cue-text">{status}</span>
          {!error && <span className="landing-load" aria-hidden="true"><span style={{ transform: `scaleX(${progress.toFixed(3)})` }} /></span>}
        </div>
      </div>

      <p className="landing-caption" aria-hidden="true">
        Every piece hangs as it would on the rail.<br />Hover to turn it. Click to look closer.
      </p>
    </section>
  );
});
export default Landing;
