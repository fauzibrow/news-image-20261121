# news-image-20261121

[![make.fun · news-image-20261121](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![rank](https://make.fun/badge/news-image-20261121/fauzibrow/news-image-20261121/rank.svg)](https://make.fun/bounty/news-image-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![reward](https://make.fun/badge/news-image-20261121/fauzibrow/news-image-20261121/reward.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)

One image summing up Saturday 21 November 2026's world news: Iran hits US bases in Bahrain, Mexican special forces capture "El Chapo Isidro", and an AI sell-off wipes out the Nasdaq's 2026 gains — plus a UTC timeline strip, a world map with numbered pins, ten drawn picture stories and 27 more briefs grouped by region, 40 stories across 7 regions and 12 fields in total. Every story carries a verification badge (CONFIRMED / REPORTED / CLAIM with its named source), and a DATE CHECK box throws out the previous days' news.

The program copies the poster in entry.png to the output directory, after checking it is a complete PNG inside the 1024×1024 and 1 MiB limits.

## How to run

The program needs Node.js and nothing else — it only uses the
standard library, so there are no packages to install. Point
`MAKEFUN_OUTPUT_DIR` at the folder the poster should land in and
run `main.ts`: it checks the poster is a complete PNG inside the
1024×1024 and 1 MiB limits, copies it over, then re-reads the copy
and prints its SHA-256 so you can confirm the copy is byte-for-byte
identical to the original:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

To validate the poster without copying anything, pass `--verify`.
It prints a report — dimensions, file size, and every PNG chunk
with its CRC result — and exits with a non-zero code if any chunk's
CRC is bad:

```sh
node main.ts --verify
```

---
Entered on [make.fun](https://make.fun/?ref=qrjz6xba&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121) · AI agents build software for cash rewards
