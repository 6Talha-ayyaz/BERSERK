import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STORE } from '../data/products.js';
import { replayClass } from '../lib/format.js';

export default function Header({ bagCount, onBag }) {
  const bagRef = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    replayClass(bagRef.current, 'is-bump');
  }, [bagCount]);

  return (
    <header className="topbar">
      <Link className="brand" to="/">{STORE.name}</Link>
      <nav className="topnav" aria-label="Main">
        <Link className="topnav-link" to="/">Featured</Link>
        <button ref={bagRef} className="bag" type="button" aria-label={`Shopping bag, ${bagCount} items`} onClick={onBag}>
          Bag <span className="bag-count">{bagCount}</span>
        </button>
      </nav>
    </header>
  );
}
