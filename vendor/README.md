# vendor/motion.js

Browser ESM bundle of [motion](https://motion.dev) 14.9.1 (MIT), so the site can use it without a build step.
It only contains what the homepage uses: `animate` (the small WAAPI version from `motion/mini`) and `scroll`, for the scroll-linked hero. About 16 KB minified, 7 KB gzipped.

To rebuild after `npm install motion`:

```sh
echo 'export { animate } from "motion/mini"; export { scroll } from "motion";' > .e.mjs
npx esbuild ./.e.mjs --bundle --format=esm --minify --target=es2020 --outfile=vendor/motion.js
rm .e.mjs
```
