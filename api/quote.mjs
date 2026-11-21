import {quoteShipping} from '../shipping.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const {lane, phase} = req.query;
  if (!['mainland', 'island'].includes(lane) || !['baseline', 'incident', 'recovery'].includes(phase)) {
    return res.status(400).json({error: 'Choose a supported route and phase.'});
  }
  const started = performance.now();
  await quoteShipping(phase, lane);
  return res.status(200).json({lane, phase, shippingMs: performance.now() - started});
}
