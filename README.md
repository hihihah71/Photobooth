# Photobooth

A frontend-only photobooth web app. Pick a frame, snap or upload photos, and compose them into a downloadable image. Mobile-first. Photos stay on the device unless the user explicitly creates a Cloudinary share link.

Built with Vite 7 + React 19 + TypeScript.

## Quick start

```bash
npm install
npm run dev                   # camera works on localhost
npm run dev -- --host        # LAN UI/upload testing; phone camera requires HTTPS
npm run lint
npm run test
npm run build && npm run preview
```

## QR sharing with Cloudinary

The Share button uploads the finished photo using a Cloudinary unsigned upload preset, then displays a download link and QR code for phones.
Share uploads larger than 3 MB are automatically converted to a high-quality JPEG and, only if necessary, proportionally resized to stay around 3 MB for faster mobile downloads. The original local Gallery/Download image is not changed.

1. Create an unsigned upload preset in Cloudinary.
2. Restrict the preset to image formats such as PNG/JPEG/WebP and configure a dedicated asset folder.
3. Copy `.env.example` to `.env.local` and set:

```bash
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
```

For GitHub Pages, add the same values as repository variables and expose them to the build step. The preset name is necessarily visible in a browser build, so keep its permissions restricted and rotate it if abused.

## How it's organized

```
src/
  App.tsx                shell: reducer + screen switch
  config/frames.ts       frame definitions : edit here to add new ones
  types/                 shared TS types
  state/                 reducer for the main flow
  screens/               Home / Capture / Adjust / Preview / Gallery
  components/            shared UI building blocks
  hooks/                 useCamera, useSlotTransform, useGallery, ...
  utils/                 composite, storage (IndexedDB), download, ...
  styles/animations.css  CSS keyframes + animation classes
  assets/frames/         frame overlay + thumbnail assets
```

## Adding a frame

1. Drop overlay and thumbnail images into `src/assets/frames/` (PNG or SVG).
2. Append a `FrameConfig` to `frames` in `src/config/frames.ts`.
3. Each frame declares its own output dimensions and slot rectangles (in output-pixel coordinates), so frames with 1, 3, 4, or N slots all work the same way.

## Custom animations

- Define new `@keyframes` and a matching class in `src/styles/animations.css`.
- Reference it from a frame's `revealAnimation` (e.g. `revealAnimation: 'my-anim'`) or `className`.
- Global timing variables `--anim-fast`, `--anim-base`, `--anim-slow` live on `:root` for shared tuning.

## Privacy

Privacy is a first-class feature here:

- **No photo upload by default.** A finished photo is uploaded to Cloudinary only after the user presses Share.
- **All photos and gallery data live in the browser** on the user's device, in IndexedDB (`photobooth.photos`). Clearing browser data for the site wipes them.
- **Shared photos become link-accessible.** Anyone with the generated URL or QR code can access the uploaded Cloudinary image.
- Local storage is capped at 100 photos / 250 MB and 20 custom frames / 100 MB to keep long-running sessions responsive.
- **Camera stream is explicitly stopped** the moment the user leaves the capture screen : the device indicator light turns off immediately.
- A privacy banner on the Home screen and a header note on the Gallery screen make this explicit to the user.
- Delete confirmations spell out that deletions are permanent.

## Roadmap (future phases)

- Filters / color grading
- Drag-and-drop upload from desktop
- PWA / offline install
- i18n
