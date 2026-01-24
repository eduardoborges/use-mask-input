import { defineConfig } from "tsup";

const args = process.argv.slice(2);

export default defineConfig({
  entry: ["src/index.tsx"],
  outDir: "dist",
  format: ["esm", "cjs"],
  target: "es2022",
  external: ["react", "react-dom"],
  dts: true,
  sourcemap: true,
  noExternal: ["inputmask"],
  treeshake: true,
  splitting: true,
  clean: true,
  bundle: true,
  watch: args.includes("--watch"),
});
