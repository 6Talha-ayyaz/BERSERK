/* ============================================================
   STORE CONFIG + PRODUCT CATALOG
   This is the only file you need to edit to add products.

   To add a product:
     1. Drop the .glb into public/models/
     2. Copy one entry below, give it a unique `id` (used in the URL),
        set `model` to 'models/<file>.glb', and fill in the copy.
   Products fill the display rails in order (right wall first, then the
   left wall, the free-standing rack and the back niche: 14 spots).

   Model checklist:
     - Units in metres (a hoodie is ~0.65 m tall). If not, set `scale`.
     - Garment front should face +Z. If it faces another way, set
       `frontYaw` (radians): e.g. Math.PI if it faces backwards,
       Math.PI / 2 or -Math.PI / 2 if it faces sideways.
   ============================================================ */

export const STORE = {
  name: 'BERSERK',                 // brand name: header, landing, tab title
  collection: 'The Featured Edit', // headline shown in the room
  currency: 'USD',
  locale: 'en-US',
};

export const PRODUCTS = [
  {
    id: 'classic-black-flame-hoodie',
    name: 'Classic Black Flame Hoodie',
    price: 129,
    model: 'models/classic_black_flame_hoodie.glb',
    scale: 1,
    frontYaw: 0,
    tagline: 'Heavyweight loopback fleece, finished with hand-guided flame stitching.',
    description:
      'Cut from a dense 319 gsm brushed-back sweat with 468 gsm 2×2 rib at the cuffs and hem. ' +
      'A relaxed, slightly dropped shoulder, a double-layer hood and tonal red flame embroidery ' +
      'that catches the light as you move.',
    colors: [{ name: 'Jet Black', hex: '#141414' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    details: [
      '319 gsm cotton loopback body',
      '468 gsm 2×2 rib cuffs and hem',
      'Double-layer hood, no drawcord',
      'Red flame embroidery, front and back',
      'Relaxed fit: take your usual size',
    ],
    care: 'Machine wash cold, inside out. Do not tumble dry. Iron on reverse, avoiding embroidery.',
    // Required by the model's CC BY 4.0 licence; remove once you use your client's own model.
    credit: {
      text: '3D model “Classic Black Flame Hoodie” by kril, CC BY 4.0',
      url: 'https://sketchfab.com/3d-models/classic-black-flame-hoodie-0fd0effa321e456cb2a7467e2899b658',
    },
  },

  {
    id: 'black-leather-coat',
    name: 'Black Leather Coat',
    price: 449,                     // placeholder: set the real price
    model: 'models/coat_leather.glb',
    scale: 0.9,                     // the source model is 1 m long; 0.9 m suits a mid-length coat
    frontYaw: 0,
    tagline: 'Soft black leather, hardware-heavy, cut long through the body.',
    description:
      'A mid-length coat in supple black leather with wide lapels and a zip-front inner panel. ' +
      'Silver studs run down the front and sleeves, with zip and lace-up details at the arms and ' +
      'buckled straps across the shoulders.',
    colors: [{ name: 'Black', hex: '#111111' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    details: [
      'Leather shell',
      'Wide notch lapels over a zip-front inner panel',
      'Silver-tone studs, zips and buckles',
      'Lace-up and zip details on the sleeves',
      'Mid-length, regular fit: take your usual size',
    ],
    care: 'Specialist leather clean only. Hang on a wide hanger away from heat and direct sunlight.',
  },

  /* Template for the next product:
  {
    id: 'oversized-cream-tee',
    name: 'Oversized Cream Tee',
    price: 59,
    model: 'models/oversized_cream_tee.glb',
    scale: 1,
    frontYaw: 0,
    tagline: '',
    description: '',
    colors: [{ name: 'Cream', hex: '#efe6d6' }],
    sizes: ['S', 'M', 'L', 'XL'],
    details: [],
    care: '',
  },
  */
];

/* The room has 14 display spots; products past that are not shown. */
export const DISPLAY_SPOTS = 14;
export const FEATURED = PRODUCTS.slice(0, DISPLAY_SPOTS);
if (PRODUCTS.length > DISPLAY_SPOTS) console.warn(`Only ${DISPLAY_SPOTS} display spots: extra products are not shown.`);
