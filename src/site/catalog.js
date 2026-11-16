/* ============================================================
   SITE CATALOG
   The two pieces with real 3D models come from src/data/products.js
   (the same file the 3D showroom reads). Everything listed under
   DEMO below is placeholder stock so the shop, filters and bag have
   something to work with: replace it with the real range.

   A product is shown one of two ways:
     - `model`  a .glb in public/models: live 3D on its page, and a
                360° turntable on its shop card.
     - `flat`   a line drawing from src/site/flats.jsx (tee, crew,
                bomber, cargo, short, beanie, cap, tote).
   ============================================================ */
import { PRODUCTS as MODELLED } from '../data/products.js';

export const CATEGORIES = ['Outerwear', 'Tops', 'Bottoms', 'Accessories'];

const EXTRA = {
  'classic-black-flame-hoodie': { category: 'Tops', badge: 'Drop 01', code: 'BSK-001', weight: '319 GSM' },
  'black-leather-coat': { category: 'Outerwear', badge: 'Drop 01', code: 'BSK-002', weight: 'Full leather' },
};

const DEMO = [
  {
    id: 'ashfall-oversized-tee',
    name: 'Ashfall Oversized Tee',
    price: 59,
    category: 'Tops',
    flat: 'tee',
    code: 'BSK-003',
    weight: '260 GSM',
    tagline: 'A boxy, heavy tee, washed until the black goes to ash.',
    description:
      'Cut wide through the body with a dropped shoulder and a thick ribbed collar that keeps its shape. ' +
      'Garment-dyed and stone-washed, so no two come out exactly the same.',
    colors: [{ name: 'Ash Black', hex: '#1c1b1a' }, { name: 'Bone', hex: '#d9d0c0' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    details: ['260 gsm combed cotton jersey', 'Dropped shoulder, boxy fit', '2 cm ribbed collar', 'Garment-dyed and stone-washed'],
    care: 'Machine wash cold with dark colours. Hang dry.',
  },
  {
    id: 'warpath-bomber',
    name: 'Warpath Bomber',
    price: 229,
    category: 'Outerwear',
    flat: 'bomber',
    badge: 'New',
    code: 'BSK-004',
    weight: 'Padded',
    tagline: 'A cropped nylon bomber with a heavy two-way zip.',
    description:
      'Matte nylon twill over light padding, cut short and wide. Ribbed collar, cuffs and hem, ' +
      'a utility pocket on the left sleeve and an ember lining you only see when it is open.',
    colors: [{ name: 'Black', hex: '#131313' }, { name: 'Oxide', hex: '#5a2416' }],
    sizes: ['S', 'M', 'L', 'XL'],
    details: ['Matte nylon twill shell', 'Light recycled padding', 'Two-way metal zip', 'Sleeve utility pocket', 'Ember satin lining'],
    care: 'Machine wash cold on a gentle cycle. Do not iron.',
  },
  {
    id: 'ironside-cargo-pant',
    name: 'Ironside Cargo Pant',
    price: 149,
    category: 'Bottoms',
    flat: 'cargo',
    code: 'BSK-005',
    weight: '340 GSM',
    tagline: 'Wide-leg ripstop cargos with bellows pockets.',
    description:
      'A full, straight leg in cotton ripstop with articulated knees. Two bellows pockets with snap flaps, ' +
      'an adjustable waist tab and drawcords at the hem to change the shape.',
    colors: [{ name: 'Black', hex: '#151515' }, { name: 'Slate', hex: '#3b3d40' }],
    sizes: ['28', '30', '32', '34', '36'],
    details: ['340 gsm cotton ripstop', 'Wide straight leg', 'Bellows cargo pockets', 'Hem drawcords', 'Articulated knee darts'],
    care: 'Machine wash cold. Tumble dry low.',
  },
  {
    id: 'cinder-crewneck',
    name: 'Cinder Crewneck',
    price: 109,
    category: 'Tops',
    flat: 'crew',
    code: 'BSK-006',
    weight: '420 GSM',
    tagline: 'A dense loopback crew with a split ember stitch.',
    description:
      'The same fleece as the hoodie, without the hood. Raglan sleeves, a deep ribbed hem ' +
      'and a single line of ember chain-stitch across the chest.',
    colors: [{ name: 'Black', hex: '#141414' }, { name: 'Cinder', hex: '#4a4640' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    details: ['420 gsm cotton loopback', 'Raglan sleeve', 'Deep 2×2 rib hem and cuffs', 'Ember chain-stitch at chest'],
    care: 'Machine wash cold, inside out. Do not tumble dry.',
  },
  {
    id: 'sunder-short',
    name: 'Sunder Short',
    price: 89,
    category: 'Bottoms',
    flat: 'short',
    code: 'BSK-007',
    weight: '340 GSM',
    tagline: 'Knee-length ripstop shorts, cut wide.',
    description:
      'The cargo pant, cut off above the knee. Elastic waist with a flat drawcord, deep side pockets ' +
      'and one snap pocket at the back.',
    colors: [{ name: 'Black', hex: '#151515' }],
    sizes: ['S', 'M', 'L', 'XL'],
    details: ['340 gsm cotton ripstop', 'Elastic waist, flat drawcord', 'Knee length', 'Back snap pocket'],
    care: 'Machine wash cold. Tumble dry low.',
  },
  {
    id: 'forge-cap',
    name: 'Forge Cap',
    price: 45,
    category: 'Accessories',
    flat: 'cap',
    code: 'BSK-008',
    weight: 'One size',
    tagline: 'A six-panel cap in washed canvas.',
    description:
      'Unstructured six-panel cap with a curved peak and a brass slide buckle. ' +
      'Small ember bar-tack at the front, nothing else.',
    colors: [{ name: 'Black', hex: '#151515' }, { name: 'Bone', hex: '#d9d0c0' }],
    sizes: ['One size'],
    details: ['Washed cotton canvas', 'Six-panel, unstructured', 'Brass slide buckle', 'Ember bar-tack'],
    care: 'Spot clean only.',
  },
  {
    id: 'nightwatch-beanie',
    name: 'Nightwatch Beanie',
    price: 39,
    category: 'Accessories',
    flat: 'beanie',
    badge: 'Low stock',
    code: 'BSK-009',
    weight: 'One size',
    tagline: 'A thick fisherman-rib beanie with a deep cuff.',
    description:
      'Knitted in a heavy merino blend with a double-fold cuff. Sits short on the head, above the ears, ' +
      'or pulls down when it is actually cold.',
    colors: [{ name: 'Black', hex: '#141414' }, { name: 'Ember', hex: '#d9431c' }],
    sizes: ['One size'],
    details: ['Merino-blend fisherman rib', 'Double-fold cuff', 'Woven label at cuff'],
    care: 'Hand wash cold. Dry flat.',
  },
  {
    id: 'carrion-tote',
    name: 'Carrion Tote',
    price: 69,
    category: 'Accessories',
    flat: 'tote',
    code: 'BSK-010',
    weight: '18 L',
    tagline: 'A waxed canvas tote that takes a beating.',
    description:
      'Heavy waxed canvas with webbing handles long enough for the shoulder. ' +
      'One zip pocket inside, riveted stress points and a flat base that stands up on its own.',
    colors: [{ name: 'Black', hex: '#151515' }],
    sizes: ['One size'],
    details: ['Waxed cotton canvas', 'Webbing shoulder handles', 'Internal zip pocket', 'Riveted stress points'],
    care: 'Wipe clean with a damp cloth. Re-wax yearly.',
  },
];

export const CATALOG = [
  ...MODELLED.map((p) => ({ ...p, ...EXTRA[p.id] })),
  ...DEMO,
];

export const byId = (id) => CATALOG.find((p) => p.id === id);
export const HERO_PRODUCT = CATALOG.find((p) => p.model) || CATALOG[0];

export const FREE_SHIPPING_AT = 150;
