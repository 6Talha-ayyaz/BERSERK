/* ============================================================
   STORE CONFIG + PRODUCT CATALOG
   This is the only file you need to edit to add products.

   To add a product:
     1. Drop the .glb into /models (or anywhere next to index.html)
     2. Copy one entry below, give it a unique `id` (used in the URL),
        point `model` at the file, and fill in the copy.
   Products fill the display rails in order (right wall first, then the
   left wall, the free-standing rack and the back niche: 14 spots).

   Model checklist:
     - Units in metres (a hoodie is ~0.65 m tall). If not, set `scale`.
     - Garment front should face +Z. If it faces another way, set
       `frontYaw` (radians): e.g. Math.PI if it faces backwards,
       Math.PI / 2 or -Math.PI / 2 if it faces sideways.
   ============================================================ */

export const STORE = {
  name: 'ATELIER',                 // brand name: header, loader, tab title
  collection: 'The Featured Edit', // headline shown in the room
  currency: 'USD',
  locale: 'en-US',
};

export const PRODUCTS = [
  {
    id: 'classic-black-flame-hoodie',
    name: 'Classic Black Flame Hoodie',
    price: 129,
    model: 'classic_black_flame_hoodie.glb',
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
