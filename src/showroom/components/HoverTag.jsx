import { forwardRef, useRef } from 'react';

/* Floating label that follows the hovered piece. The scene positions it
   (style.transform + data-side) every frame; React only sets the text. */
const HoverTag = forwardRef(function HoverTag({ name, price }, ref) {
  // keep the last text while the tag fades out
  const last = useRef({ name: '', price: '' });
  if (name) last.current = { name, price };

  return (
    <div ref={ref} className={`tag${name ? ' is-on' : ''}`} aria-hidden="true">
      <span className="tag-line" />
      <span className="tag-body">
        <span className="tag-name">{last.current.name}</span>
        <span className="tag-meta"><span>{last.current.price}</span><span className="tag-cta">View piece →</span></span>
      </span>
    </div>
  );
});
export default HoverTag;
