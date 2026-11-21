# Follow one checkout from request to replay

Open [the replay](https://checkout-incident-lab.vercel.app), select Incident and choose the first orange tile. It is order 025. Keep that order selected as you switch between phases.

## The question

Could a team see 100 successful checkouts and a fast overall p95 while every shopper on a small shipping route experiences a delay? This lab fixes the traffic mix so you can isolate that one question. Mainland and island are synthetic labels. No external shipping company or customer is involved.

## Follow the request

1. The recorder sends a GET request for a synthetic cart. It supplies the route and experimental phase. Using a GET keeps this timing exercise reproducible. A payment system would need different semantics.
2. Checkout creates the root OpenTelemetry span. A span records the start, end and identity of one operation. Checkout creates a shorter span while it validates the cart.
3. Checkout then calls the shipping process over HTTP. It injects trace context into the outgoing headers. Shipping extracts the context and makes its span a child of checkout. The shared trace ID joins the records. Parent and span IDs establish who called whom.
4. Shipping waits for a controlled timer. The 25th, 50th, 75th and 100th orders use the island route. Only those orders during the incident take the slow branch.
5. Shipping returns its completed span projection. Checkout returns all three spans to the recorder. In this small lab, spans travel back in the response body so you can reproduce it without a collector. In a deployed service you could export spans separately through OTLP and keep telemetry outside customer responses.
6. The recorder checks the HTTP status and trace relationships, then writes the captured orders to JSON. The static site reads that file. The browser calculates the percentile, colors each tile by a 200 ms threshold and draws each span using measured time. Moving between phases compares the same position in three separate runs.

Read [the services](./service.mjs), [the recorder](./record.mjs) and [the browser implementation](./public/app.js) in that order.

## Explain the numbers at the screen

Order 025 took about 639 ms during the incident. Around 624 ms elapsed inside shipping. The checkout bar includes the shipping bar, so adding them would count the shipping time twice. In recovery, shipping took about 14 ms and checkout took about 30 ms. The intervention was removing the injected delay. The lab demonstrates attribution and recovery from a known fault.

To calculate nearest-rank p95, sort the 100 durations from fastest to slowest and read position 95. With 96 fast requests and four slow ones, position 95 is fast. All four slow orders still returned HTTP 200. Success answers whether a request finished successfully. Latency answers how long the shopper waited. An alert on either errors or this overall p95 alone would miss this incident if the latency threshold were 200 ms.

## Run it and make your own prediction

In a fresh clone, install dependencies and capture a new run.

```sh
npm ci
npm run record
```

The terminal prints each phase's p95 and maximum. Exact milliseconds will vary. To inspect the next run visually, serve the public directory locally. On Windows with Python installed, run `py -m http.server 8080 --bind 127.0.0.1 --directory public` and visit `http://127.0.0.1:8080`.

**First exercise.** In the recorder, change `n % 25 === 0` to `n % 20 === 0`. Predict what happens to p95 when exactly five orders are slow. Run it. Next change the condition to `n <= 6` and predict again. With five slow orders position 95 stays fast. With six, position 95 is slow, assuming both groups stay separated. The second edit also changes where the affected orders occur. For a cleaner follow-up experiment, compare `n <= 5` and `n <= 6` directly. Write down the two measured results. Make these edits in a local branch so the published replay stays tied to its original workload.

**Second exercise.** Examine the four island traces in recovery. Explain why a 12 ms timer might produce a 14 ms span. A timer sets a minimum wait and the event loop still has to resume the handler. Change the simulated cart validation delay and see which bars move.

## Questions an engineer may ask

- **Why run locally?** It gives repeatable inputs and lets visitors inspect evidence after the services stop. Vercel hosts the static replay. The benchmark ran on a local machine.
- **Why eight warmups?** They exercise both processes and their connection before measurement. Eight was a design choice. Varying it would help assess sensitivity to startup effects.
- **Can this measure capacity?** The recorder sends one request at a time. To study capacity you would introduce controlled concurrency and measure offered traffic, saturation, queueing, failures and client-observed latency.
- **What would you monitor next?** Try the share of orders completing within a shopper-facing target, then break down that share by shipping route. A route with four samples carries considerable statistical uncertainty. Inspect sample counts and individual traces alongside its percentile.
- **What did you build on?** The OpenTelemetry demo supplied the idea of a regional slowdown. This project's contribution is the controlled traffic mix, captured three-phase workload and interactive public investigation. The use of a coding assistant is part of how this implementation was produced. The experiments you run and the decisions you can defend are yours to describe.

