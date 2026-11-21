import {setTimeout as wait} from 'node:timers/promises';

export async function quoteShipping(phase, lane) {
  const delayed = phase === 'incident' && lane === 'island';
  await wait(delayed ? 620 : 12);
}
