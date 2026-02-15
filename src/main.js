import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const COUNTRIES = [
  { code: "CAN", name: "Canada", flag: "🇨🇦" },
  { code: "SWE", name: "Sweden", flag: "🇸🇪" },
  { code: "SUI", name: "Switzerland", flag: "🇨🇭" },
  { code: "SCO", name: "Scotland", flag: "🏴" },
  { code: "USA", name: "United States", flag: "🇺🇸" },
  { code: "NOR", name: "Norway", flag: "🇳🇴" },
  { code: "JPN", name: "Japan", flag: "🇯🇵" },
  { code: "ITA", name: "Italy", flag: "🇮🇹" }
];

const SHEET_WIDTH = 4.75;
const SHEET_LENGTH = 45.72;
const HALF_LENGTH = SHEET_LENGTH / 2;
const STONE_RADIUS = 0.145;
const STONE_HEIGHT = 0.115;
const MAX_HACK_X = 1.7;
const STONE_OPTIONS = [1, 4, 8, 16];
const DEFAULT_STONES_PER_SIDE = 16;

const HACK_Y = -20.3;
const RELEASE_LINE_Y = -10.0;
const FAR_HOG_Y = 10.0;
const TEE_Y = 20.0;
const BACK_LINE_Y = 22.4;
const HOUSE_RADIUS = 1.83;

const G = 9.81;
const BASE_MU = 0.0142;
const MIN_SHOT_SPEED = 1.55;
const MAX_SHOT_SPEED = 3.1;
const DELIVERY_SPEED = 1.2;
const POWER_CURVE = 1.55;
const CURL_COEFFICIENT = 0.13;
const CURL_DEAD_ZONE = 0.06;
const STOP_SPEED = 0.012;
const LOW_SPEED_SETTLE = 0.09;
const HANDLE_IDLE_ROTATION_SPEED = 0.11;
const TURN_RESOLVE_DELAY_MS = 1500;
const SIDEWALL_DEFAULT_COLOR = 0x1f2937;
const SIDEWALL_ALERT_COLOR = 0xdc2626;
const SIDEWALL_HIT_MARGIN = 0.03;
const BACKWALL_HIT_MARGIN = 0.035;

const SIDE_COLORS = [0xdc2626, 0xfacc15];
const SIDE_TEXT = ["P1", "P2"];
const FLAG_COLOR_PALETTE = {
  CAN: ["#dc2626", "#ffffff"],
  SWE: ["#1d4ed8", "#facc15"],
  SUI: ["#dc2626", "#ffffff"],
  SCO: ["#1d4ed8", "#ffffff"],
  USA: ["#dc2626", "#1d4ed8", "#ffffff"],
  NOR: ["#dc2626", "#1d4ed8", "#ffffff"],
  JPN: ["#dc2626", "#ffffff"],
  ITA: ["#16a34a", "#ffffff", "#dc2626"]
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const powerPctToSpeed = (pct) =>
  MIN_SHOT_SPEED + (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * Math.pow(clamp(pct, 0, 1), POWER_CURVE);
const speedToPowerPct = (speed) =>
  Math.pow(clamp((speed - MIN_SHOT_SPEED) / (MAX_SHOT_SPEED - MIN_SHOT_SPEED), 0, 1), 1 / POWER_CURVE);
const sanitizeStonesPerSide = (value) => (STONE_OPTIONS.includes(value) ? value : DEFAULT_STONES_PER_SIDE);

const el = {
  canvas: document.getElementById("game-canvas"),
  endLabel: document.getElementById("end-label"),
  shotLabel: document.getElementById("shot-label"),
  statusLabel: document.getElementById("status-label"),
  turnLabel: document.getElementById("turn-label"),
  team0Label: document.getElementById("team0-label"),
  team1Label: document.getElementById("team1-label"),
  score0Label: document.getElementById("score0-label"),
  score1Label: document.getElementById("score1-label"),
  stones0Icons: document.getElementById("stones0-icons"),
  stones1Icons: document.getElementById("stones1-icons"),
  messageOverlay: document.getElementById("message-overlay"),
  messageTitle: document.getElementById("message-title"),
  messageBody: document.getElementById("message-body"),

  positionControls: document.getElementById("position-controls"),
  positionSlider: document.getElementById("position-slider"),
  lockPositionBtn: document.getElementById("lock-position-btn"),

  powerControls: document.getElementById("power-controls"),
  powerSlider: document.getElementById("power-slider"),
  powerFill: document.getElementById("power-fill"),
  launchBtn: document.getElementById("launch-btn"),

  curlControls: document.getElementById("curl-controls"),
  curlValueLabel: document.getElementById("curl-value-label"),
  curlSlider: document.getElementById("curl-slider"),
  throwBtn: document.getElementById("throw-btn"),

  sweepControls: document.getElementById("sweep-controls"),
  sweepPad: document.getElementById("sweep-pad"),
  sweepFill: document.getElementById("sweep-fill"),
  strategyViewBtns: [...document.querySelectorAll(".strategy-view-btn")],
  fastForwardBtn: document.getElementById("fast-forward-btn"),
  endReviewPanel: document.getElementById("end-review-panel"),
  endReviewTitle: document.getElementById("end-review-title"),
  endReviewBody: document.getElementById("end-review-body"),
  endReviewGraphic: document.getElementById("end-review-graphic"),
  nextRoundBtn: document.getElementById("next-round-btn"),
  gameOverOverlay: document.getElementById("game-over-overlay"),
  gameOverConfetti: document.getElementById("game-over-confetti"),
  gameOverFlag: document.getElementById("game-over-flag"),
  gameOverTitle: document.getElementById("game-over-title"),
  gameOverScore: document.getElementById("game-over-score"),
  gameOverDetail: document.getElementById("game-over-detail"),
  gameOverNewGameBtn: document.getElementById("game-over-new-game-btn"),

  newGameOverlay: document.getElementById("new-game-overlay"),
  newGameForm: document.getElementById("new-game-form"),
  modeButtons: [...document.querySelectorAll(".mode-btn")],
  team0Select: document.getElementById("team0-select"),
  team1Select: document.getElementById("team1-select"),
  team1InlineLabel: document.getElementById("team1-label-inline"),
  endsButtons: [...document.querySelectorAll(".ends-btn")],
  stonesButtons: [...document.querySelectorAll(".stones-btn")]
};

const game = {
  mode: "1p",
  maxEnds: 5,
  stonesPerSide: DEFAULT_STONES_PER_SIDE,
  countriesBySide: [0, 1],
  scores: [0, 0],
  end: 1,
  currentShot: 0,
  hammerSide: 1,
  firstThrowSide: 0,
  activeSide: 0,
  stones: [],
  activeStone: null,
  shotState: "idle",
  awaitingShotResolution: false,
  pendingEndReview: null,
  turnToken: 0,
  started: false,
  lastWinner: null,
  cameraMode: "overview",
  strategyView: false,
  fastForward: false,
  controls: {
    startX: 0,
    powerPct: 0.65,
    curlInput: 0
  },
  sweep: {
    boost: 0,
    aiBoost: 0,
    activePointer: false,
    lastX: 0,
    lastT: 0
  }
};
const totalShots = () => game.stonesPerSide * 2;

let renderer;
let scene;
let camera;
let rink;
let broomMesh;
let aimHackMarker;
let sideWallLeft;
let sideWallRight;
let endWallTop;
let confettiCleanupTimer = null;

const cameraTargetPos = new THREE.Vector3(0, 0, 26);
const cameraTargetLook = new THREE.Vector3(0, 0, 0);
const cameraLook = new THREE.Vector3(0, 0, 0);

let lastFrameTime = performance.now();

initUI();
initThree();
updateHUD();
requestAnimationFrame(loop);

function initUI() {
  COUNTRIES.forEach((country, index) => {
    const opt0 = document.createElement("option");
    opt0.value = String(index);
    opt0.textContent = `${country.flag} ${country.name}`;
    el.team0Select.appendChild(opt0);

    const opt1 = document.createElement("option");
    opt1.value = String(index);
    opt1.textContent = `${country.flag} ${country.name}`;
    el.team1Select.appendChild(opt1);
  });

  el.team0Select.value = "0";
  el.team1Select.value = "1";

  el.modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      game.mode = btn.dataset.mode;
      styleModeButtons();
      el.team1InlineLabel.textContent = game.mode === "1p" ? "AI Team (Yellow)" : "Player 2 Team (Yellow)";
    });
  });

  el.endsButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      game.maxEnds = Number(btn.dataset.ends);
      styleEndsButtons();
    });
  });

  el.stonesButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      game.stonesPerSide = sanitizeStonesPerSide(Number(btn.dataset.stones));
      styleStonesButtons();
      updateHUD();
    });
  });

  el.team0Select.addEventListener("change", ensureDistinctTeams);
  el.team1Select.addEventListener("change", ensureDistinctTeams);

  el.newGameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startMatchFromForm();
  });

  el.positionSlider.addEventListener("input", () => {
    game.controls.startX = clamp(Number(el.positionSlider.value), -MAX_HACK_X, MAX_HACK_X);
    if (game.shotState === "positioning" && game.activeStone) {
      game.activeStone.position.x = game.controls.startX;
      syncStoneMesh(game.activeStone);
    }
  });

  el.lockPositionBtn.addEventListener("click", () => {
    if (game.shotState !== "positioning") return;
    game.shotState = "power";
    showControlPanel("power");
    setThrowButtonReady(false);
    updateStrategyViewButton();
    el.statusLabel.textContent = "Set your release speed.";
  });

  el.powerSlider.addEventListener("input", () => {
    game.controls.powerPct = Number(el.powerSlider.value) / 100;
    el.powerFill.style.width = `${el.powerSlider.value}%`;
  });

  el.launchBtn.addEventListener("click", () => {
    if (game.shotState !== "power") return;
    game.shotState = "curl_setup";
    showControlPanel("curl");
    setThrowButtonReady(true);
    updateStrategyViewButton();
    el.statusLabel.textContent = "Set curl, then press Throw.";
  });

  el.curlSlider.addEventListener("input", () => {
    game.controls.curlInput = Number(el.curlSlider.value) / 100;
    updateCurlReadout();
    if (game.activeStone && game.shotState === "delivery") {
      game.activeStone.spinSign = -Math.sign(game.controls.curlInput) || 1;
      game.activeStone.spinStrength = Math.abs(game.controls.curlInput);
    }
  });

  el.throwBtn.addEventListener("click", () => {
    if (game.shotState !== "curl_setup") return;
    beginDeliveryPhase({
      powerPct: game.controls.powerPct,
      curlInput: game.controls.curlInput,
      isAI: false
    });
  });

  el.nextRoundBtn.addEventListener("click", () => {
    if (!game.pendingEndReview) return;
    const review = game.pendingEndReview;
    hideEndReviewPanel();
    game.pendingEndReview = null;
    game.strategyView = false;

    if (review.isFinalEnd) {
      finishMatch();
      return;
    }

    game.end += 1;
    resetStonesForNextEnd();
    updateHUD();
    startNextShot();
  });

  el.gameOverNewGameBtn.addEventListener("click", () => {
    hideGameOverOverlay();
    el.newGameOverlay.classList.remove("hidden");
    updateHUD();
  });

  el.strategyViewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!canUseStrategyView()) return;
      game.strategyView = !game.strategyView;
      updateStrategyViewButton();
    });
  });

  el.fastForwardBtn.addEventListener("click", () => {
    if (!isAIThrowInProgress()) return;
    game.fastForward = !game.fastForward;
    updateFastForwardButton();
  });

  el.sweepPad.addEventListener("pointerdown", (event) => {
    if (game.shotState !== "running") return;
    event.preventDefault();
    el.sweepPad.setPointerCapture(event.pointerId);
    game.sweep.activePointer = true;
    game.sweep.lastX = event.clientX;
    game.sweep.lastT = performance.now();
  });

  el.sweepPad.addEventListener("pointermove", (event) => {
    if (!game.sweep.activePointer || game.shotState !== "running") return;
    const now = performance.now();
    const dt = Math.max(1, now - game.sweep.lastT);
    const dx = event.clientX - game.sweep.lastX;
    const speedPxMs = Math.abs(dx) / dt;
    const effectiveSweepSpeed = Math.max(0, speedPxMs - 0.38);
    game.sweep.boost = clamp(game.sweep.boost + effectiveSweepSpeed * 0.055, 0, 1);
    game.sweep.lastX = event.clientX;
    game.sweep.lastT = now;
  });

  const endSweep = () => {
    game.sweep.activePointer = false;
  };

  el.sweepPad.addEventListener("pointerup", endSweep);
  el.sweepPad.addEventListener("pointercancel", endSweep);
  el.sweepPad.addEventListener("pointerleave", endSweep);

  styleModeButtons();
  styleEndsButtons();
  styleStonesButtons();
  updateCurlReadout();
  setThrowButtonReady(false);
  updateStrategyViewButton();
  updateFastForwardButton();
}

