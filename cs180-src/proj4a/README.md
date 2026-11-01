# CS 180 project 2

Built from [RomanHauksson/academic-project-astro-template](https://github.com/RomanHauksson/academic-project-astro-template).
No CI here — build locally and commit the static output.

Edit the content in [`./src/paper.mdx`](./src/paper.mdx). Preview with:

```bash
npm install
npm run dev
```

Open `http://localhost:4321` to see a live preview.

When ready, build then copy the static output into the served path (`cs180/proj2/` at the repo
root — note: setting `outDir` to point directly outside the project root breaks Astro's image
cache, so build to the default `dist/` and copy):

```bash
npm run build
rm -rf ../../cs180/proj2/* && cp -r dist/. ../../cs180/proj2/
```

Then commit the updated `cs180/proj2/` output along with any source changes here.

## Adding another project

Full checklist (including the project folder side) lives in the site repo at
`.claude/CLAUDE.md`. Short version:

1. `rsync -a --exclude node_modules --exclude dist --exclude .astro --exclude .DS_Store --exclude 'src/assets/*' cs180-src/projN/ cs180-src/projM/`
2. In `astro.config.ts` bump `base`, in `package.json` and `package-lock.json` bump the name.
3. Reset `src/paper.mdx` to a headings-only skeleton, delete `public/screenshot-*.png`.
4. `npm install`, then `npm run dev` to preview.
5. Only after review: build, copy `dist/` into `cs180/projM/`, add a thumbnail to `cs180/mini/`, add a card
   in `cs180/cs180-data.js`, commit.
