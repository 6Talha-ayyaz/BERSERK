import { STORE } from '../data/products.js';

const money = new Map();
export function fmtPrice(n) {
  const frac = n % 1 ? 2 : 0;
  if (!money.has(frac)) {
    money.set(frac, new Intl.NumberFormat(STORE.locale || 'en-US', {
      style: 'currency', currency: STORE.currency || 'USD',
      minimumFractionDigits: frac, maximumFractionDigits: 2,
    }));
  }
  return money.get(frac).format(n);
}

export const pad = (n) => String(n).padStart(2, '0');

/* Restart a CSS animation on an element (remove the class, force a reflow, add it back). */
export function replayClass(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
