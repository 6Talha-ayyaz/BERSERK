# BERSERK storefront

An animated storefront for BERSERK, built with **React 18 + Vite**, **Framer Motion** for the interface motion and **three.js** for the 3D pieces.

| Route | What it is |
| --- | --- |
| `#/` | Home: 3D hero piece in front of the wordmark, a product row that scrolls sideways, the creed, categories, showroom teaser |
| `#/shop` | The full range, with animated filters (`?c=Tops`), sorting (`?sort=low`), a grid-density switch and saved pieces (`?c=Saved`) |
| `#/product/<id>` | Product page: live 3D (drag to turn) or a line drawing, colour and size pickers, a buy bar that follows you down the page |
| `#/showroom` | The walk-in 3D boutique: pieces hang on rails, click one to open it |

Shared across all of them: a slide-in bag with a free-shipping meter, a search palette (`Ctrl/⌘ K` or `/`), saved pieces and a "recently viewed" list. All of that is kept in the visitor's browser.

## Run it

```bash
npm install
npm run dev        # development server with hot reload → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build → http://localhost:4173
```

`dist/` is a plain static site: upload it to any host (Netlify, Vercel, GitHub Pages, S3, cPanel…). No server rewrites are needed because routes are hash-based.

## Products

There are two lists:

- **`src/data/products.js`**: pieces that have a real 3D model. These appear everywhere, including on the rails of the showroom.
- **`src/site/catalog.js`**: the shop catalog. It takes the modelled pieces and adds the rest of the range. **Everything under `DEMO` in that file is placeholder stock** (names, prices and copy invented to fill the shop): replace it with the real range.

A product is pictured one of two ways:

- `model: 'models/<file>.glb'`: live 3D on its page, and a 360° turntable on its shop card that follows the pointer.
- `flat: 'tee' | 'crew' | 'bomber' | 'cargo' | 'short' | 'beanie' | 'cap' | 'tote'`: a line drawing from `src/site/flats.jsx`, filled with the selected colourway.

### Adding a 3D piece

1. **Optimise the model first** (see below), then put the `.glb` in `public/models/`.
2. Copy an entry in `src/data/products.js`, give it a unique `id` (used in the URL), set `model`, and fill in the copy, price, sizes and colours.
3. Add its `category`, `code` and `weight` to `EXTRA` in `src/site/catalog.js`.

**Model checklist:** units in metres, garment front facing +Z. If a model comes in sideways or backwards, set `frontYaw` (for example `Math.PI`). If it comes in at the wrong size, set `scale`. The showroom has 14 rail spots, filled in order.

### Always optimise models

Raw exports are far too heavy for the web (the original hoodie was 53 MB). Compress every model before adding it:

```bash
npx @gltf-transform/cli optimize source/my_model.glb public/models/my_model.glb --compress meshopt --texture-compress webp --texture-size 2048
```

| Model | Original (`source/`) | Shipped (`public/models/`) |
| --- | --- | --- |
| Classic Black Flame Hoodie | 53.3 MB | 2.9 MB |
| Black Leather Coat | 4.2 MB | 0.5 MB |

Keep the full-size originals in `source/`. That folder is not deployed.

## Before launch

- **Checkout is not connected.** The bag is a front-end demo; the Checkout button says so. Connect it to the real checkout (for example Shopify or Stripe).
- **The newsletter form does not send anywhere.** Wire it to a mailing service.
- **Replace the demo stock** in `src/site/catalog.js`.
- Shipping threshold and returns copy (`FREE_SHIPPING_AT` in `src/site/catalog.js`, plus the text in the header ticker, footer and product page) are placeholders too.

## Licence note on the sample hoodie

The sample hoodie is "Classic Black Flame Hoodie" by kril on Sketchfab, licensed **CC BY 4.0**. Its credit is shown on the product page through the `credit` field. Keep that credit while you use this model, and remove it once the client's own model replaces it.

## Files

| Path | What it is |
| --- | --- |
| `src/data/products.js` | Store config and the pieces that have 3D models |
| `src/site/catalog.js` | **Shop catalog (includes the demo stock): edit this** |
| `src/site/Site.jsx` | App shell: routes, page transitions, preloader |
| `src/site/pages/` | Home, Shop, Product |
| `src/site/components/` | Header, bag drawer, search palette, product card, product pictures, cursor, preloader, footer |
| `src/site/ui.jsx` | Motion building blocks: rising headlines, reveals, magnetic buttons, marquee, counters |
| `src/site/store.jsx` | Bag, saved pieces and recently viewed |
| `src/site/three/models.js` | Model loading, the live product viewer and the card turntables |
| `src/site/flats.jsx` | The line drawings |
| `src/site/site.css` | All storefront styling. Colours and fonts are the variables at the top |
| `src/showroom/` | The 3D boutique (its own engine, UI and stylesheet); loaded only when opened |
| `public/models/` | Optimised `.glb` files served to visitors |
| `legacy/` | The earlier plain-HTML version, kept for reference |

Motion respects the visitor's "reduce motion" setting: the pinned sideways scroll, marquee and cursor switch off, and transitions become fades.
