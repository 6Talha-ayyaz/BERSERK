import { forwardRef } from 'react';

/* Custom cursor for mouse users. Its position and state classes are driven
   by the scene every frame, so React renders it once and leaves it alone. */
const Cursor = forwardRef(function Cursor(_, ref) {
  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      <span className="cursor-ring" />
      <span className="cursor-label">View</span>
    </div>
  );
});
export default Cursor;
