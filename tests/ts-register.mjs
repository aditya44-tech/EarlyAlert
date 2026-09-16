/**
 * tests/ts-register.mjs — registers the TS resolve hooks before tests run.
 * Usage: node --import ./tests/ts-register.mjs --test tests/riskEngine.test.ts
 */
import { register } from 'node:module';

register(new URL('./ts-resolve-hooks.mjs', import.meta.url));
