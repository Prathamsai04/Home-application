/**
 * Mulberry32 pseudo random generator. Given the same seed it always produces
 * the same sequence, which keeps demo data identical across serverless
 * instances, cold starts and test runs.
 */
export function createRandom(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    chance(probability) {
      return next() < probability;
    },
    digits(count) {
      let out = '';
      for (let i = 0; i < count; i += 1) out += String(Math.floor(next() * 10));
      return out;
    },
  };
}
