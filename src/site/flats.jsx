/* Technical flats: line drawings used for products that have no 3D model yet.
   Every path has pathLength="1", so CSS can "draw" it with stroke-dashoffset.
   Classes:  body = the garment outline (takes the colourway as its fill)
             acc  = ember detail                                        */

const P = (props) => <path pathLength="1" {...props} />;
const ticks = (x0, x1, step, y0, y1) => {
  let d = '';
  for (let x = x0; x <= x1; x += step) d += `M${x} ${y0}V${y1}`;
  return d;
};

/* The mark: three claw slashes. */
export function Claw({ x = 0, y = 0, s = 1 }) {
  return (
    <g className="acc" transform={`translate(${x} ${y}) scale(${s})`}>
      <P d="M0 22L9 0" /><P d="M11 22L20 0" /><P d="M22 22L31 0" />
    </g>
  );
}

const FLATS = {
  tee: (
    <>
      <P className="body" d="M152 92L92 110L34 182L78 222L110 190L108 418L292 418L290 190L322 222L366 182L308 110L248 92Q200 128 152 92Z" />
      <P d="M152 92Q200 104 248 92" />
      <P d="M146 94Q200 142 254 94" />
      <P d="M108 406L292 406" />
      <P d="M40 174L85 215" /><P d="M360 174L315 215" />
      <P d="M110 190L112 232" /><P d="M290 190L288 232" />
      <Claw x={185} y={172} />
    </>
  ),
  crew: (
    <>
      <P className="body" d="M156 90L106 106Q62 170 36 352L34 388L74 392L78 356Q92 270 114 212L112 396L114 426L286 426L288 396L286 212Q308 270 322 356L326 392L366 388L364 352Q338 170 294 106L244 90Q200 122 156 90Z" />
      <P d="M156 90Q200 102 244 90" />
      <P d="M150 92Q200 136 250 92" />
      <P d="M156 90L114 212" /><P d="M244 90L286 212" />
      <P d="M36 352L78 356" /><P d="M364 352L322 356" />
      <P d="M112 396L288 396" />
      <P d={ticks(124, 276, 12, 402, 421)} />
      <path className="acc dash" d="M138 204L262 204" />
    </>
  ),
  bomber: (
    <>
      <P className="body" d="M160 86L108 100Q62 160 34 340L32 380L74 386L78 346Q94 262 116 208L114 384L116 416L284 416L286 384L284 208Q306 262 322 346L326 386L368 380L366 340Q338 160 292 100L240 86Q200 104 160 86Z" />
      <P d="M152 89Q200 124 248 89" />
      <P d="M197 112L197 416" /><P d="M203 112L203 416" />
      <P d="M114 384L286 384" />
      <P d="M34 340L78 346" /><P d="M366 340L322 346" />
      <P d={ticks(126, 190, 12, 390, 411)} /><P d={ticks(210, 274, 12, 390, 411)} />
      <P d="M138 298L146 296L162 348L154 350Z" /><P d="M262 298L254 296L238 348L246 350Z" />
      <P d="M316 232L340 226L346 254L322 260Z" /><P d="M318 240L342 234" />
      <P className="acc" d="M194 118h12v16h-12z" />
      <P className="acc" d="M326 244l10-3" />
    </>
  ),
  cargo: (
    <>
      <P className="body" d="M120 70L280 70L284 100L312 440L226 444L200 186L174 444L88 440L116 100Z" />
      <P d="M116 100L284 100" />
      <P d="M200 100L200 186" /><P d="M212 100L212 150Q212 168 200 172" />
      <P d="M146 66h8v38h-8z" /><P d="M246 66h8v38h-8z" />
      <P d="M142 100Q140 140 111 158" /><P d="M258 100Q260 140 289 158" />
      <P d="M102 238L160 240L158 318L96 316Z" /><P d="M101 258L160 260" />
      <P d="M298 238L240 240L242 318L304 316Z" /><P d="M299 258L240 260" />
      <P d="M128 350L150 354" /><P d="M272 350L250 354" />
      <P d="M89 428L175 432" /><P d="M311 428L225 432" />
      <circle className="acc" cx="200" cy="85" r="4" /><circle className="acc" cx="130" cy="249" r="3" /><circle className="acc" cx="270" cy="249" r="3" />
    </>
  ),
  short: (
    <g transform="translate(0 22)">
      <P className="body" d="M112 110L288 110L292 140L326 350L222 356L200 236L178 356L74 350L108 140Z" />
      <P d="M108 140L292 140" />
      <P d={ticks(124, 276, 12, 115, 135)} />
      <P d="M200 140L200 236" />
      <P d="M136 140Q134 180 102 200" /><P d="M264 140Q266 180 298 200" />
      <P d="M76 338L176 344" /><P d="M324 338L224 344" />
      <P className="acc" d="M193 140Q188 172 180 190" /><P className="acc" d="M207 140Q212 172 220 190" />
    </g>
  ),
  beanie: (
    <>
      <P className="body" d="M112 300Q104 120 200 112Q296 120 288 300L296 300L300 388Q200 400 100 388L104 300Z" />
      <P d="M104 300L296 300" />
      <P d="M102 344Q200 354 298 344" />
      <P d="M200 112L200 300" />
      <P d="M168 116Q150 200 152 300" /><P d="M232 116Q250 200 248 300" />
      <P d="M140 130Q118 210 128 300" /><P d="M260 130Q282 210 272 300" />
      <P d={ticks(124, 172, 16, 308, 340)} /><P d={ticks(228, 276, 16, 308, 340)} />
      <P className="acc" d="M184 360h32v16h-32z" />
    </>
  ),
  cap: (
    <>
      <P className="body" d="M110 300Q104 150 200 140Q296 150 290 300Q200 276 110 300Z" />
      <P className="body" d="M96 304Q200 280 304 304Q318 338 290 352Q200 320 110 352Q82 338 96 304Z" />
      <P d="M200 140L200 284" />
      <P d="M152 150Q138 220 132 293" /><P d="M248 150Q262 220 268 293" />
      <P d="M106 326Q200 298 294 326" />
      <circle cx="200" cy="138" r="5" /><circle cx="172" cy="198" r="3" /><circle cx="228" cy="198" r="3" />
      <P className="acc thick" d="M190 252L210 252" />
    </>
  ),
  tote: (
    <>
      <P className="body" d="M96 190L304 190L318 430L82 430Z" />
      <P d="M140 190Q138 70 200 70Q262 70 260 190" />
      <P d="M158 190Q158 90 200 90Q242 90 242 190" />
      <P d="M95 208L305 208" />
      <P d="M140 190L136 290L156 290L158 190" /><P d="M260 190L264 290L244 290L242 190" />
      <P d="M84 400L316 400" />
      <circle className="acc" cx="149" cy="199" r="3" /><circle className="acc" cx="251" cy="199" r="3" />
      <Claw x={185} y={318} />
    </>
  ),
};

/* `tint` is the selected colourway: it fills the garment body. */
/* light colourways (bone) need dark inner lines to stay readable */
function isLight(hex = '') {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 > 0.55;
}

export default function Flat({ kind, tint, className = '' }) {
  return (
    <svg className={`flat ${isLight(tint) ? 'is-light ' : ''}${className}`} viewBox="0 0 400 500" style={{ '--tint': tint }} aria-hidden="true">
      {FLATS[kind] || FLATS.tee}
    </svg>
  );
}
