import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion, useInView } from 'framer-motion';
import { CATALOG, FREE_SHIPPING_AT, byId } from '../catalog.js';
import { useStore } from '../store.jsx';
import { fmtPrice } from '../../lib/format.js';
import { EASE, Icon, Magnetic, Reveal, Rise, flyToBag } from '../ui.jsx';
import Visual, { Stage } from '../components/Visual.jsx';
import Flat from '../flats.jsx';
import ProductCard from '../components/ProductCard.jsx';

export function NotFound() {
  useEffect(() => { document.title = 'Not found | BERSERK'; }, []);
  return (
    <div className="lost wrap">
      <p className="kicker mono">404</p>
      <Rise as="h1" className="display" text="Nothing *here.*" />
      <Reveal delay={0.3}><Link className="btn btn-ember" to="/shop"><span>Back to the shop</span><Icon name="arrow" size={18} /></Link></Reveal>
    </div>
  );
}

function Fold({ title, open, onToggle, children }) {
  return (
    <div className={`fold${open ? ' is-open' : ''}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <span>{title}</span><i className="fold-x" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="fold-body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="fold-in">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductView({ product }) {
  const { add, wish, toggleWish, bumpBag, openCart, seen, recent } = useStore();
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : null);
  const needsSize = sizes.length > 0;
  const [warn, setWarn] = useState(0);          // bumps to replay the "choose a size" shake
  const [added, setAdded] = useState(false);
  const [fold, setFold] = useState(0);
  const sizesRef = useRef(null);
  const buyRef = useRef(null);
  const buyInView = useInView(buyRef, { margin: '-80px 0px 0px 0px' });
  const [scrolled, setScrolled] = useState(false);
  const timer = useRef(0);

  const index = CATALOG.indexOf(product);
  const prev = CATALOG[(index - 1 + CATALOG.length) % CATALOG.length];
  const next = CATALOG[(index + 1) % CATALOG.length];
  const saved = wish.includes(product.id);
  const related = [...CATALOG.filter((p) => p.category === product.category && p !== product), ...CATALOG.filter((p) => p.category !== product.category)].slice(0, 4);
  const lately = recent.filter((id) => id !== product.id).map(byId).filter(Boolean).slice(0, 4);

  useEffect(() => {
    document.title = `${product.name} | BERSERK`;
    seen(product.id);
    const onScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer.current); };
  }, [product]);   // eslint-disable-line react-hooks/exhaustive-deps

  const buy = (e) => {
    if (needsSize && !size) {
      setWarn((n) => n + 1);
      sizesRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    add(product.id, size, color?.name);
    setAdded(true);
    flyToBag(e.currentTarget, bumpBag);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setAdded(false); openCart(); }, 900);
  };

  const folds = [
    product.description && { title: 'The piece', body: <p>{product.description}</p> },
    product.details?.length && { title: 'Details', body: <ul>{product.details.map((d) => <li key={d}>{d}</li>)}</ul> },
    product.care && { title: 'Care', body: <p>{product.care}</p> },
    { title: 'Shipping and returns', body: <p>Free shipping on orders over {fmtPrice(FREE_SHIPPING_AT)}. Send anything back within 30 days, unworn, for a full refund.</p> },
  ].filter(Boolean);

  const buyLabel = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={added ? 'ok' : size || !needsSize ? 'add' : 'pick'} className="swap"
        initial={{ y: '100%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {added ? <><Icon name="check" size={18} />In your bag</> : size || !needsSize ? <>Add to bag<i className="sep" />{fmtPrice(product.price)}</> : 'Choose a size'}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <div className="p">
      <div className="p-top">
        {/* ----- the piece ----- */}
        <div className="p-stage">
          <div className="p-stage-in" data-turn>
            <span className="p-ghost" aria-hidden="true">{product.code?.split('-')[1] || '00'}</span>
            <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
            {product.model ? (
              <Stage product={product} fill={0.8} spin={0.28} />
            ) : (
              <motion.div className="p-flat" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: EASE, delay: 0.5 }}>
                <Flat kind={product.flat} tint={color?.hex} className="is-big" />
              </motion.div>
            )}
            <div className="p-stage-meta mono">
              <span>{product.code}</span>
              <span className="dim">{product.model ? <><Icon name="rotate" size={14} />Drag to turn</> : 'Technical flat'}</span>
              <span className="tnum">{String(index + 1).padStart(2, '0')} / {String(CATALOG.length).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* ----- the details ----- */}
        <div className="p-info">
          <Reveal as="nav" className="crumbs mono" aria-label="Breadcrumb" y={10} delay={0.3}>
            <Link to="/shop">Shop</Link><i>/</i><Link to={`/shop?c=${product.category}`}>{product.category}</Link>
            {product.badge && <span className="chip">{product.badge}</span>}
          </Reveal>
          <Rise as="h1" className="p-title" text={product.name} delay={0.35} />
          <Reveal className="p-price" delay={0.55} y={14}>
            <strong className="mono">{fmtPrice(product.price)}</strong>
            <span className="chip mono">{product.weight}</span>
          </Reveal>
          {product.tagline && <Reveal as="p" className="p-tagline" delay={0.62} y={14}>{product.tagline}</Reveal>}

          {colors.length > 0 && (
            <Reveal className="p-opt" delay={0.7} y={14}>
              <p className="p-label mono"><span className="dim">Colour</span> {color.name}</p>
              <LayoutGroup id="hues">
                <div className="hues" role="group" aria-label="Colour">
                  {colors.map((c) => (
                    <button key={c.name} type="button" className="hue" style={{ '--c': c.hex }} aria-label={c.name} aria-pressed={c === color} onClick={() => setColor(c)}>
                      {c === color && <motion.i layoutId="hue-ring" className="hue-ring" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                    </button>
                  ))}
                </div>
              </LayoutGroup>
            </Reveal>
          )}

          {sizes.length > 1 && (
            <Reveal className="p-opt" delay={0.76} y={14}>
              <p className="p-label mono">
                <span><span className="dim">Size</span> {size || ''}</span>
                <AnimatePresence>
                  {warn > 0 && !size && (
                    <motion.b key={warn} className="p-warn" role="alert" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>Pick one first</motion.b>
                  )}
                </AnimatePresence>
              </p>
              <LayoutGroup id="fits">
                <motion.div
                  key={warn} ref={sizesRef} className="fits" role="group" aria-label="Size"
                  animate={warn && !size ? { x: [0, -9, 8, -6, 4, 0] } : undefined} transition={{ duration: 0.45 }}
                >
                  {sizes.map((s) => (
                    <button key={s} type="button" className={`fit${s === size ? ' is-on' : ''}`} aria-pressed={s === size} onClick={() => setSize(s)}>
                      {s === size && <motion.i layoutId="fit-fill" className="fit-fill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                      <span>{s}</span>
                    </button>
                  ))}
                </motion.div>
              </LayoutGroup>
            </Reveal>
          )}

          <Reveal className="p-buy" delay={0.82} y={14}>
            <Magnetic strength={0.12} className="grow">
              <button ref={buyRef} type="button" className={`btn btn-ember btn-full btn-xl${added ? ' is-done' : ''}`} onClick={buy}>{buyLabel}</button>
            </Magnetic>
            <button type="button" className={`round round-xl${saved ? ' is-saved' : ''}`} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save for later'} onClick={() => toggleWish(product.id)}>
              <Icon name="heart" size={20} />
            </button>
          </Reveal>

          <Reveal as="ul" className="perks mono" delay={0.88} y={14}>
            <li><Icon name="truck" size={17} />Free shipping over {fmtPrice(FREE_SHIPPING_AT)}</li>
            <li><Icon name="rotate" size={17} />30-day returns</li>
            {product.model && <li><Icon name="cube" size={17} /><Link to={`/showroom/${product.id}`}>See it on the rail in the 3D showroom</Link></li>}
          </Reveal>

          <Reveal className="folds" delay={0.94} y={14}>
            {folds.map((f, i) => (
              <Fold key={f.title} title={f.title} open={fold === i} onToggle={() => setFold(fold === i ? -1 : i)}>{f.body}</Fold>
            ))}
          </Reveal>

          {product.credit && (
            <p className="p-credit mono dim">
              {product.credit.url ? <a href={product.credit.url} target="_blank" rel="noopener noreferrer">{product.credit.text}</a> : product.credit.text}
            </p>
          )}
        </div>
      </div>

      {/* ----- more ----- */}
      <section className="more wrap">
        <header className="sec-head">
          <p className="kicker mono">Wear it with</p>
          <Rise className="h1" text="Goes *with it.*" />
        </header>
        <div className="grid" style={{ '--cols': 4 }}>
          {related.map((p, i) => <Reveal key={p.id} delay={i * 0.07}><ProductCard product={p} /></Reveal>)}
        </div>

        {lately.length > 0 && (
          <Reveal className="lately">
            <p className="kicker mono">You looked at</p>
            <div className="lately-row">
              {lately.map((p) => (
                <Link key={p.id} className="lately-item" to={`/product/${p.id}`}>
                  <span className="lately-pic"><Visual product={p} interactive={false} /></span>
                  <span>{p.name}<small className="mono dim">{fmtPrice(p.price)}</small></span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </section>

      <nav className="pager" aria-label="More pieces">
        <Link className="pager-link" to={`/product/${prev.id}`} data-cursor="Prev">
          <span className="mono dim"><Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} />Previous</span>
          <strong>{prev.name}</strong>
        </Link>
        <Link className="pager-link is-next" to={`/product/${next.id}`} data-cursor="Next">
          <span className="mono dim">Next<Icon name="arrow" size={14} /></span>
          <strong>{next.name}</strong>
        </Link>
      </nav>

      {/* ----- buy bar that appears once the main button has scrolled away ----- */}
      {createPortal(
        <AnimatePresence>
          {scrolled && !buyInView && (
            <motion.div className="buybar" initial={{ y: '120%' }} animate={{ y: '0%' }} exit={{ y: '120%' }} transition={{ duration: 0.5, ease: EASE }}>
              <span className="buybar-pic"><Visual product={product} tint={color?.hex} interactive={false} /></span>
              <span className="buybar-name">{product.name}<small className="mono dim">{[color?.name, size].filter(Boolean).join(' · ') || 'Choose a size'}</small></span>
              <button type="button" className="btn btn-ember" onClick={buy}>{buyLabel}</button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

export default function Product() {
  const { id } = useParams();
  const product = byId(id);
  return product ? <ProductView key={product.id} product={product} /> : <NotFound />;
}
