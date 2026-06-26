# Luxe Roads

Production-quality homepage mockup for Luxe Roads, a premium Australian luxury campervan road-trip brand.

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Replacing placeholder imagery

The homepage uses typed image references in `src/data/luxeRoads.ts`. Each image points to `/assets/images/luxe-roads/*` and has a CSS gradient fallback, so missing assets do not break the layout.

To replace placeholders, add final optimised JPG or WebP files to `public/assets/images/luxe-roads/` using the filenames listed in `public/assets/images/luxe-roads/README.md`. Update the `src`, `alt`, and `variant` fields in `src/data/luxeRoads.ts` only if the filenames or subject matter change.

The supplied design mockups are used as visual references only. They are not embedded in the homepage.

## Content notes

Example testimonials are labelled as demo content. The page avoids unsupported legal, insurance, review-count, rating, or accreditation claims until verified proof and final copy are provided.