function styleModeButtons() {
  el.modeButtons.forEach((btn) => {
    const selected = btn.dataset.mode === game.mode;
    btn.classList.toggle("bg-sky-700", selected);
    btn.classList.toggle("text-white", selected);
    btn.classList.toggle("bg-white", !selected);
    btn.classList.toggle("text-sky-900", !selected);
  });
}

function styleEndsButtons() {
  el.endsButtons.forEach((btn) => {
    const selected = Number(btn.dataset.ends) === game.maxEnds;
    btn.classList.toggle("bg-sky-700", selected);
    btn.classList.toggle("text-white", selected);
    btn.classList.toggle("bg-white", !selected);
    btn.classList.toggle("text-sky-900", !selected);
  });
}

function styleStonesButtons() {
  el.stonesButtons.forEach((btn) => {
    const selected = sanitizeStonesPerSide(Number(btn.dataset.stones)) === game.stonesPerSide;
    btn.classList.toggle("bg-sky-700", selected);
    btn.classList.toggle("text-white", selected);
    btn.classList.toggle("bg-white", !selected);
    btn.classList.toggle("text-sky-900", !selected);
  });
}

function updateCurlReadout() {
  const input = game.controls.curlInput;
  const amount = Math.round(Math.abs(input) * 100);
  if (amount < 3) {
    el.curlValueLabel.textContent = "Straight (0%)";
    return;
  }
  const dir = input < 0 ? "CCW" : "CW";
  el.curlValueLabel.textContent = `${dir} (${amount}%)`;
}

function setThrowButtonReady(ready) {
  el.throwBtn.classList.toggle("hidden", !ready);
  el.throwBtn.disabled = !ready;
}

function canUseStrategyView() {
  if (!game.started) return false;
  if (game.mode === "1p" && game.activeSide === 1) return false;
  return ["positioning", "power", "curl_setup"].includes(game.shotState);
}

function isAIThrowInProgress() {
  return game.mode === "1p" && game.activeSide === 1 && ["delivery", "running"].includes(game.shotState);
}

function updateStrategyViewButton() {
  const available = canUseStrategyView();
  if (!available) game.strategyView = false;

  el.strategyViewBtns.forEach((btn) => {
    btn.classList.toggle("hidden", !available);
    btn.classList.toggle("bg-sky-800", available && game.strategyView);
    btn.classList.toggle("text-white", available && game.strategyView);
    btn.classList.toggle("bg-white/90", !(available && game.strategyView));
    btn.classList.toggle("text-sky-900", !(available && game.strategyView));
    btn.textContent = available && game.strategyView ? "👁 Return" : "👁 House";
  });
}

function updateFastForwardButton() {
  const available = isAIThrowInProgress();
  if (!available) game.fastForward = false;

  el.fastForwardBtn.classList.toggle("hidden", !available);
  el.fastForwardBtn.classList.toggle("bg-emerald-600", available && game.fastForward);
  el.fastForwardBtn.classList.toggle("text-white", available && game.fastForward);
  el.fastForwardBtn.classList.toggle("bg-emerald-50/95", !(available && game.fastForward));
  el.fastForwardBtn.classList.toggle("text-emerald-900", !(available && game.fastForward));
  el.fastForwardBtn.textContent = available && game.fastForward ? "⏩ 2x On" : "⏩ 2x";
}

