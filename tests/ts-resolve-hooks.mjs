/**
 * tests/ts-resolve-hooks.mjs
 *
 * Node test-runner hook: allows the test suite to import the app's TypeScript
 * sources whose internal relative imports are written without extensions
 * (e.g. `import ... from './types'`), by retrying resolution with `.ts`.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isRelative = /^\.\.?\//.test(specifier);
    if (isRelative && (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_RESOLVE')) {
      try {
        return await nextResolve(`${specifier}.ts`, context);
      } catch {
        // fall through to original error
      }
    }
    throw err;
  }
}
