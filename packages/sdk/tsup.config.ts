import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  // viem is a peer dep + the types package is bundled separately by its
  // own tsup pipeline; keep both external so we don't double-bundle.
  external: ['viem', '@atlasnexus/aijobs-types'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