function resetBoundaryAlerts() {
  if (!sideWallLeft || !sideWallRight || !endWallTop) return;
  sideWallLeft.material.color.setHex(SIDEWALL_DEFAULT_COLOR);
  sideWallRight.material.color.setHex(SIDEWALL_DEFAULT_COLOR);
  endWallTop.material.color.setHex(SIDEWALL_DEFAULT_COLOR);
  sideWallLeft.material.emissive.setHex(0x000000);
  sideWallRight.material.emissive.setHex(0x000000);
  endWallTop.material.emissive.setHex(0x000000);
  sideWallLeft.material.emissiveIntensity = 0;
  sideWallRight.material.emissiveIntensity = 0;
  endWallTop.material.emissiveIntensity = 0;
}

function markSideWallAlert(isRightWall) {
  const wall = isRightWall ? sideWallRight : sideWallLeft;
  if (!wall) return;
  wall.material.color.setHex(SIDEWALL_ALERT_COLOR);
  wall.material.emissive.setHex(0x7f1d1d);
  wall.material.emissiveIntensity = 0.65;
}

function markEndWallAlert() {
  if (!endWallTop) return;
  endWallTop.material.color.setHex(SIDEWALL_ALERT_COLOR);
  endWallTop.material.emissive.setHex(0x7f1d1d);
  endWallTop.material.emissiveIntensity = 0.65;
}

function flagStoneForDeferredRemoval(stone, reason) {
  if (!stone || stone.removed || stone.flaggedForRemoval) return;
  stone.flaggedForRemoval = true;
  stone.removalReason = reason;
  stone.flashPhase = 0;
}

function cleanupDeferredRemovalsForTurnStart() {
  game.stones.forEach((stone) => {
    if (stone.removed) return;
    if (!stone.flaggedForRemoval) return;
    removeStone(stone);
  });
  resetBoundaryAlerts();
}

function updateFlashingStones(dt) {
  game.stones.forEach((stone) => {
    if (stone.removed) return;
    if (!stone.flaggedForRemoval) {
      applyStoneOpacity(stone, 1);
      return;
    }
    stone.flashPhase += dt * 12;
    const alpha = clamp((Math.sin(stone.flashPhase) + 1) * 0.5, 0, 1);
    applyStoneOpacity(stone, alpha);
  });
}

function applyStoneOpacity(stone, opacity) {
  const alpha = clamp(opacity, 0, 1);
  stone.mesh.group.visible = alpha > 0.01;
  stone.mesh.group.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    node.material.transparent = alpha < 0.999;
    node.material.opacity = alpha;
    node.material.needsUpdate = true;
  });
}

function hideEndReviewPanel() {
  el.endReviewPanel.classList.add("hidden");
}

function hideGameOverOverlay() {
  el.gameOverOverlay.classList.add("hidden");
  el.gameOverOverlay.classList.remove("flex");
  el.gameOverConfetti.innerHTML = "";
  if (confettiCleanupTimer) {
    clearTimeout(confettiCleanupTimer);
    confettiCleanupTimer = null;
  }
}

function launchConfettiBurst(colors) {
  el.gameOverConfetti.innerHTML = "";
  const safeColors = colors.length > 0 ? colors : ["#38bdf8", "#facc15", "#f43f5e"];

  for (let i = 0; i < 90; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = safeColors[i % safeColors.length];
    piece.style.opacity = String(0.65 + Math.random() * 0.35);
    piece.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 210)}px`);
    piece.style.setProperty("--rot", `${Math.round((Math.random() - 0.5) * 920)}deg`);
    piece.style.animationDelay = `${(Math.random() * 0.22).toFixed(3)}s`;
    piece.style.animationDuration = `${(1.45 + Math.random() * 0.95).toFixed(3)}s`;
    el.gameOverConfetti.appendChild(piece);
  }

  if (confettiCleanupTimer) clearTimeout(confettiCleanupTimer);
  confettiCleanupTimer = setTimeout(() => {
    el.gameOverConfetti.innerHTML = "";
    confettiCleanupTimer = null;
  }, 3500);
}

function showGameOverOverlay() {
  const p1 = game.scores[0];
  const p2 = game.scores[1];
  const tie = p1 === p2;

  let winner = null;
  if (!tie) winner = p1 > p2 ? 0 : 1;

  const winnerSide = winner ?? 0;
  const loserSide = winner === 0 ? 1 : 0;
  const winnerCountry = COUNTRIES[game.countriesBySide[winnerSide]];

  if (tie) {
    el.gameOverTitle.textContent = "Match Drawn";
    el.gameOverFlag.innerHTML = `<span class="flag-emoji">${COUNTRIES[game.countriesBySide[0]].flag}${COUNTRIES[game.countriesBySide[1]].flag}</span>`;
    el.gameOverFlag.classList.remove("flag-wave-active");
    el.gameOverScore.textContent = `${p1} - ${p2}`;
    el.gameOverDetail.textContent = "Final score";
    launchConfettiBurst([
      ...(FLAG_COLOR_PALETTE[COUNTRIES[game.countriesBySide[0]].code] || []),
      ...(FLAG_COLOR_PALETTE[COUNTRIES[game.countriesBySide[1]].code] || [])
    ]);
  } else {
    const winnerScore = game.scores[winner];
    const loserScore = game.scores[loserSide];
    el.gameOverTitle.textContent = `${winnerCountry.flag} ${winnerCountry.name} Wins`;
    el.gameOverFlag.innerHTML = `<span class="flag-emoji">${winnerCountry.flag}</span>`;
    el.gameOverFlag.classList.add("flag-wave-active");
    el.gameOverScore.textContent = `${winnerScore} - ${loserScore}`;
    el.gameOverDetail.textContent = "Final score";
    launchConfettiBurst(FLAG_COLOR_PALETTE[winnerCountry.code] || [winner === 0 ? "#dc2626" : "#facc15", "#ffffff"]);
  }

  el.gameOverOverlay.classList.remove("hidden");
  el.gameOverOverlay.classList.add("flex");
}

function renderRemainingStoneIcons() {
  const stonesPerSide = sanitizeStonesPerSide(game.stonesPerSide);
  const deliveredBySide = [0, 0];
  game.stones.forEach((stone) => {
    if (stone.wasDelivered) deliveredBySide[stone.side] += 1;
  });

  renderStoneIconRow(el.stones0Icons, clamp(stonesPerSide - deliveredBySide[0], 0, stonesPerSide), 0);
  renderStoneIconRow(el.stones1Icons, clamp(stonesPerSide - deliveredBySide[1], 0, stonesPerSide), 1);
}

function renderStoneIconRow(container, remaining, side) {
  if (!container) return;
  const stonesPerSide = sanitizeStonesPerSide(game.stonesPerSide);
  const activeColor = side === 0 ? "bg-rose-500" : "bg-amber-400";
  const spentColor = "bg-slate-300";
  const iconSize = stonesPerSide <= 4 ? 10 : stonesPerSide <= 8 ? 8 : 5;
  const gapPx = stonesPerSide <= 4 ? 4 : stonesPerSide <= 8 ? 2 : 1;
  const icons = [];
  container.style.gap = `${gapPx}px`;

  for (let i = 0; i < stonesPerSide; i += 1) {
    const isRemaining = i < remaining;
    icons.push(
      `<span class=\"inline-block rounded-full ${isRemaining ? activeColor : spentColor}\" style=\"width:${iconSize}px;height:${iconSize}px\" aria-hidden=\"true\"></span>`
    );
  }

  container.innerHTML = icons.join("");
}

