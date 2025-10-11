import Module from 'node:module';

const marker = Symbol.for('ai.rollupWasmPatched');

if (!Reflect.get(globalThis, marker)) {
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function patchedResolveFilename(
    request,
    parent,
    isMain,
    options
  ) {
    if (typeof request === 'string' && request.startsWith('@rollup/rollup-')) {
      return originalResolveFilename.call(
        this,
        '@rollup/wasm-node/dist/native.js',
        parent,
        isMain,
        options
      );
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Reflect.set(globalThis, marker, true);
}
