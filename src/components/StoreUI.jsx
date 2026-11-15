import { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STORE } from '../data/products.js';
import { FINE, REDUCED } from '../three/storefront.js';
import { pad } from '../lib/format.js';

/* Collection headline + the bottom dock listing every featured piece. */
export default memo(function StoreUI({ products, current, dock, linkRefs }) {
  const listRef = useRef(null);
  const n = products.length;

  useEffect(() => {
    const li = listRef.current?.querySelector('.is-current');
    if (li) li.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  }, [current]);

  const hint = !n
    ? 'Add products in src/data/products.js'
    : FINE
      ? 'Scroll to browse · Hover a piece to turn it · Click to open'
      : 'Swipe to browse · Tap a piece to turn it · Tap again to open';

  return (
    <section className="store-ui" aria-label="Featured products">
      <div className="store-head">
        <p className="eyebrow">Featured collection</p>
        <h1 className="store-title">{STORE.collection}</h1>
      </div>

      <div className="dock">
        <div className="dock-row">
          <button className="dock-arrow" type="button" aria-label="Previous" disabled={current <= -1} onClick={() => dock.step(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <ol className="dock-list" ref={listRef}>
            {products.map((p, i) => (
              <li key={p.id} className={`dock-item${i === current ? ' is-current' : ''}`}>
                <Link
                  to={`/product/${p.id}`}
                  ref={(el) => { linkRefs.current[i] = el; }}
                  onMouseEnter={() => dock.enter(i)}
                  onMouseLeave={() => dock.leave(i)}
                  onFocus={() => dock.focus(i)}
                  onBlur={() => dock.blur(i)}
                >
                  <span className="dock-num">{pad(i + 1)}</span>{p.name}
                </Link>
              </li>
            ))}
          </ol>
          <button className="dock-arrow" type="button" aria-label="Next" disabled={current >= n - 1} onClick={() => dock.step(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <p className="dock-hint">{hint}</p>
      </div>
    </section>
  );
});
