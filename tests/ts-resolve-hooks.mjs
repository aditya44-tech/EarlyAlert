/**
 * tests/ts-resolve-hooks.mjs
 *
 * Node test-runner hook: allows the test suite to import the app's TypeScript
 * sources whose internal relative imports are written without extensions
 * (e.g. `import ... from './types'`), by retrying resolution with `.ts`.
 *
 * It also maps Next.js bare sub-path imports (`next/server`) to their real ESM
 * entry (`next/server.js`) so route handlers can be imported and unit-tested in
 * plain Node.
 */
const NEXT_SUBPATHS = ['server', 'headers', 'navigation', 'router', 'cache', 'image', 'link', 'font', 'script', 'dynamic'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isRelative = /^\.\.?\//.test(specifier);
    const isNextBare = /^next\/[a-z-]+$/.test(specifier) && !specifier.endsWith('.js');
    if ((err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_RESOLVE')) {
      if (isRelative) {
        try {
          return await nextResolve(`${specifier}.ts`, context);
        } catch {
          // fall through to original error
        }
      }
      if (isNextBare && NEXT_SUBPATHS.some(p => specifier === `next/${p}`)) {
        try {
          return await nextResolve(`${specifier}.js`, context);
        } catch {
          // fall through to original error
        }
      }
    }
    throw err;
  }
}
