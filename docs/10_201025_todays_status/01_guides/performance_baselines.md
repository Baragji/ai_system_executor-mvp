% Performance Baselines & Checks

Capture baseline metrics to detect regressions during refactoring. Keep measurements lightweight and repeatable.

## What to capture

- Service boot time (cold start)
- Memory footprint at idle
- Monolith request latency with flags OFF vs ON for each proxy (smoke level)

## How to measure

### Service boot time
- Command:
  - Start service: `time npm start` (from `services/<svc>`)
  - Health check: `curl -w "time_total=%{time_total}\n" -fsS http://localhost:<port>/healthz -o /dev/null`
- Record: `boot_time_ms`, `healthz_time_total`

### Memory footprint at idle
- Command (macOS/Linux):
  - `ps -o pid,ppid,rss,vsz,comm | rg "node .*<svc>"`
- Record: `rss_kb`, `vsz_kb`

### Monolith request latency (flags OFF vs ON)
- Command:
  - OFF: `curl -w "time_total=%{time_total}\n" -fsS http://localhost:3000/api/execute -H 'Content-Type: application/json' -d @tests/fixtures/simple-execute.json -o /dev/null`
  - ON: set `USE_<SERVICE>=1` and rerun the same request
- Record: `latency_off_s`, `latency_on_s`

## Where to record results

- Append results to this file under a dated section per service
- Summarize in PR descriptions for batches that affect performance

## Baseline template (copy/paste)

```
### <YYYY-MM-DD> — <service or monolith>
- boot_time_ms: <number>
- healthz_time_total: <seconds>
- rss_kb: <number>
- vsz_kb: <number>
- latency_off_s: <seconds> (if applicable)
- latency_on_s: <seconds> (if applicable)
Notes: <context, flags, hardware>
```

