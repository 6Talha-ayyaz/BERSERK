import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store.jsx';
import { CATALOG, FREE_SHIPPING_AT } from '../catalog.js';
import { fmtPrice } from '../../lib/format.js';
import { EASE, EASE_IO, Icon, Magnetic, Mark, Rolling } from '../ui.jsx';
import Visual from './Visual.jsx';

export default function CartDrawer() {
  const { cartOpen, closeCart, lines, count, subtotal, setQty, remove, add } = useStore();
  const { pathname } = useLocation();
  const panel = useRef(null);
  const [notice, setNotice] = useState(false);

  useEffect(() => { closeCart(); }, [pathname]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cartOpen) { setNotice(false); return undefined; }
    const before = document.activeElement;
    document.documentElement.classList.add('is-locked');
    panel.current?.focus({ preventScroll: true });
    const key = (e) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', key);
    return () => {
      document.documentElement.classList.remove('is-locked');
      window.removeEventListener('keydown', key);
      before?.focus?.({ preventScroll: true });
    };
  }, [cartOpen]);   // eslint-disable-line react-hooks/exhaustive-deps

  const left = Math.max(0, FREE_SHIPPING_AT - subtotal);
  const progress = Math.min(1, subtotal / FREE_SHIPPING_AT);
  const inBag = new Set(lines.map((l) => l.id));
  const upsell = CATALOG.filter((p) => !inBag.has(p.id) && p.sizes?.length === 1)[0];

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="cart" role="dialog" aria-modal="true" aria-label="Your bag">
          <motion.div className="cart-veil" onClick={closeCart} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
          <motion.aside
            ref={panel} tabIndex={-1} className="cart-panel"
            initial={{ x: '100%' }} animate={{ x: '0%' }} exit={{ x: '100%' }}
            transition={{ duration: 0.65, ease: EASE_IO }}
          >
            <header className="cart-head">
              <h2>Bag <span className="mono tnum">({count})</span></h2>
              <button type="button" className="round" onClick={closeCart} aria-label="Close bag"><Icon name="close" size={18} /></button>
            </header>

            <div className={`ship${left === 0 ? ' is-free' : ''}`}>
              <p className="mono">
                {left === 0
                  ? <><Icon name="check" size={14} /> Free shipping unlocked</>
                  : <>You are <b>{fmtPrice(left)}</b> away from free shipping</>}
              </p>
              <div className="ship-bar"><motion.i initial={false} animate={{ scaleX: progress }} transition={{ duration: 0.8, ease: EASE }} /></div>
            </div>

            <div className="cart-body">
              {lines.length === 0 ? (
                <motion.div className="cart-empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
                  <Mark size={34} />
                  <p className="h3">Nothing in here yet.</p>
                  <p className="dim">Pick something heavy.</p>
                  <Link className="btn btn-line" to="/shop">Shop the drop <Icon name="arrow" size={16} /></Link>
                </motion.div>
              ) : (
                <ul className="cart-lines">
                  <AnimatePresence initial={false}>
                    {lines.map((l, i) => (
                      <motion.li
                        key={l.key} layout
                        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0, paddingBottom: 0, transition: { duration: 0.35 } }}
                        transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.05, layout: { duration: 0.35, delay: 0 } }}
                        className="line"
                      >
                        <Link className="line-pic" to={`/product/${l.id}`} aria-label={l.product.name}>
                          <Visual product={l.product} tint={l.product.colors?.find((c) => c.name === l.color)?.hex} interactive={false} />
                        </Link>
                        <div className="line-main">
                          <Link className="line-name" to={`/product/${l.id}`}>{l.product.name}</Link>
                          <p className="mono dim">{[l.color, l.size].filter(Boolean).join(' · ')}</p>
                          <div className="line-foot">
                            <div className="qty" role="group" aria-label="Quantity">
                              <button type="button" onClick={() => setQty(l.key, l.qty - 1)} aria-label="One fewer"><Icon name="minus" size={14} /></button>
                              <span className="tnum mono" aria-live="polite">{l.qty}</span>
                              <button type="button" onClick={() => setQty(l.key, l.qty + 1)} aria-label="One more" disabled={l.qty >= 9}><Icon name="plus" size={14} /></button>
                            </div>
                            <button type="button" className="line-remove mono" onClick={() => remove(l.key)}>Remove</button>
                          </div>
                        </div>
                        <span className="line-price mono"><Rolling value={l.qty * l.product.price} format={fmtPrice} /></span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}

              {lines.length > 0 && upsell && (
                <motion.div layout className="upsell">
                  <span className="mono dim">Goes with it</span>
                  <div className="upsell-row">
                    <span className="upsell-pic"><Visual product={upsell} interactive={false} /></span>
                    <span className="upsell-name">{upsell.name}<small className="mono dim">{fmtPrice(upsell.price)}</small></span>
                    <button type="button" className="btn btn-line btn-s" onClick={() => add(upsell.id, upsell.sizes[0], upsell.colors?.[0]?.name)}>
                      <Icon name="plus" size={14} /> Add
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {lines.length > 0 && (
              <footer className="cart-foot">
                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong><Rolling value={subtotal} format={fmtPrice} /></strong>
                </div>
                <p className="mono dim">Shipping and taxes are worked out at checkout.</p>
                <Magnetic strength={0.15} className="block">
                  <button type="button" className="btn btn-ember btn-full" onClick={() => setNotice(true)}>
                    <span>Checkout</span><Icon name="arrow" size={18} />
                  </button>
                </Magnetic>
                <AnimatePresence>
                  {notice && (
                    <motion.p className="cart-notice mono" role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                      Checkout is not connected yet. This bag is a front-end demo and nothing has been charged.
                    </motion.p>
                  )}
                </AnimatePresence>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