function showEndReviewPanel(review, inHouse) {
  const endedEnd = review.endedEnd;
  el.endReviewTitle.textContent = `End ${endedEnd} Complete`;

  if (review.scoringSide === null || review.points === 0) {
    el.endReviewBody.textContent = "Blank end. Hammer carries over.";
  } else {
    el.endReviewBody.textContent = `${countryLabel(review.scoringSide)} scores ${review.points} point${review.points === 1 ? "" : "s"}.`;
  }

  const scoringClass = review.scoringSide === 0 ? "bg-rose-500" : "bg-amber-400";
  const opponentClass = review.scoringSide === 0 ? "bg-amber-300" : "bg-rose-400";

  if (review.scoringSide === null || review.points === 0) {
    el.endReviewGraphic.innerHTML =
      '<div class="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600">No counters</div>';
  } else {
    const counters = Array.from({ length: review.points }, (_, idx) => {
      const n = idx + 1;
      return `<span class=\"inline-flex h-6 w-6 items-center justify-center rounded-full ${scoringClass} text-[10px] font-bold text-white\">${n}</span>`;
    }).join("");

    const nearestOpp = inHouse.find((stone) => stone.side !== review.scoringSide);
    const oppBadge = nearestOpp
      ? `<span class=\"inline-flex h-5 w-5 rounded-full ${opponentClass} opacity-75\"></span>`
      : '<span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">No opposition</span>';

    el.endReviewGraphic.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-900">Shot Rock</span>
        ${counters}
      </div>
      <div class="mx-1 h-4 w-px bg-slate-300"></div>
      <div class="flex items-center gap-1.5">
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Nearest Opponent</span>
        ${oppBadge}
      </div>
    `;
  }

  el.nextRoundBtn.textContent = review.isFinalEnd ? "Show Final Result" : "Next Round";
  el.endReviewPanel.classList.remove("hidden");
}

function ensureDistinctTeams() {
  if (el.team0Select.value !== el.team1Select.value) return;
  const next = (Number(el.team0Select.value) + 1) % COUNTRIES.length;
  el.team1Select.value = String(next);
}

function showControlPanel(name) {
  el.positionControls.classList.add("hidden");
  el.powerControls.classList.add("hidden");
  el.curlControls.classList.add("hidden");
  el.sweepControls.classList.add("hidden");

  if (name === "position") el.positionControls.classList.remove("hidden");
  if (name === "power") el.powerControls.classList.remove("hidden");
  if (name === "curl") el.curlControls.classList.remove("hidden");
  if (name === "sweep") el.sweepControls.classList.remove("hidden");
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f8ff);

  camera = new THREE.PerspectiveCamera(42, 9 / 16, 0.1, 200);
  camera.position.set(0, 0, 26);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas: el.canvas, antialias: true });
  renderer.setClearColor(0xc1ccd8, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  resizeRenderer();

  const ambient = new THREE.HemisphereLight(0xffffff, 0xf7fbff, 1.05);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 0.72);
  key.position.set(5, -18, 18);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdbeafe, 0.22);
  fill.position.set(-5, 10, 14);
  scene.add(fill);

  rink = new THREE.Mesh(
    new THREE.PlaneGeometry(SHEET_WIDTH, SHEET_LENGTH),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: buildRinkTexture()
    })
  );
  rink.position.set(0, 0, 0);
  scene.add(rink);

  sideWallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, SHEET_LENGTH + 0.12, 0.3),
    new THREE.MeshStandardMaterial({
      color: SIDEWALL_DEFAULT_COLOR,
      roughness: 0.6,
      emissive: 0x000000,
      emissiveIntensity: 0
    })
  );
  sideWallLeft.position.set(-SHEET_WIDTH / 2 - 0.035, 0, 0.15);
  scene.add(sideWallLeft);

  sideWallRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, SHEET_LENGTH + 0.12, 0.3),
    new THREE.MeshStandardMaterial({
      color: SIDEWALL_DEFAULT_COLOR,
      roughness: 0.6,
      emissive: 0x000000,
      emissiveIntensity: 0
    })
  );
  sideWallRight.position.set(SHEET_WIDTH / 2 + 0.035, 0, 0.15);
  scene.add(sideWallRight);

  endWallTop = new THREE.Mesh(
    new THREE.BoxGeometry(SHEET_WIDTH + 0.12, 0.07, 0.3),
    new THREE.MeshStandardMaterial({
      color: SIDEWALL_DEFAULT_COLOR,
      roughness: 0.6,
      emissive: 0x000000,
      emissiveIntensity: 0
    })
  );
  endWallTop.position.set(0, BACK_LINE_Y + 0.035, 0.15);
  scene.add(endWallTop);

  broomMesh = new THREE.Group();
  const broomHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x7dd3fc })
  );
  const broomHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x0f172a })
  );
  broomHandle.rotation.x = Math.PI / 2;
  broomHandle.position.z = 0.08;
  broomMesh.add(broomHead, broomHandle);
  broomMesh.visible = false;
  broomMesh.position.set(0, HACK_Y + 1, 0.08);
  scene.add(broomMesh);

  aimHackMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.17, 0.2, 32),
    new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8 })
  );
  aimHackMarker.position.set(0, HACK_Y, 0.02);
  scene.add(aimHackMarker);

  window.addEventListener("resize", resizeRenderer);
}

function buildRinkTexture() {
  const texCanvas = document.createElement("canvas");
  texCanvas.width = 1024;
  texCanvas.height = 4096;
  const ctx = texCanvas.getContext("2d");

  const iceGradient = ctx.createLinearGradient(0, 0, 0, texCanvas.height);
  iceGradient.addColorStop(0, "#ffffff");
  iceGradient.addColorStop(0.45, "#ffffff");
  iceGradient.addColorStop(1, "#fcfdff");
  ctx.fillStyle = iceGradient;
  ctx.fillRect(0, 0, texCanvas.width, texCanvas.height);

  // Subtle pebble/scrape texture so the sheet is not a flat fill.
  for (let i = 0; i < 170; i += 1) {
    const x = Math.random() * texCanvas.width;
    const alpha = 0.006 + Math.random() * 0.014;
    ctx.strokeStyle = `rgba(182, 192, 204, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 5, texCanvas.height);
    ctx.stroke();
  }

  for (let i = 0; i < 9000; i += 1) {
    const x = Math.random() * texCanvas.width;
    const y = Math.random() * texCanvas.height;
    const a = 0.006 + Math.random() * 0.012;
    ctx.fillStyle = `rgba(176, 186, 198, ${a.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const toX = (x) => ((x + SHEET_WIDTH / 2) / SHEET_WIDTH) * texCanvas.width;
  const toY = (y) => ((HALF_LENGTH - y) / SHEET_LENGTH) * texCanvas.height;
  const scaleRX = (r) => (r / SHEET_WIDTH) * texCanvas.width;
  const scaleRY = (r) => (r / SHEET_LENGTH) * texCanvas.height;

  const drawHouse = (teeY) => {
    const x = toX(0);
    const y = toY(teeY);
    const rings = [
      { r: HOUSE_RADIUS, c: "#1d4ed8" },
      { r: 1.22, c: "#ffffff" },
      { r: 0.61, c: "#dc2626" },
      { r: 0.2, c: "#ffffff" }
    ];
    rings.forEach((ring) => {
      ctx.beginPath();
      ctx.fillStyle = ring.c;
      ctx.ellipse(x, y, scaleRX(ring.r), scaleRY(ring.r), 0, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#0f172a";
  ctx.strokeRect(4, 4, texCanvas.width - 8, texCanvas.height - 8);

  ctx.lineWidth = 6;
  ctx.strokeStyle = "#0f172a";
  [RELEASE_LINE_Y, FAR_HOG_Y, TEE_Y, -TEE_Y, BACK_LINE_Y, -BACK_LINE_Y].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(toX(-SHEET_WIDTH / 2), toY(y));
    ctx.lineTo(toX(SHEET_WIDTH / 2), toY(y));
    ctx.stroke();
  });

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(-HALF_LENGTH));
  ctx.lineTo(toX(0), toY(HALF_LENGTH));
  ctx.stroke();

  drawHouse(TEE_Y);
  drawHouse(-TEE_Y);

  const texture = new THREE.CanvasTexture(texCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function resizeRenderer() {
  const width = el.canvas.clientWidth;
  const height = el.canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function startMatchFromForm() {
  game.mode = game.mode || "1p";
  game.maxEnds = game.maxEnds || 5;
  game.stonesPerSide = sanitizeStonesPerSide(game.stonesPerSide);
  styleStonesButtons();

  game.countriesBySide[0] = Number(el.team0Select.value);
  game.countriesBySide[1] = Number(el.team1Select.value);

  if (game.countriesBySide[0] === game.countriesBySide[1]) {
    game.countriesBySide[1] = (game.countriesBySide[1] + 1) % COUNTRIES.length;
  }

  game.scores = [0, 0];
  game.end = 1;
  game.currentShot = 0;
  game.hammerSide = Math.random() < 0.5 ? 0 : 1;
  game.firstThrowSide = 1 - game.hammerSide;
  game.activeSide = game.firstThrowSide;
  game.stones.forEach(removeStoneMesh);
  game.stones = [];
  game.activeStone = null;
  game.shotState = "idle";
  game.awaitingShotResolution = false;
  game.pendingEndReview = null;
  game.started = true;
  game.lastWinner = null;
  game.strategyView = false;

  game.controls.startX = 0;
  game.controls.powerPct = 0.65;
  game.controls.curlInput = 0;

  el.positionSlider.value = "0";
  el.powerSlider.value = "65";
  el.powerFill.style.width = "65%";
  el.curlSlider.value = "0";
  updateCurlReadout();

  el.newGameOverlay.classList.add("hidden");
  hideEndReviewPanel();
  hideGameOverOverlay();
  hideMessage();
  resetBoundaryAlerts();
  updateStrategyViewButton();
  updateFastForwardButton();

  updateHUD();
  showMessage("Match Start", `${countryLabel(game.hammerSide)} has hammer in End 1.`, 1800);

  setTimeout(() => {
    if (!game.started) return;
    startNextShot();
  }, 950);
}

function startNextShot() {
  if (!game.started) return;
  hideEndReviewPanel();
  cleanupDeferredRemovalsForTurnStart();
  game.strategyView = false;
  game.fastForward = false;
  updateStrategyViewButton();
  updateFastForwardButton();

  if (game.currentShot >= totalShots()) {
    finishEnd();
    return;
  }

  game.turnToken += 1;
  const turnToken = game.turnToken;
  game.awaitingShotResolution = false;
  game.activeSide = game.currentShot % 2 === 0 ? game.firstThrowSide : 1 - game.firstThrowSide;

  const stone = createStone(game.activeSide);
  stone.position.set(0, HACK_Y);
  game.activeStone = stone;
  syncStoneMesh(stone);

  game.controls.startX = 0;
  game.controls.powerPct = 0.65;
  game.controls.curlInput = 0;
  el.positionSlider.value = "0";
  el.powerSlider.value = "65";
  el.powerFill.style.width = "65%";
  el.curlSlider.value = "0";
  updateCurlReadout();

  const aiTurn = game.mode === "1p" && game.activeSide === 1;
  game.shotState = "positioning";
  game.cameraMode = "start";
  broomMesh.visible = false;

  updateHUD();

  if (aiTurn) {
    aimHackMarker.visible = false;
    showControlPanel(null);
    setThrowButtonReady(false);
    el.statusLabel.textContent = "AI is preparing the throw...";
    setTimeout(() => {
      if (!game.started || game.turnToken !== turnToken || game.shotState !== "positioning") return;
      const shot = pickAIShot();
      game.activeStone.position.x = shot.startX;
      syncStoneMesh(game.activeStone);
      beginDeliveryPhase({
        powerPct: shot.powerPct,
        curlInput: shot.curlInput,
        isAI: true,
        aiSweep: shot.sweep
      });
    }, 900 + Math.random() * 600);
    return;
  }

  aimHackMarker.visible = true;
  showControlPanel("position");
  setThrowButtonReady(false);
  el.statusLabel.textContent = "Slide left or right and lock your position.";
}

function beginDeliveryPhase({ powerPct, curlInput, isAI, aiSweep = 0.4 }) {
  if (!game.activeStone) return;

  game.controls.powerPct = powerPct;
  game.controls.curlInput = clamp(curlInput, -1, 1);
  el.curlSlider.value = String(Math.round(game.controls.curlInput * 100));
  updateCurlReadout();

  const stone = game.activeStone;
  stone.wasDelivered = true;
  stone.position.x = clamp(stone.position.x, -MAX_HACK_X, MAX_HACK_X);
  stone.velocity.set(0, DELIVERY_SPEED);
  stone.moving = true;
  stone.activeThisShot = true;
  stone.spinSign = -Math.sign(game.controls.curlInput) || 1;
  stone.spinStrength = Math.abs(game.controls.curlInput);
  stone.targetSpeed = powerPctToSpeed(powerPct);
  stone.initialSpeed = stone.targetSpeed;
  stone.crossedFarHog = false;
  stone.touchedStone = false;
  stone.distanceTravelled = 0;
  stone.aiSweep = aiSweep;

  game.shotState = "delivery";
  game.cameraMode = "delivery";
  game.strategyView = false;
  aimHackMarker.visible = false;
  updateStrategyViewButton();

  if (isAI) {
    el.statusLabel.textContent = "AI is delivering...";
    showControlPanel(null);
    setThrowButtonReady(false);
  } else {
    el.statusLabel.textContent = "Stone released. Preparing sweep controls...";
    showControlPanel(null);
    setThrowButtonReady(false);
  }
}

function pickAIShot() {
  const aiSide = 1;
  const playerSide = 0;
  const inHouse = getStonesInHouse();
  const live = getLiveStones();
  const aiInHouse = inHouse.filter((stone) => stone.side === aiSide);
  const playerInHouse = inHouse.filter((stone) => stone.side === playerSide);
  const stonesLeftForAI = Math.ceil((totalShots() - game.currentShot) / 2);
  const aiHasHammer = game.hammerSide === aiSide;
  const scoreDiff = game.scores[aiSide] - game.scores[playerSide];

  let plan = {
    type: "draw",
    targetX: (Math.random() - 0.5) * 0.4,
    targetY: TEE_Y + 0.05,
    sweep: 0.42
  };

  const guards = live.filter(
    (stone) => !isStoneInHouse(stone) && stone.position.y > FAR_HOG_Y + 0.6 && stone.position.y < TEE_Y - 0.8
  );

  if (live.length === 0) {
    plan = { type: "draw", targetX: (Math.random() - 0.5) * 0.25, targetY: TEE_Y, sweep: 0.44 };
  } else if (inHouse.length === 0) {
    if (!aiHasHammer && stonesLeftForAI > 4) {
      plan = { type: "guard", targetX: (Math.random() - 0.5) * 0.7, targetY: 14.2, sweep: 0.3 };
    } else {
      plan = { type: "draw", targetX: (Math.random() - 0.5) * 0.45, targetY: TEE_Y + 0.25, sweep: 0.4 };
    }
  } else {
    const shotRock = inHouse[0];
    const playerShotRock = shotRock.side === playerSide;
    const late = stonesLeftForAI <= 2;

    if (playerShotRock) {
      const highDanger = shotRock.distance < 0.9 || playerInHouse.length >= 2 || late || scoreDiff < 0;
      if (highDanger) {
        plan = {
          type: "takeout",
          targetX: shotRock.position.x,
          targetY: clamp(shotRock.position.y - 0.15, FAR_HOG_Y + 0.9, BACK_LINE_Y - 0.5),
          sweep: 0.24
        };
      } else {
        const wing = shotRock.position.x > 0 ? -0.6 : 0.6;
        plan = { type: "draw", targetX: clamp(wing, -1.1, 1.1), targetY: TEE_Y + 0.7, sweep: 0.4 };
      }
    } else if (aiHasHammer && stonesLeftForAI > 3 && aiInHouse.length > 0) {
      const centerGuardX = clamp(inHouse[0].position.x * 0.4, -0.6, 0.6);
      plan = { type: "guard", targetX: centerGuardX, targetY: 14.4 + Math.random() * 0.4, sweep: 0.25 };
    } else {
      const freezeBase = inHouse[0];
      const freezeOffset = freezeBase.position.y > TEE_Y ? -0.18 : 0.18;
      plan = {
        type: "draw",
        targetX: clamp(freezeBase.position.x + (Math.random() - 0.5) * 0.16, -1.1, 1.1),
        targetY: clamp(freezeBase.position.y + freezeOffset, FAR_HOG_Y + 0.7, TEE_Y + 1.2),
        sweep: 0.36
      };
    }
  }

  if (!aiHasHammer && aiInHouse.length === 0 && stonesLeftForAI > 3) {
    plan = { type: "draw", targetX: (Math.random() - 0.5) * 0.25, targetY: TEE_Y + 0.2, sweep: 0.4 };
  }

  if (guards.length > 1 && plan.type === "guard") {
    plan.type = "draw";
    plan.targetY = TEE_Y + 0.45;
  }

  const startX = clamp(plan.targetX * 0.45 + (Math.random() - 0.5) * 0.32, -MAX_HACK_X, MAX_HACK_X);
  const curlInput = estimateCurlInput(startX, plan.targetX, plan.type);
  let powerPct = estimatePowerPct(plan.targetY, plan.type, Math.abs(plan.targetX - startX), plan.sweep);
  powerPct = clamp(powerPct + (Math.random() - 0.5) * 0.05, 0.22, 0.99);

  return {
    startX,
    powerPct,
    curlInput,
    sweep: clamp(plan.sweep + (Math.random() - 0.5) * 0.08, 0.12, 0.62)
  };
}

function getLiveStones() {
  return game.stones.filter((stone) => !stone.removed);
}

function isStoneInHouse(stone) {
  return stone.position.distanceTo(new THREE.Vector2(0, TEE_Y)) <= HOUSE_RADIUS + STONE_RADIUS;
}

function estimatePowerPct(targetY, shotType, lateralDelta, sweepLevel) {
  const sweepComp = 1 - sweepLevel * 0.12;
  const effectiveMu = BASE_MU * sweepComp;
  const distanceFromRelease = Math.max(4, targetY - RELEASE_LINE_Y);
  let requiredSpeed = Math.sqrt(2 * effectiveMu * G * distanceFromRelease);

  if (shotType === "takeout") requiredSpeed += 1.05;
  if (shotType === "guard") requiredSpeed += 0.18;

  requiredSpeed += lateralDelta * 0.08;
  return clamp(speedToPowerPct(requiredSpeed), 0.2, 0.99);
}

function estimateCurlInput(startX, targetX, shotType) {
  const delta = targetX - startX;
  let signed = clamp(delta * 0.7, -1, 1);

  if (Math.abs(delta) < 0.08) signed = 0;
  if (shotType === "takeout") signed *= 0.5;
  if (shotType === "guard") signed *= 1.1;

  if (Math.abs(signed) < CURL_DEAD_ZONE) return 0;
  return clamp(signed, -0.85, 0.85);
}

function createStone(side) {
  const stone = {
    side,
    position: new THREE.Vector2(0, HACK_Y),
    velocity: new THREE.Vector2(0, 0),
    moving: false,
    removed: false,
    flaggedForRemoval: false,
    removalReason: null,
    flashPhase: 0,
    wasDelivered: false,
    activeThisShot: false,
    touchedStone: false,
    crossedFarHog: false,
    targetSpeed: 0,
    initialSpeed: 0,
    spinSign: 1,
    spinStrength: 0,
    handleSpin: 0,
    handleIdlePhase: Math.random() * Math.PI * 2,
    idleSpinDir: Math.random() < 0.5 ? -1 : 1,
    distanceTravelled: 0,
    lowSpeedTime: 0,
    aiSweep: 0.3,
    mesh: buildStoneMesh(side)
  };

  game.stones.push(stone);
  scene.add(stone.mesh.group);
  return stone;
}

function buildStoneMesh(side) {
  const group = new THREE.Group();

  const granite = new THREE.Mesh(
    new THREE.CylinderGeometry(STONE_RADIUS, STONE_RADIUS, STONE_HEIGHT, 42),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.65, metalness: 0.03 })
  );
  granite.rotation.x = Math.PI / 2;
  group.add(granite);

  const topDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(STONE_RADIUS * 0.78, STONE_RADIUS * 0.78, 0.02, 32),
    new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.4, metalness: 0.04 })
  );
  topDisk.rotation.x = Math.PI / 2;
  topDisk.position.z = STONE_HEIGHT * 0.5 + 0.01;
  group.add(topDisk);

  const handlePivot = new THREE.Group();
  handlePivot.position.z = STONE_HEIGHT * 0.5 + 0.03;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.015, 12, 26),
    new THREE.MeshStandardMaterial({ color: SIDE_COLORS[side], roughness: 0.32, metalness: 0.12 })
  );
  handlePivot.add(ring);

  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.02, 0.02),
    new THREE.MeshStandardMaterial({ color: SIDE_COLORS[side], roughness: 0.28, metalness: 0.14 })
  );
  grip.position.set(0, 0, 0.018);
  handlePivot.add(grip);

  group.add(handlePivot);

  return { group, handlePivot };
}

function syncStoneMesh(stone) {
  stone.mesh.group.position.set(stone.position.x, stone.position.y, STONE_HEIGHT * 0.5);
}

function removeStone(stone) {
  if (stone.removed) return;
  stone.removed = true;
  stone.moving = false;
  stone.velocity.set(0, 0);
  stone.mesh.group.visible = false;
}

function removeStoneMesh(stone) {
  if (!stone?.mesh?.group) return;
  scene.remove(stone.mesh.group);
}

function loop(now) {
  const rawDt = clamp((now - lastFrameTime) / 1000, 0, 0.03);
  const simSpeed = isAIThrowInProgress() && game.fastForward ? 2 : 1;
  const dt = clamp(rawDt * simSpeed, 0, 0.06);
  lastFrameTime = now;

  update(dt);
  renderer.render(scene, camera);

  requestAnimationFrame(loop);
}

function update(dt) {
  if (!game.started) {
    game.cameraMode = "overview";
    updateStrategyViewButton();
    updateFastForwardButton();
    updateCamera(dt);
    return;
  }

  updateStrategyViewButton();
  updateFastForwardButton();
  game.sweep.boost = Math.max(0, game.sweep.boost - 2.25 * dt);
  updateSweepBar();

  if (game.shotState === "delivery") {
    updateDelivery(dt);
  }

  updatePhysics(dt);
  updateFlashingStones(dt);
  updateBroom(dt);
  updateCamera(dt);

  maybeResolveShotStop();
}

function updateDelivery(dt) {
  const stone = game.activeStone;
  if (!stone || stone.removed) return;

  stone.spinSign = -Math.sign(game.controls.curlInput) || 1;
  stone.spinStrength = Math.abs(game.controls.curlInput);

  const speed = stone.velocity.length();
  const accel = 2.1;
  const nextSpeed = Math.min(stone.targetSpeed, speed + accel * dt);
  if (speed > 0.001) {
    stone.velocity.multiplyScalar(nextSpeed / speed);
  } else {
    stone.velocity.set(0, nextSpeed);
  }

  if (stone.position.y >= RELEASE_LINE_Y) {
    game.shotState = "running";
    game.cameraMode = "follow";
    const aiTurn = game.mode === "1p" && game.activeSide === 1;
    showControlPanel(aiTurn ? null : "sweep");
    el.statusLabel.textContent = aiTurn ? "AI sweeping..." : "Sweep to reduce friction and carry farther.";
  }
}

function updatePhysics(dt) {
  const livingStones = game.stones.filter((s) => !s.removed);
  if (livingStones.length === 0) return;

  livingStones.forEach((stone) => {
    if (!stone.moving) return;

    if (stone.position.y >= FAR_HOG_Y) stone.crossedFarHog = true;

    const speed = stone.velocity.length();
    if (speed < LOW_SPEED_SETTLE) {
      stone.lowSpeedTime += dt;
    } else {
      stone.lowSpeedTime = 0;
    }

    if (speed <= STOP_SPEED || stone.lowSpeedTime > 0.18) {
      stone.velocity.set(0, 0);
      stone.moving = false;
      stone.lowSpeedTime = 0;
      enforceStoppedRules(stone);
      return;
    }

    const sweepBoost = resolveSweepBoost(stone);
    const lowSpeedFrictionGain = 1 + clamp((1.25 - speed) / 1.25, 0, 1) * 1.4;
    const backendGain = stone.position.y > FAR_HOG_Y ? 1.15 : 1;
    const mu = clamp(
      BASE_MU * (1 - sweepBoost * 0.45) * lowSpeedFrictionGain * backendGain,
      0.007,
      BASE_MU * 2.7
    );

    const frictionDelta = mu * G * dt;
    const nextSpeed = Math.max(0, speed - frictionDelta);

    const dir = stone.velocity.clone().normalize();
    if (nextSpeed <= 0) {
      stone.velocity.set(0, 0);
    } else {
      stone.velocity.copy(dir.multiplyScalar(nextSpeed));
    }

    if (stone.spinStrength > CURL_DEAD_ZONE && stone.velocity.lengthSq() > 0.03) {
      const velDir = stone.velocity.clone().normalize();
      const perp = new THREE.Vector2(-velDir.y, velDir.x);
      const progress = clamp((stone.position.y - RELEASE_LINE_Y) / (TEE_Y - RELEASE_LINE_Y + 8), 0, 1);
      const lateCurlGain = 0.08 + progress * 0.68;
      const speedLoss = clamp(
        (stone.initialSpeed - stone.velocity.length()) / Math.max(stone.initialSpeed, 0.2),
        0,
        1.1
      );
      const curlAccel =
        CURL_COEFFICIENT *
        stone.spinStrength *
        stone.spinSign *
        (lateCurlGain + 0.22 + speedLoss * 0.36);
      stone.velocity.addScaledVector(perp, curlAccel * dt);
    }

    const movement = stone.velocity.clone().multiplyScalar(dt);
    stone.position.add(movement);
    stone.distanceTravelled += movement.length();
    const speedPct = clamp(stone.velocity.length() / 3, 0, 1);
    const visualHandleRate =
      stone.idleSpinDir * HANDLE_IDLE_ROTATION_SPEED * (0.45 + speedPct * 0.55) +
      stone.spinSign * stone.spinStrength * 7;
    stone.handleSpin += visualHandleRate * dt;
    const microT = performance.now() * 0.009 + stone.handleIdlePhase;
    const microTilt = (0.012 + speedPct * 0.02) * (stone.spinStrength < CURL_DEAD_ZONE ? 1.2 : 1);

    if (stone.position.x <= -SHEET_WIDTH / 2 + STONE_RADIUS + SIDEWALL_HIT_MARGIN) {
      stone.position.x = -SHEET_WIDTH / 2 + STONE_RADIUS;
      stone.velocity.x = Math.abs(stone.velocity.x) * 0.22;
      stone.velocity.y *= 0.9;
      markSideWallAlert(false);
      flagStoneForDeferredRemoval(stone, "sidewall");
    }

    if (stone.position.x >= SHEET_WIDTH / 2 - STONE_RADIUS - SIDEWALL_HIT_MARGIN) {
      stone.position.x = SHEET_WIDTH / 2 - STONE_RADIUS;
      stone.velocity.x = -Math.abs(stone.velocity.x) * 0.22;
      stone.velocity.y *= 0.9;
      markSideWallAlert(true);
      flagStoneForDeferredRemoval(stone, "sidewall");
    }

    if (stone.position.y >= BACK_LINE_Y - STONE_RADIUS - BACKWALL_HIT_MARGIN) {
      stone.position.y = BACK_LINE_Y - STONE_RADIUS;
      stone.velocity.y = -Math.abs(stone.velocity.y) * 0.22;
      stone.velocity.x *= 0.9;
      markEndWallAlert();
      flagStoneForDeferredRemoval(stone, "endwall");
    } else if (stone.position.y < -BACK_LINE_Y - STONE_RADIUS) {
      removeStone(stone);
    }

    syncStoneMesh(stone);
    stone.mesh.handlePivot.rotation.z = stone.handleSpin;
    stone.mesh.handlePivot.rotation.x = Math.sin(microT) * microTilt;
    stone.mesh.handlePivot.rotation.y = Math.cos(microT * 0.92) * microTilt * 0.65;
  });

  resolveCollisions();
}

function resolveSweepBoost(stone) {
  if (stone !== game.activeStone || game.shotState !== "running") return 0;

  const aiTurn = game.mode === "1p" && game.activeSide === 1;
  if (!aiTurn) return game.sweep.boost;

  const y = stone.position.y;
  const approach = clamp((y - RELEASE_LINE_Y) / (TEE_Y - RELEASE_LINE_Y + 0.01), 0, 1);
  const lateReduce = 1 - clamp((y - TEE_Y + 2.5) / 7, 0, 1);
  game.sweep.aiBoost = stone.aiSweep * (0.8 + 0.2 * (1 - approach)) * lateReduce;
  return game.sweep.aiBoost;
}

function resolveCollisions() {
  const active = game.stones.filter((s) => !s.removed);
  const minDist = STONE_RADIUS * 2;

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      const delta = b.position.clone().sub(a.position);
      const dist = delta.length();
      if (dist <= 0 || dist >= minDist) continue;

      const normal = delta.clone().multiplyScalar(1 / dist);
      const overlap = minDist - dist;
      a.position.addScaledVector(normal, -overlap * 0.5);
      b.position.addScaledVector(normal, overlap * 0.5);

      const relativeVelocity = b.velocity.clone().sub(a.velocity);
      const velAlongNormal = relativeVelocity.dot(normal);

      if (velAlongNormal <= 0) {
        const restitution = 0.86;
        const impulseMag = (-(1 + restitution) * velAlongNormal) / 2;
        const impulse = normal.clone().multiplyScalar(impulseMag);
        a.velocity.addScaledVector(impulse, -1);
        b.velocity.add(impulse);

        const tangent = new THREE.Vector2(-normal.y, normal.x);
        const tangentVel = relativeVelocity.dot(tangent);
        const frictionImpulse = tangent.clone().multiplyScalar(tangentVel * 0.02);
        a.velocity.add(frictionImpulse);
        b.velocity.addScaledVector(frictionImpulse, -1);

        a.moving = true;
        b.moving = true;
        a.touchedStone = true;
        b.touchedStone = true;
      }

      syncStoneMesh(a);
      syncStoneMesh(b);
    }
  }
}

function enforceStoppedRules(stone) {
  if (stone.removed) return;
  if (stone.flaggedForRemoval) return;
  if (stone.activeThisShot) {
    if (!stone.crossedFarHog && !stone.touchedStone) {
      removeStone(stone);
      return;
    }
  }

  if (stone.position.y > BACK_LINE_Y || stone.position.y < -BACK_LINE_Y) {
    removeStone(stone);
  }
}

function maybeResolveShotStop() {
  if (!["delivery", "running"].includes(game.shotState)) return;
  if (game.awaitingShotResolution) return;

  const moving = game.stones.some((stone) => !stone.removed && stone.moving);
  if (moving) return;

  game.awaitingShotResolution = true;
  game.shotState = "settled";
  game.cameraMode = "overview";
  broomMesh.visible = false;
  showControlPanel(null);

  if (game.activeStone) {
    enforceStoppedRules(game.activeStone);
    game.activeStone.activeThisShot = false;
  }

  const nextStoneNum = game.currentShot + 2;
  el.statusLabel.textContent = nextStoneNum <= totalShots() ? `Stone ${nextStoneNum} coming up.` : "End complete.";

  setTimeout(() => {
    if (!game.started) return;
    game.currentShot += 1;
    if (game.currentShot >= totalShots()) {
      finishEnd();
    } else {
      startNextShot();
    }
  }, TURN_RESOLVE_DELAY_MS);
}

function finishEnd() {
  const inHouse = getStonesInHouse();
  const endedEnd = game.end;

  let scoringSide = null;
  let points = 0;

  if (inHouse.length > 0) {
    scoringSide = inHouse[0].side;
    const opponentBest = inHouse.find((stone) => stone.side !== scoringSide)?.distance ?? Number.POSITIVE_INFINITY;
    points = inHouse.filter((stone) => stone.side === scoringSide && stone.distance < opponentBest).length;
  }

  if (scoringSide !== null && points > 0) {
    game.scores[scoringSide] += points;
    game.hammerSide = 1 - scoringSide;
    game.lastWinner = scoringSide;
  }

  game.firstThrowSide = 1 - game.hammerSide;
  game.currentShot = 0;
  game.shotState = "end_review";
  game.cameraMode = "house_overhead";
  game.strategyView = false;
  game.fastForward = false;
  game.awaitingShotResolution = false;
  broomMesh.visible = false;
  showControlPanel(null);
  setThrowButtonReady(false);
  el.statusLabel.textContent = "End complete. Review the house and scoring.";

  const isFinalEnd = endedEnd >= game.maxEnds;
  game.pendingEndReview = {
    endedEnd,
    scoringSide,
    points,
    isFinalEnd
  };

  updateHUD();
  showEndReviewPanel(game.pendingEndReview, inHouse);
}

function finishMatch() {
  game.started = false;
  game.pendingEndReview = null;
  hideEndReviewPanel();
  showControlPanel(null);
  broomMesh.visible = false;
  game.fastForward = false;
  updateFastForwardButton();
  game.shotState = "game_over";
  game.cameraMode = "house_overhead";
  game.strategyView = false;
  updateStrategyViewButton();
  showGameOverOverlay();
  updateHUD();
}

function resetStonesForNextEnd() {
  game.stones.forEach(removeStoneMesh);
  game.stones = [];
  game.activeStone = null;
  game.shotState = "idle";
  game.awaitingShotResolution = false;
  game.pendingEndReview = null;
  game.fastForward = false;
  game.sweep.boost = 0;
  game.sweep.aiBoost = 0;
}

function getStonesInHouse() {
  const list = [];
  game.stones.forEach((stone) => {
    if (stone.removed) return;
    if (stone.flaggedForRemoval) return;
    const dist = stone.position.distanceTo(new THREE.Vector2(0, TEE_Y));
    if (dist <= HOUSE_RADIUS + STONE_RADIUS) {
      list.push({ ...stone, distance: dist });
    }
  });

  list.sort((a, b) => a.distance - b.distance);
  return list;
}

function updateBroom(dt) {
  if (game.shotState !== "running" || !game.activeStone || game.activeStone.removed) {
    broomMesh.visible = false;
    return;
  }

  broomMesh.visible = true;
  const boost = resolveSweepBoost(game.activeStone);
  const wobble = Math.sin(performance.now() * 0.017) * (0.002 + boost * 0.11);
  broomMesh.position.x = game.activeStone.position.x + wobble;
  broomMesh.position.y = game.activeStone.position.y + 0.9;
  broomMesh.position.z = 0.08;

  broomMesh.rotation.z = Math.sin(performance.now() * 0.02) * (0.01 + boost * 0.22);
  broomMesh.rotation.x = 0;

  game.sweep.boost = clamp(game.sweep.boost - dt * 0.08, 0, 1);
}

function updateSweepBar() {
  const boost = game.mode === "1p" && game.activeSide === 1 ? game.sweep.aiBoost : game.sweep.boost;
  el.sweepFill.style.width = `${Math.round(clamp(boost, 0, 1) * 100)}%`;
}

function updateCamera(dt) {
  if (!camera) return;

  if (game.strategyView) {
    cameraTargetPos.set(0, TEE_Y, 17.2);
    cameraTargetLook.set(0, TEE_Y, 0);
    camera.position.lerp(cameraTargetPos, 1 - Math.pow(0.0015, dt));
    cameraLook.lerp(cameraTargetLook, 1 - Math.pow(0.0015, dt));
    camera.lookAt(cameraLook);
    return;
  }

  if (game.cameraMode === "overview") {
    cameraTargetPos.set(0, 0, 27);
    cameraTargetLook.set(0, 0, 0);
  }

  if (["start", "delivery", "positioning", "power", "curl_setup"].includes(game.cameraMode) && game.activeStone && !game.activeStone.removed) {
    const x = game.activeStone.position.x;
    cameraTargetPos.set(x * 0.65, HACK_Y + 3.6, 8.9);
    cameraTargetLook.set(x, HACK_Y + 7.5, 0);
  }

  if (game.cameraMode === "follow" && game.activeStone && !game.activeStone.removed) {
    const x = game.activeStone.position.x;
    const y = game.activeStone.position.y;
    const houseApproach = clamp((y - (TEE_Y - 9)) / 9, 0, 1);
    const midThrowBlend = clamp((y - RELEASE_LINE_Y) / (TEE_Y - RELEASE_LINE_Y), 0, 1);
    cameraTargetPos.set(
      x * lerp(0.92, 0.68, houseApproach),
      clamp(y - lerp(6.9, 7.2, houseApproach), HACK_Y + 2.1, 14.2),
      lerp(8.6, 9.4, houseApproach) - midThrowBlend * 0.5
    );
    cameraTargetLook.set(
      x * lerp(0.52, 0.34, houseApproach),
      clamp(y + lerp(0.7, 1.45, houseApproach), HACK_Y + 6.2, TEE_Y + 1.1),
      0
    );
  }

  if (game.cameraMode === "house_overhead") {
    cameraTargetPos.set(0, TEE_Y, 17.8);
    cameraTargetLook.set(0, TEE_Y, 0);
  }

  camera.position.lerp(cameraTargetPos, 1 - Math.pow(0.0015, dt));
  cameraLook.lerp(cameraTargetLook, 1 - Math.pow(0.0015, dt));
  camera.lookAt(cameraLook);
}

function updateHUD() {
  const c0 = COUNTRIES[game.countriesBySide[0]];
  const c1 = COUNTRIES[game.countriesBySide[1]];

  el.team0Label.textContent = `${c0.flag} ${c0.name} (P1)`;
  el.team1Label.textContent = `${c1.flag} ${c1.name} (${game.mode === "1p" ? "AI" : "P2"})`;

  el.score0Label.textContent = String(game.scores[0]);
  el.score1Label.textContent = String(game.scores[1]);
  renderRemainingStoneIcons();

  const displayEnd = clamp(game.end, 1, game.maxEnds);
  el.endLabel.textContent = `${displayEnd} / ${game.maxEnds}`;

  if (game.shotState === "end_review") {
    el.shotLabel.textContent = "End Complete";
  } else {
    const shotsPerEnd = totalShots();
    const shotNum = clamp(game.currentShot + 1, 1, shotsPerEnd);
    el.shotLabel.textContent = `Stone ${shotNum} / ${shotsPerEnd}`;
  }

  if (!game.started) {
    el.turnLabel.textContent = "Current throw: waiting for new game";
    return;
  }

  if (game.shotState === "end_review") {
    el.turnLabel.textContent = "Review scoring, then continue";
    return;
  }

  const side = game.activeSide;
  const sideCountry = COUNTRIES[game.countriesBySide[side]];
  const sideName = side === 1 && game.mode === "1p" ? "AI" : SIDE_TEXT[side];
  const hammerText = game.hammerSide === side ? " (Hammer)" : "";
  el.turnLabel.textContent = `Current throw: ${sideCountry.flag} ${sideName}${hammerText}`;
}

function countryLabel(side) {
  const c = COUNTRIES[game.countriesBySide[side]];
  return `${c.flag} ${c.name}`;
}

function showMessage(title, body, duration = 1800) {
  el.messageTitle.textContent = title;
  el.messageBody.textContent = body;
  el.messageOverlay.classList.remove("hidden");
  el.messageOverlay.classList.add("flex");

  if (duration > 0) {
    setTimeout(() => {
      hideMessage();
    }, duration);
  }
}

function hideMessage() {
  el.messageOverlay.classList.add("hidden");
  el.messageOverlay.classList.remove("flex");
}
