import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const input = 'src/formulae.js';

export default [
  // ES Module
  {
    input,
    plugins: [resolve(), commonjs()],
    output: {
      file: 'dist/formulae.esm.js',
      format: 'esm',
    },
  },
  // CommonJS
  {
    input,
    plugins: [resolve(), commonjs()],
    output: {
      file: 'dist/formulae.cjs.js',
      format: 'cjs',
    },
  },
  // UMD (minified afterwards)
  {
    input,
    plugins: [resolve(), commonjs()],
    output: {
      file: 'dist/formulae.min.js',
      format: 'umd',
      name: 'FormulaArithmetic',
    },
  },
];
