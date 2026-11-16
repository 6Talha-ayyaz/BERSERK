import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { byId } from './catalog.js';

/* Bag, wishlist and "recently viewed", kept in this browser's localStorage.
   The bag is a front-end demo: connect it to a real checkout before launch. */
const KEYS = { bag: 'berserk-bag', wish: 'berserk-wish', recent: 'berserk-recent' };
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (_) { return []; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* private mode */ } };

function usePersisted(key) {
  const [value, setValue] = useState(() => read(key));
  useEffect(() => { write(key, value); }, [key, value]);
  return [value, setValue];
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [bag, setBag] = usePersisted(KEYS.bag);
  const [wish, setWish] = usePersisted(KEYS.wish);
  const [recent, setRecent] = usePersisted(KEYS.recent);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bump, setBump] = useState(0);

  const add = useCallback((id, size, color, qty = 1) => {
    const key = [id, size || '', color || ''].join('|');
    setBag((b) => (b.some((l) => l.key === key)
      ? b.map((l) => (l.key === key ? { ...l, qty: Math.min(9, l.qty + qty) } : l))
      : [...b, { key, id, size, color, qty }]));
  }, [setBag]);
  const setQty = useCallback((key, qty) => {
    setBag((b) => (qty <= 0 ? b.filter((l) => l.key !== key) : b.map((l) => (l.key === key ? { ...l, qty: Math.min(9, qty) } : l))));
  }, [setBag]);
  const remove = useCallback((key) => setBag((b) => b.filter((l) => l.key !== key)), [setBag]);
  const toggleWish = useCallback((id) => {
    setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  }, [setWish]);
  const seen = useCallback((id) => {
    setRecent((r) => (r[0] === id ? r : [id, ...r.filter((x) => x !== id)].slice(0, 6)));
  }, [setRecent]);

  const value = useMemo(() => {
    // ignore lines whose product has since been removed from the catalog
    const lines = bag.map((l) => ({ ...l, product: byId(l.id) })).filter((l) => l.product);
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.product.price, 0),
      add, setQty, remove,
      wish, toggleWish,
      recent, seen,
      cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
      searchOpen, openSearch: () => setSearchOpen(true), closeSearch: () => setSearchOpen(false),
      bump, bumpBag: () => setBump((n) => n + 1),
    };
  }, [bag, wish, recent, cartOpen, searchOpen, bump, add, setQty, remove, toggleWish, seen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
