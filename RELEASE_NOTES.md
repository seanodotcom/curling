# Curling Clash Release Notes

## v0.2.7 (2026-02-16)
- Improved mobile HUD readability: compacted labels (`1/1`, `Stone X/Y`) and removed redundant "End complete" phrasing in the top status copy.
- Improved mobile camera framing so active stones stay clearer above the bottom control panel during setup and throw tracking.
- Updated end-review messaging so "Hammer carries over." is not shown on the final end.
- Updated Curl Control guidance copy from "maximum curl" to "max curl".

## v0.2.6 (2026-02-15)
- Hid/faded top HUD and sound toggle in House/Strategy view so stones remain visible.
- Tuned back wall impact to heavily deaden rebounds and reduce disruptive bounce-back.

## v0.2.5 (2026-02-15)
- Smoothed full-shot camera tracking with improved zoom behavior through release, mid-throw, and approach.
- Delayed stone handle spin until after the near hog line and faded sweeping UI in at the correct timing.
- Added sweep guidance UX (pulse reminder) when players do not sweep shortly after crossing hog.
- Added out-of-bounds marker icon above invalid stones.
- Updated strategy/House view framing and sweeper proximity to the active stone.
- Redesigned sweeper visual proportions (shorter/thicker handle, refined brush head shape and sizing).

## v0.2.4 (2026-02-15)
- Updated New Game labels: `United States` to `USA`, and `STONES / TEAM` to `STONES / ROUND`.
- Adjusted start-of-throw camera so players can clearly see the stone at release setup.

## v0.2.3 (2026-02-15)
- Renamed app to `Curling Clash!` in page title and New Game header.
- Updated New Game version subhead and improved power slider visual feedback.
- Fixed power-step button alignment in the throw setup UI.

## v0.2.2 (2026-02-15)
- Fixed Scotland flag rendering issue.
- Disabled text selection during gameplay.
- Disabled page scrolling and pinch zoom behavior for a game-first mobile interaction.

## v0.2.1 (2026-02-15)
- Improved mobile audio behavior for iOS/Android playback compatibility.

## v0.2 (2026-02-15)
- Expanded gameplay realism: friction/curl/restitution tuning, improved collisions, and reduced unrealistic wall behavior.
- Added/iterated turn flow UX, including throw gating, sweep control behavior, and clearer shot setup states.
- Added/iterated invalid stone states (wall/back-line hits), flashing alerts, and turn-to-turn cleanup rules.
- Improved score/round presentation and end-of-round board review flow with explicit progression control.
- Added richer game-end experience with winner treatment, flag celebration, and confetti.
- Added AI throw speed controls and broader mobile/desktop UI refinements.
- Added sound system foundation (glide/sweep/collision) with user sound toggle.

## v0.1 (2026-02-15)
- Initial playable browser release.
- Mobile-first portrait curling game using Tailwind CSS and three.js.
- New Game overlay with team selection, match mode (1P vs AI or 2P), and end count selection.
- Core throw flow: alignment, power, curl selection, camera transitions, and sweeping input.
- Stone physics and collisions, house scoring, alternating turns, and hammer logic.
