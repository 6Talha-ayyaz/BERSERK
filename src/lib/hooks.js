import { useCallback, useEffect, useRef, useState } from 'react';

const BAG_KEY = 'boutique-bag';

/* Shopping bag. Demo only: items are kept in this browser's localStorage.
   Connect to a real checkout (Shopify, Stripe…) before launch. */
export function useBag() {
  const [bag, setBag] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BAG_KEY) || '[]'); } catch (_) { return []; }
  });
  const add = useCallback((entry) => {
    setBag((b) => {
      const next = [...b, entry];
      try { localStorage.setItem(BAG_KEY, JSON.stringify(next)); } catch (_) { /* private mode */ }
      return next;
    });
  }, []);
  return { bag, add };
}

export function useToast(ms = 2800) {
  const [toast, setToast] = useState({ msg: '', on: false });
  const timer = useRef(0);
  const show = useCallback((msg) => {
    setToast({ msg, on: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), ms);
  }, [ms]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
}
