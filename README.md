# Curling Clash

Version: `v0.2.7`

Browser-based curling game (mobile-first, portrait layout) using:
- Tailwind CSS for UI
- three.js for rendering + custom stone physics/collision simulation

Release notes:
- `/Users/sean/Documents/CODE/Curling/RELEASE_NOTES.md`

## Run
Because this uses ES modules, serve it over HTTP:

```bash
cd /Users/sean/Documents/CODE/Curling
python3 -m http.server 5173
```

Open:
- [http://localhost:5173](http://localhost:5173)

## Gameplay implemented
- New Game overlay:
  - 1P vs AI (default) or 2-player hotseat
  - Top 8 curling countries with flags
  - Match length: 3, 5, or 10 ends
- Traditional structure:
  - 8 stones per side, alternating shots
  - Hammer tracking and end-to-end carry-over
  - End scoring in the house based on closest stone and counters
- Shot flow:
  - Position selection at hack (slide left/right)
  - Power meter selection
  - Slow delivery phase to release line with live curl control (signed slider; center = straight)
  - Camera transitions from start to follow view
  - Sweeping pad (swipe speed lowers friction)
- Physics:
  - Stone-on-ice friction with sweeping reduction
  - Curl force that grows later in the run
  - Elastic-ish stone collisions with contact resolution
  - Side-board interaction and out-of-play removal checks

## Notes
- Stone handles are red (P1) and yellow (P2), with visual spin during curl.
- Rink is rendered as a standard curling sheet with center line, hog lines, houses, and back lines.
