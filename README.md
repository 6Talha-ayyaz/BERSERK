# 3D Boutique Storefront (React)

A storefront where the featured products hang on the rails of a 3D boutique. Built with **React 18 + Vite**, with **three.js** for the 3D scene.

- **Rest:** each piece hangs side-on, the way real stock hangs on a rail.
- **Hover:** the piece slides off the rail and swings round to show its front, with a spotlight and a price tag.
- **Click:** the camera flies in, the store lights dim and the product page opens around the piece. Drag to turn it 360°.
- **Back** (button, browser back, or Esc): the page folds away, the piece goes back on the rail and the camera returns to the aisle.

Every product has its own URL (`#/product/<id>`), so links can be shared, and back/forward work.

## Run it

```bash
npm install
npm run dev        # development server with hot reload → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build → http://localhost:4173
```

`dist/` is a plain static site: upload it to any host (Netlify, Vercel, GitHub Pages, S3, cPanel…). No server rewrites are needed because routes are hash-based.

## Add products

Everything lives in **`src/data/products.js`**:

1. **Optimise the model first** (see below), then put the `.glb` in `public/models/`.
2. Copy an entry, give it a unique `id` (used in the URL), set `model: 'models/<file>.glb'`, and fill in the copy, price, sizes and colours.
3. Change the brand name and collection headline in `STORE` at the top.

Products fill the rails in order: the right wall first (7 spots), then the left wall (3), the free-standing rack (2) and the back niche (2).

**Model checklist:** units in metres, garment front facing +Z. If a model comes in sideways or backwards, set `frontYaw` (for example `Math.PI`). If it comes in at the wrong size, set `scale`.

## Performance: always optimise models

Raw exports are far too heavy for the web (the original hoodie was 53 MB). Compress every model before adding it:

```bash
npx @gltf-transform/cli optimize source/my_model.glb public/models/my_model.glb \
  --compress meshopt --texture-compress webp --texture-size 2048
```

| Model | Original (`source/`) | Shipped (`public/models/`) |
| --- | --- | --- |
| Classic Black Flame Hoodie | 53.3 MB | 2.9 MB |
| Black Leather Coat | 4.2 MB | 0.5 MB |

Keep the full-size originals in `source/`. That folder is not deployed.

The scene also keeps itself smooth at runtime:
- Room shadows are drawn once instead of every frame (they're only redrawn while the doors move).
- Resolution starts at up to 1.75× and steps down automatically if the frame rate stays under ~45 fps.
- Hover picking uses invisible boxes, not the full garment meshes.

## Licence note on the sample hoodie

The sample hoodie is "Classic Black Flame Hoodie" by kril on Sketchfab, licensed **CC BY 4.0**. Its credit is shown on the product page through the `credit` field. Keep that credit while you use this model, and remove it once the client's own model replaces it.

## Files

| Path | What it is |
| --- | --- |
| `src/data/products.js` | **Store config and product catalog: edit this** |
| `src/App.jsx` | App shell: connects the URL, the 3D scene and the UI |
| `src/components/` | Loader, Header, StoreUI (headline + dock), HoverTag, ProductPage, Cursor, Toast |
| `src/three/storefront.js` | 3D engine: camera, hover/click physics, lighting, model loading |
| `src/three/room.js` | The boutique room geometry |
| `src/styles.css` | All styling, including the transition choreography |
| `public/models/` | Optimised `.glb` files served to visitors |
| `source/` | Original full-size models (not deployed) |
| `legacy/` | The previous plain-HTML version, kept for reference |

The bag is a front-end demo that stores items in the visitor's browser. Connect it to the client's checkout (for example Shopify or Stripe) before launch.
