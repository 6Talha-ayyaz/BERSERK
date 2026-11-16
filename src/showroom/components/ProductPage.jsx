import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { REDUCED } from '../three/storefront.js';
import { fmtPrice, pad, replayClass } from '../lib/format.js';

/* The product page that unfolds beside the piece.
   Reveal choreography:
   - open:           panel slides in, content rises in line by line (.is-in)
   - product→product: content folds away, then the new piece's content
                      rises in quickly (.is-swap)
   - close:          content folds away with the panel; it stays mounted
                      so the fold-out has something to animate. */
export default memo(function ProductPage({ products, index, open, titleRef, onAdd }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(null);     // { index, swap, key }
  const [isIn, setIsIn] = useState(false);
  const isInRef = useRef(false);
  isInRef.current = isIn;
  const lastOpen = useRef(null);                // product open before this change
  const mounts = useRef(0);

  useEffect(() => {
    const prev = lastOpen.current;
    lastOpen.current = open ? index : null;
    if (!open || index == null) { setIsIn(false); return undefined; }
    const swap = prev != null && prev !== index;
    if (swap && isInRef.current) {
      setIsIn(false);
      const t = setTimeout(() => setShown({ index, swap: true, key: ++mounts.current }), REDUCED ? 0 : 520);
      return () => clearTimeout(t);
    }
    setIsIn(false);
    setShown({ index, swap, key: ++mounts.current });
    return undefined;
  }, [open, index]);

  // New content is in the DOM without .is-in: flush styles, then add it so the reveal plays.
  useLayoutEffect(() => {
    if (!shown || !ref.current) return;
    ref.current.scrollTop = 0;
    void ref.current.offsetWidth;
    setIsIn(true);
  }, [shown]);

  const cls = ['pdp', isIn && 'is-in', shown?.swap && 'is-swap'].filter(Boolean).join(' ');
  return (
    <main ref={ref} className={cls} aria-hidden={!open} tabIndex={-1}>
      {shown && (
        <Details
          key={shown.key}
          products={products}
          i={shown.index}
          titleRef={titleRef}
          onAdd={onAdd}
        />
      )}
    </main>
  );
});

function Details({ products, i, titleRef, onAdd }) {
  const d = products[i];
  const n = products.length;
  const prev = products[(i - 1 + n) % n];
  const next = products[(i + 1) % n];
  const colors = d.colors || [];
  const sizes = d.sizes || [];
  const details = d.details || [];

  const [color, setColor] = useState(colors[0]?.name || '');
  const [size, setSize] = useState(null);
  const [sizeMsg, setSizeMsg] = useState('');
  const sizesRef = useRef(null);

  const buy = () => {
    if (sizes.length && !size) {
      replayClass(sizesRef.current, 'is-shake');
      setSizeMsg('Please choose a size first.');
      return;
    }
    onAdd(d, size, color);
  };

  return (
    <>
      <Link className="pdp-back rv" style={{ '--i': 0 }} to="/">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Back to the store
      </Link>
      <p className="pdp-eyebrow rv" style={{ '--i': 1 }}>Featured · {pad(i + 1)} / {pad(n)}</p>
      <h1 className="pdp-title" ref={titleRef} tabIndex={-1}>
        {d.name.split(/\s+/).map((w, k) => (
          <span key={k}>
            <span className="ln" style={{ '--i': 2 + k }}><span>{w}</span></span>{' '}
          </span>
        ))}
      </h1>
      <p className="pdp-price rv" style={{ '--i': 4 }}>{fmtPrice(d.price)}</p>
      {d.tagline && <p className="pdp-tagline rv" style={{ '--i': 5 }}>{d.tagline}</p>}
      {d.description && <p className="pdp-desc rv" style={{ '--i': 6 }}>{d.description}</p>}

      {colors.length > 0 && (
        <div className="rv" style={{ '--i': 7 }}>
          <p className="pdp-label">Colour <b>{color}</b></p>
          <div className="swatches" role="group" aria-label="Colour">
            {colors.map((c) => (
              <button
                key={c.name} type="button" className="swatch" style={{ background: c.hex }}
                aria-label={c.name} aria-pressed={c.name === color} onClick={() => setColor(c.name)}
              />
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="rv" style={{ '--i': 8 }}>
          <p className="pdp-label">Size <b>{size || 'Select a size'}</b></p>
          <div className="sizes" ref={sizesRef} role="group" aria-label="Size">
            {sizes.map((s) => (
              <button
                key={s} type="button" className="size" aria-pressed={s === size}
                onClick={() => { setSize(s); setSizeMsg(''); }}
              >{s}</button>
            ))}
          </div>
          <p className="size-msg" aria-live="polite">{sizeMsg}</p>
        </div>
      )}

      <div className="rv" style={{ '--i': 9 }}>
        <button type="button" className="btn-buy" onClick={buy}><span>Add to bag · {fmtPrice(d.price)}</span></button>
      </div>

      <div className="pdp-acc rv" style={{ '--i': 10 }}>
        {details.length > 0 && (
          <details open><summary>Details</summary><ul>{details.map((x) => <li key={x}>{x}</li>)}</ul></details>
        )}
        {d.care && <details><summary>Care</summary><p>{d.care}</p></details>}
        <details><summary>Shipping &amp; returns</summary><p>Free shipping on orders over {fmtPrice(150)}. Free returns within 30 days.</p></details>
      </div>

      {n > 1 && (
        <nav className="pdp-pager rv" style={{ '--i': 11 }} aria-label="More pieces">
          <Link to={`/product/${prev.id}`} className="prev"><span>← Previous</span><b>{prev.name}</b></Link>
          <Link to={`/product/${next.id}`} className="next"><span>Next →</span><b>{next.name}</b></Link>
        </nav>
      )}

      {d.credit && (
        <p className="pdp-credit rv" style={{ '--i': 12 }}>
          {d.credit.url ? <a href={d.credit.url} target="_blank" rel="noopener noreferrer">{d.credit.text}</a> : d.credit.text}
        </p>
      )}
    </>
  );
}
