import { fork } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const children = [];
async function start(service, extra = {}) {
  const child = fork(new URL('./service.mjs', import.meta.url), [], {
    env: {...process.env, PORT:'0', HOST:'127.0.0.1', SERVICE:service, ...extra}
  });
  children.push(child);
  const [port] = await once(child, 'message');
  return 'http://127.0.0.1:' + port;
}
const run = {recorded:new Date().toISOString(), runtime:process.version, phases:{}};
try {
  const endpoint = process.env.CHECKOUT || await start('checkout', {SHIPPING:await start('shipping')});
  async function order(lane, phase) {
    const reply = await fetch(endpoint + '/checkout?lane=' + lane + '&phase=' + phase);
    assert.equal(reply.status, 200);
    const spans = await reply.json();
    assert.equal(spans.length, 3);
    for (const child of spans.slice(1)) {
      assert.equal(child.traceId, spans[0].traceId);
      assert.equal(child.parent, spans[0].spanId);
    }
    return {lane, status:reply.status, spans};
  }
  for (let n = 0; n < 8; n++) await order('mainland','warmup');
  for (const phase of ['baseline','incident','recovery']) {
    const orders = [];
    for (let n = 1; n <= 100; n++) {
      orders.push(await order(n % 25 === 0 ? 'island' : 'mainland', phase));
    }
    run.phases[phase] = orders;
    const times = orders.map(o => o.spans[0].ms).sort((a,b)=>a-b);
    console.log(phase, 'p95', times[94].toFixed(1), 'ms; max', times[99].toFixed(1));
  }
  await writeFile(new URL('./public/run.json', import.meta.url), JSON.stringify(run));
} finally {
  for (const child of children) child.kill();
}
