import http from 'node:http';
import {quoteShipping} from './shipping.mjs';
import { setTimeout as wait } from 'node:timers/promises';
import { ROOT_CONTEXT, context, trace, propagation } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { TracerProvider } from '@opentelemetry/sdk-trace';

context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
propagation.setGlobalPropagator(new W3CTraceContextPropagator());
const tracer = new TracerProvider().getTracer('checkout-lab');
const role = process.env.SERVICE;
const milliseconds = ([sec, ns]) => sec * 1000 + ns / 1e6;

// The replay stores a compact projection of each completed SDK span.
function finish(span) {
  span.end();
  return { name: span.name, ...span.spanContext(), parent: span.parentSpanContext?.spanId,
    start: milliseconds(span.startTime), ms: milliseconds(span.duration) };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const parent = propagation.extract(ROOT_CONTEXT, req.headers);
    const spans = await tracer.startActiveSpan(role, {}, parent, async root => {
      const children = [];
      if (role === 'checkout') {
        await tracer.startActiveSpan('validate cart', async child => {
          await wait(8);
          children.push(finish(child));
        });
        const headers = {};
        propagation.inject(context.active(), headers);
        const reply = await fetch(process.env.SHIPPING + '/quote' + url.search, {headers});
        if (!reply.ok) throw new Error('Shipping unavailable');
        children.push(...await reply.json());
      } else {
        await quoteShipping(url.searchParams.get('phase'), url.searchParams.get('lane'));
      }
      return [finish(root), ...children];
    });
    res.writeHead(200, {'content-type':'application/json'}).end(JSON.stringify(spans));
  } catch (error) {
    res.writeHead(500).end(error.message);
  }
});
server.listen(Number(process.env.PORT || 0), process.env.HOST || '127.0.0.1', () => {
  process.send?.(server.address().port);
});
