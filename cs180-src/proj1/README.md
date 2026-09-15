# CS 180 project 0

Built from [RomanHauksson/academic-project-astro-template](https://github.com/RomanHauksson/academic-project-astro-template).
No CI here — build locally and commit the static output.

Edit the content in [`./src/paper.mdx`](./src/paper.mdx). Preview with:

```bash
npm install
npm run dev
```

Open `http://localhost:4321` to see a live preview.

When ready, build then copy the static output into the served path (`cs180/proj0/` at the repo
root — note: setting `outDir` to point directly outside the project root breaks Astro's image
cache, so build to the default `dist/` and copy):

```bash
npm run build
rm -rf ../../cs180/proj0/* && cp -r dist/. ../../cs180/proj0/
```

Then commit the updated `cs180/proj0/` output along with any source changes here.

## Adding another project

1. Copy this whole folder: `cp -r cs180-src/proj0 cs180-src/proj1`.
2. In `cs180-src/proj1/astro.config.ts`, bump `base` from `proj0` to `proj1`.
3. Update the title/description/`<Header>` props in `src/paper.mdx`.
4. `cd cs180-src/proj1 && npm install && npm run build && rm -rf ../../cs180/proj1/* && mkdir -p ../../cs180/proj1 && cp -r dist/. ../../cs180/proj1/`.
5. Downsize a representative screenshot into `cs180/mini/proj1Mini.jpg` (matches the site's
   existing thumbnail convention in `projects/mini/` — small JPEG, ~800px wide, so the grid stays
   light), e.g.: `magick some-screenshot.png -resize 800x -quality 70 cs180/mini/proj1Mini.jpg`.
6. Add a card for it in `cs180/cs180-data.js` pointing `img` at `mini/proj1Mini.jpg` and `href` at `proj1/`.
