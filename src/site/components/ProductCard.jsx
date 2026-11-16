import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { fmtPrice } from '../../lib/format.js';
import { Icon, flyToBag } from '../ui.jsx';
import Visual from './Visual.jsx';

export default function ProductCard({ product }) {
  const { add, wish, toggleWish, bumpBag } = useStore();
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const [color, setColor] = useState(colors[0]);
  const [open, setOpen] = useState(false);     // quick-add tray, for touch screens
  const [added, setAdded] = useState(null);
  const timer = useRef(0);
  const saved = wish.includes(product.id);
  const href = `/product/${product.id}`;

  const quick = (size, e) => {
    add(product.id, size, color?.name);
    setAdded(size);
    flyToBag(e.currentTarget, bumpBag);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setAdded(null); setOpen(false); }, 1300);
  };

  return (
    <article className={`card${open ? ' is-open' : ''}`}>
      <div className="card-media" data-turn>
        <Link className="card-link" to={href} aria-label={`${product.name}, ${fmtPrice(product.price)}`} data-cursor={product.model ? 'Turn' : 'View'} />
        <Visual product={product} tint={color?.hex} />
        <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
        <span className="card-code mono">{product.code}</span>
        <span className="card-flags">
          {product.model && <span className="chip chip-3d mono"><Icon name="cube" size={13} />360°</span>}
          {product.badge && <span className="chip mono">{product.badge}</span>}
        </span>

        <button
          type="button" className={`card-wish${saved ? ' is-saved' : ''}`} aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
          onClick={() => toggleWish(product.id)}
        >
          <Icon name="heart" size={18} />
        </button>

        <div className="card-quick">
          <span className="card-quick-label mono">Quick add{colors.length > 1 ? ` · ${color.name}` : ''}</span>
          <div className="card-quick-sizes">
            {sizes.map((s) => (
              <button key={s} type="button" className={added === s ? 'is-added' : ''} onClick={(e) => quick(s, e)} aria-label={`Add size ${s} to bag`}>
                {added === s ? <Icon name="check" size={15} /> : s}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="card-plus" aria-expanded={open} aria-label="Quick add" onClick={() => setOpen((o) => !o)}>
          <Icon name="plus" size={18} />
        </button>
      </div>

      <div className="card-info">
        <div className="card-row">
          <h3 className="card-name"><Link to={href} tabIndex={-1}>{product.name}</Link></h3>
          <span className="card-price mono">{fmtPrice(product.price)}</span>
        </div>
        <div className="card-row">
          <span className="card-cat mono">{product.category} · {product.weight}</span>
          {colors.length > 1 && (
            <span className="dots" role="group" aria-label="Colour">
              {colors.map((c) => (
                <button
                  key={c.name} type="button" className={`dot${c === color ? ' is-on' : ''}`} style={{ '--c': c.hex }}
                  aria-label={c.name} aria-pressed={c === color} onClick={() => setColor(c)}
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
