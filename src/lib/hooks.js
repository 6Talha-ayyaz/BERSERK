import { useCallback, useEffect, useRef, useState } from 'react';

/* (The bag now lives in src/site/store.jsx, shared by the shop and the showroom.) */

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
