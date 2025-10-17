import Module from 'node:module';

const marker = Symbol.for('ai.rollupWasmPatched');

if (!Reflect.get(globalThis, marker)) {
  const originalResolveFilename = Module._resolveFilename;
  const require = Module.createRequire(import.meta.url);
  let wasmTarget;

  try {
    wasmTarget = require.resolve('@rollup/wasm-node/dist/native.js');
  } catch {
    wasmTarget = undefined;
  }

  Module._resolveFilename = function patchedResolveFilename(
    request,
    parent,
    isMain,
    options
  ) {
    if (
      wasmTarget &&
      typeof request === 'string' &&
      request.startsWith('@rollup/rollup-')
    ) {
      return wasmTarget;
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Reflect.set(globalThis, marker, true);
}
