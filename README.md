# Slip 025

A visitor can investigate one of 100 checkout requests and follow its trace into shipping. Built for Faizan's public cloud and DevOps field notes.

[Try the recorded incident](https://checkout-incident-lab.vercel.app) ? [Follow one checkout through the code](./WALKTHROUGH.md) ? [Watch the launch film](./launch/slip-025-launch.mp4)

## Reproduce the experiment

Use Node.js 22 or newer. Run `npm ci`, then `npm run record`. The recorder starts two loopback HTTP services, runs eight warmups, captures 300 orders, checks parent/child trace propagation, and closes both services. Each run replaces `public/run.json`. Serve the public directory with any static web server.

To use containers, run `docker compose up --build -d`. In PowerShell set `$env:CHECKOUT='http://127.0.0.1:8000'` and run `npm run record`. Finish with `docker compose down` and `Remove-Item Env:CHECKOUT`.

## What was measured

The same sequential workload runs in baseline, incident and recovery. Every 25th checkout uses the island lane. The shipping service injects a 620 ms timer on that lane during the incident. Otherwise its timer is 12 ms. Cart validation has an 8 ms timer throughout. Node scheduler overhead, HTTP overhead and machine load affect actual timings. The checkout span measures server-side handling through receipt of the shipping response. It excludes the final response write and client network time.

During the published local run, all 100 incident orders succeeded. The nearest-rank p95 was 31.4 ms. Four checkouts crossed the lab target of 200 ms. Checkout 025 took 639 ms, including 624 ms inside shipping. In recovery the same order position took 30 ms. The sample demonstrates a percentile blind spot under a deliberately chosen traffic mix. It does not estimate customer traffic or production capacity.

## Design references

The regional fault was inspired by the [OpenTelemetry demo feature flags](https://opentelemetry.io/docs/demo/feature-flags/). The services, workload, replay and recorded dataset were built for this experiment. [Google's SRE Workbook](https://sre.google/workbook/monitoring/) discusses latency distributions and raw measurements. Trace propagation uses the [OpenTelemetry JavaScript SDK](https://github.com/open-telemetry/opentelemetry-js).

## Next experiment

At what traffic share would overall p95 first expose the slow lane? Repeat with five and six affected requests per hundred while keeping the rest of the workload fixed.

## Public demo

The 25-second player has five chapters. Pause the run, jump to a chapter, or drag the timeline backward to reconstruct the request grid and trace from the same captured data. The playback interaction was inspired by [Anshu's Run Rewind](https://ecliptix-ui.101xanshu.com/components/run-rewind). This implementation uses browser JavaScript and the checkout experiment's recorded measurements.

Select **Run experiment** to issue three fresh shipping requests on Vercel. Select Mainland to repeat on the unaffected route. The function times the shared shipping routine on the server. Use the recorded lab for the full distributed checkout trace.
