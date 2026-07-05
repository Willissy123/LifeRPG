import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap');

@keyframes floatIdle { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes heroAttack {
  0%   { transform: translateX(0) rotate(0deg); }
  18%  { transform: translateX(-16px) rotate(8deg) scale(0.96); }
  42%  { transform: translateX(150px) rotate(-14deg) scale(1.06); }
  58%  { transform: translateX(150px) rotate(-4deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
@keyframes enemyAttackDash {
  0%   { transform: translateX(0) rotate(0deg); }
  18%  { transform: translateX(16px) rotate(-8deg) scale(0.96); }
  42%  { transform: translateX(-150px) rotate(14deg) scale(1.06); }
  58%  { transform: translateX(-150px) rotate(4deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
@keyframes hurtKnock {
  0%   { transform: translateX(0) rotate(0deg); filter: brightness(1); }
  18%  { transform: translateX(26px) rotate(9deg); filter: brightness(3) saturate(0.3); }
  45%  { transform: translateX(14px) rotate(4deg); filter: brightness(1.8); }
  70%  { transform: translateX(-4px) rotate(-2deg); filter: brightness(1.2); }
  100% { transform: translateX(0) rotate(0deg); filter: brightness(1); }
}
@keyframes hurtKnockLeft {
  0%   { transform: translateX(0) rotate(0deg); filter: brightness(1); }
  18%  { transform: translateX(-26px) rotate(-9deg); filter: brightness(3) saturate(0.3); }
  45%  { transform: translateX(-14px) rotate(-4deg); filter: brightness(1.8); }
  70%  { transform: translateX(4px) rotate(2deg); filter: brightness(1.2); }
  100% { transform: translateX(0) rotate(0deg); filter: brightness(1); }
}
@keyframes impactRing { 0% { transform: scale(0.2); opacity: 0.95; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes flashWhite { 0% { opacity: 0.85; } 100% { opacity: 0; } }
@keyframes weaponTrail {
  0%   { opacity: 0; transform: rotate(-50deg) scaleX(0.3); }
  35%  { opacity: 1; transform: rotate(10deg) scaleX(1.15); }
  100% { opacity: 0; transform: rotate(45deg) scaleX(1.2); }
}
@keyframes deathFall { to { transform: translateY(24px) rotate(20deg) scale(0.55); opacity: 0; } }
@keyframes floatUpFade { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-52px) scale(1.15); opacity: 0; } }
@keyframes screenShake { 0%,100% { transform: translate(0,0); } 20% { transform: translate(-5px,3px); } 40% { transform: translate(5px,-3px); } 60% { transform: translate(-4px,-2px); } 80% { transform: translate(4px,2px); } }
@keyframes particleBurst { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; } }
@keyframes cardDraw { 0% { transform: translateY(24px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes swordSwing { 0% { transform: rotate(-10deg); } 40% { transform: rotate(70deg); } 100% { transform: rotate(-10deg); } }
@keyframes streakPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes shieldGlow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes phaseBanner { 0% { transform: scale(0.6); opacity: 0; } 20% { transform: scale(1.1); opacity: 1; } 80% { transform: scale(1); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
@keyframes campfireFlicker { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }
`;

const C = {
  bg: "#0D0B14", bg2: "#161222", panel: "#1E1830", panelLight: "#2A2242",
  gold: "#D4AF37", teal: "#4FD1C5", red: "#E14B4B", crimson: "#9B1B30",
  green: "#5FBF77", purple: "#9D7BEA", blue: "#5B8DEF", orange: "#E8853D",
  text: "#EFE9F7", muted: "#8B82A3", line: "#3A3155",
};

const DIFF = {
  easy: { dmg: 7, color: C.green, label: "EASY", gold: 4 },
  medium: { dmg: 12, color: C.gold, label: "MEDIUM", gold: 7 },
  hard: { dmg: 18, color: C.red, label: "HARD", gold: 11 },
};

const ROLES = {
  strike: { icon: "⚔️", name: "STRIKE", color: C.gold, desc: "Deal full damage" },
  shield: { icon: "🛡️", name: "SHIELD", color: C.blue, desc: "Half damage + block the next enemy attack" },
  drain:  { icon: "🩸", name: "DRAIN", color: C.green, desc: "70% damage + heal 6 HP" },
  gambit: { icon: "🎲", name: "GAMBIT", color: C.red, desc: "DOUBLE damage — but wrong = take the enemy's hit now" },
};
const ROLE_CYCLE = ["strike", "shield", "strike", "drain", "strike", "gambit"];

const ABILITIES = {
  none:    { name: null, desc: null },
  blur:    { name: "Blur", desc: "Obscures one answer option in fog" },
  shuffle: { name: "Second-Guess", desc: "Reshuffles your options after 3 seconds" },
  crush:   { name: "Time Crush", desc: "Question timer runs at half length" },
  steal:   { name: "Sap Focus", desc: "Steals 1 energy every second turn" },
  dread:   { name: "Dread", desc: "Wrong answers deal 5 damage to you" },
  recall:  { name: "Total Recall", desc: "Re-asks the questions you got wrong this run. Wrong answers cost 7 HP. Enrages at half health." },
};

const ACTS = [
  {
    name: "The Fog Realm", tagline: "Where half-remembered things drift", theme: C.teal,
    bgGrad: "radial-gradient(circle at 50% 30%, #16323255 0%, transparent 70%)",
    pools: ["easy"],
    fight:    { name: "Fog Wisp", kind: "wisp", hp: 22, intentMin: 4, intentMax: 7, ability: "none" },
    guardian: { name: "Doubt Specter", kind: "specter", hp: 30, intentMin: 5, intentMax: 8, ability: "blur" },
  },
  {
    name: "The Doubt Woods", tagline: "Every path looks almost right", theme: C.purple,
    bgGrad: "radial-gradient(circle at 50% 30%, #2E1E4A66 0%, transparent 70%)",
    pools: ["easy", "medium"],
    fight:    { name: "Blank Mind", kind: "blank", hp: 40, intentMin: 7, intentMax: 11, ability: "shuffle" },
    guardian: { name: "Cramming Golem", kind: "golem", hp: 48, intentMin: 8, intentMax: 12, ability: "crush" },
  },
  {
    name: "The Cram Depths", tagline: "Everything you skimmed lives down here", theme: C.gold,
    bgGrad: "radial-gradient(circle at 50% 30%, #4A3A0E55 0%, transparent 70%)",
    pools: ["medium", "hard"],
    fight:    { name: "Procrastination Wraith", kind: "wraith", hp: 56, intentMin: 9, intentMax: 14, ability: "steal" },
    guardian: { name: "Anxiety Revenant", kind: "revenant", hp: 64, intentMin: 11, intentMax: 16, ability: "dread" },
  },
  {
    name: "FINAL EXAM", tagline: "It remembers everything you got wrong.", theme: C.crimson,
    bgGrad: "radial-gradient(circle at 50% 30%, #4A0A1466 0%, transparent 70%)",
    pools: ["hard"],
    boss: { name: "The Forgetting", kind: "boss", hp: 110, intentMin: 13, intentMax: 20, boss: true, negativeMarking: true, ability: "recall" },
  },
];

const CHARACTERS = {
  scholar: { id: "scholar", icon: "📖", name: "The Scholar", hp: 60, timerMod: 8, goldMod: 1, gambitMod: 2, desc: "+8s on every timer, but fragile (60 HP)" },
  soldier: { id: "soldier", icon: "🪖", name: "The Soldier", hp: 90, timerMod: -4, goldMod: 1, gambitMod: 2, desc: "Tough (90 HP), but timers run 4s shorter" },
  gambler: { id: "gambler", icon: "🎲", name: "The Gambler", hp: 70, timerMod: 0, goldMod: 1.5, gambitMod: 2.5, desc: "1.5× gold, Gambits hit 2.5× — high risk, high roll" },
};

const UNLOCKS = [
  { id: "vigor", icon: "📕", name: "Enduring Vigor", desc: "+10 starting HP on every run", cost: 50 },
  { id: "satchel", icon: "🎒", name: "Alchemist's Satchel", desc: "Start every run with 2 potions", cost: 40 },
  { id: "hourglass", icon: "⏳", name: "Eternal Hourglass", desc: "+4s on every question timer, always", cost: 60 },
  { id: "purse", icon: "💰", name: "Deep Purse", desc: "Start every run with +20 gold", cost: 30 },
];

const SHOP_ITEMS = [
  { id: "potion", name: "Memory Potion", desc: "Heal 20 HP. Usable in battle.", cost: 25, icon: "🧪" },
  { id: "insight", name: "Insight Scroll", desc: "Removes 2 wrong options on an MCQ.", cost: 30, icon: "📜" },
  { id: "maxhp", name: "Tome of Vigor", desc: "+15 max HP this run.", cost: 45, icon: "📕" },
  { id: "energy", name: "Focus Relic", desc: "+1 energy every turn this run.", cost: 70, icon: "💠" },
  { id: "timer", name: "Still Hourglass", desc: "+8s per question this run.", cost: 40, icon: "⏳" },
  { id: "upgrade", name: "Whetstone", desc: "Upgrade a card: +50% damage forever this run.", cost: 35, icon: "🪨" },
];

const BASE_TIMER = 22;
const SAVE_KEY = "forgetting-spire-save";

// ---------- Seeded RNG (for Daily Climb mode) ----------
let rng = Math.random;
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function setDailySeed(on) {
  if (on) {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    rng = mulberry32(seed);
  } else {
    rng = Math.random;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function randInt(min, max) { return min + Math.floor(rng() * (max - min + 1)); }

// ---------- Persistent save (localStorage) ----------
const DEFAULT_SAVE = { wisdom: 0, unlocks: {}, topicStats: {}, runs: [], bestFloor: 0, wins: 0 };

async function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? { ...DEFAULT_SAVE, ...JSON.parse(raw) } : { ...DEFAULT_SAVE };
  } catch { return { ...DEFAULT_SAVE }; }
}
async function persistSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {}
}

// ---------- Sound (Tone.js, initialised on first tap) ----------
const sound = { ready: false, muted: false, synth: null, noise: null };
async function initSound() {
  if (sound.ready) return;
  try {
    await Tone.start();
    sound.synth = new Tone.PolySynth(Tone.Synth, { volume: -14 }).toDestination();
    sound.ready = true;
  } catch {}
}
function sfx(kind) {
  if (!sound.ready || sound.muted || !sound.synth) return;
  try {
    const now = Tone.now();
    if (kind === "hit") { sound.synth.triggerAttackRelease("C5", "16n", now); sound.synth.triggerAttackRelease("G5", "16n", now + 0.06); }
    if (kind === "crit") { sound.synth.triggerAttackRelease("E5", "16n", now); sound.synth.triggerAttackRelease("B5", "16n", now + 0.05); sound.synth.triggerAttackRelease("E6", "8n", now + 0.1); }
    if (kind === "miss") { sound.synth.triggerAttackRelease("Eb3", "8n", now); sound.synth.triggerAttackRelease("D3", "8n", now + 0.12); }
    if (kind === "hurt") { sound.synth.triggerAttackRelease("G2", "8n", now); }
    if (kind === "block") { sound.synth.triggerAttackRelease("A4", "16n", now); sound.synth.triggerAttackRelease("A4", "16n", now + 0.08); }
    if (kind === "gold") { sound.synth.triggerAttackRelease("A5", "32n", now); sound.synth.triggerAttackRelease("C6", "32n", now + 0.05); }
    if (kind === "win") { ["C5","E5","G5","C6"].forEach((n, i) => sound.synth.triggerAttackRelease(n, "8n", now + i * 0.12)); }
    if (kind === "lose") { ["C4","B3","Bb3","A3"].forEach((n, i) => sound.synth.triggerAttackRelease(n, "4n", now + i * 0.18)); }
    if (kind === "tick") { sound.synth.triggerAttackRelease("C6", "64n", now); }
    if (kind === "phase") { sound.synth.triggerAttackRelease("C3", "2n", now); sound.synth.triggerAttackRelease("Gb3", "2n", now + 0.02); }
    if (kind === "fire") { sound.synth.triggerAttackRelease("E4", "8n", now); sound.synth.triggerAttackRelease("G4", "4n", now + 0.15); }
  } catch {}
}

// ---------- API + parsing ----------
function callClaude(content) {
  return fetch("/api/claude-messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 1000, messages: [{ role: "user", content }] }),
  }).then((r) => r.json());
}

function extractText(data) {
  try { return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n"); } catch { return ""; }
}

function salvageQuestions(text) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const results = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const obj = JSON.parse(cleaned.slice(start, i + 1));
          if (obj && obj.question && obj.answer) results.push(obj);
        } catch {}
        start = -1;
      }
    }
  }
  return results;
}

// ---------- Fuzzy answer matching ----------
function normalizeAns(s) {
  return String(s || "").toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(the|a|an|of|to|in|is|are)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function isCloseMatch(chosen, answer) {
  const c = normalizeAns(chosen), a = normalizeAns(answer);
  if (!c || c.length < 2) return false;
  if (c === a) return true;
  if (a.includes(c) && c.length >= 3) return true;
  if (c.includes(a) && a.length >= 3) return true;
  const ratio = 1 - levenshtein(c, a) / Math.max(a.length, c.length);
  if (ratio >= 0.75) return true;
  const aTokens = a.split(" ").filter((t) => t.length > 2);
  if (aTokens.length === 0) return false;
  const cTokens = new Set(c.split(" "));
  const hits = aTokens.filter((t) => cTokens.has(t) || [...cTokens].some((ct) => ct.length > 2 && (1 - levenshtein(ct, t) / Math.max(ct.length, t.length)) >= 0.8)).length;
  return hits / aTokens.length >= 0.6;
}

// ---------- Run map generation (branching) ----------
// Each act: floor 1 = choice(fight | elite), floor 2 = choice(campfire | mystery), floor 3 = guardian.
// Act 4 = final boss only. 10 floors total.
function generateRunMap() {
  const map = [];
  for (let a = 0; a < 3; a++) {
    map.push({ actIdx: a, kind: "choice", options: [
      { type: "fight", enemy: { ...ACTS[a].fight, actIdx: a } },
      { type: "elite", enemy: eliteOf(ACTS[a].fight, a) },
    ]});
    map.push({ actIdx: a, kind: "choice", options: shuffle([
      { type: "campfire" },
      { type: "mystery" },
    ])});
    map.push({ actIdx: a, kind: "guardian", enemy: { ...ACTS[a].guardian, actIdx: a } });
  }
  map.push({ actIdx: 3, kind: "boss", enemy: { ...ACTS[3].boss, actIdx: 3 } });
  return map;
}
function eliteOf(base, actIdx) {
  return {
    ...base, actIdx, elite: true,
    name: "Elite " + base.name,
    hp: Math.round(base.hp * 1.45),
    intentMin: base.intentMin + 2, intentMax: base.intentMax + 3,
  };
}

const STAGES = {
  TITLE: "title", INPUT: "input", GENERATING: "generating", CHARACTER: "character", DRAFT: "draft",
  ACT_INTRO: "act_intro", MAP: "map", BRIEF: "brief", BATTLE: "battle", SHOP: "shop",
  CAMPFIRE: "campfire", MYSTERY: "mystery", SANCTUM: "sanctum",
  GAMEOVER: "gameover", VICTORY: "victory", ERROR: "error",
};
export default function ForgettingSpire() {
  const [stage, setStage] = useState(STAGES.TITLE);
  const [save, setSave] = useState({ ...DEFAULT_SAVE });
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [docText, setDocText] = useState("");
  const [pdfData, setPdfData] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [dailyMode, setDailyMode] = useState(false);
  const [pool, setPool] = useState([]);
  const [deckIds, setDeckIds] = useState([]);
  const [upgraded, setUpgraded] = useState([]);
  const [character, setCharacter] = useState(null);
  const [runMap, setRunMap] = useState([]);
  const [floorIndex, setFloorIndex] = useState(0);
  const [usedIds, setUsedIds] = useState([]);
  const [missedIds, setMissedIds] = useState([]);
  const [playerHp, setPlayerHp] = useState(70);
  const [playerMaxHp, setPlayerMaxHp] = useState(70);
  const [gold, setGold] = useState(15);
  const [potions, setPotions] = useState(1);
  const [insights, setInsights] = useState(0);
  const [energyBonus, setEnergyBonus] = useState(0);
  const [timerBonus, setTimerBonus] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingLine, setLoadingLine] = useState(0);
  const [missedTopics, setMissedTopics] = useState([]);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [swiftCount, setSwiftCount] = useState(0);
  const [muted, setMuted] = useState(false);

  const [enemy, setEnemy] = useState(null);
  const [enemyHp, setEnemyHp] = useState(0);
  const [enemyIntent, setEnemyIntent] = useState(0);
  const [bossPhase2, setBossPhase2] = useState(false);
  const [phaseBannerKey, setPhaseBannerKey] = useState(0);
  const [drawPile, setDrawPile] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [hand, setHand] = useState([]);
  const [energy, setEnergy] = useState(3);
  const [turnCount, setTurnCount] = useState(0);
  const [playerBlock, setPlayerBlock] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [answerVal, setAnswerVal] = useState("");
  const [revealed, setRevealed] = useState(null);
  const [hiddenOptions, setHiddenOptions] = useState([]);
  const [blurredOption, setBlurredOption] = useState(null);
  const [displayOptions, setDisplayOptions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [log, setLog] = useState([]);
  const [pendingDeck, setPendingDeck] = useState([]);
  const [mysteryEvent, setMysteryEvent] = useState(null);
  const [campfireCard, setCampfireCard] = useState(null);
  const [campfireResult, setCampfireResult] = useState(null);
  const [campfireAnswer, setCampfireAnswer] = useState("");
  const [draftOffers, setDraftOffers] = useState({ easy: [], medium: [], hard: [] });
  const [draftPicks, setDraftPicks] = useState([]);
  const [copied, setCopied] = useState(false);

  const [timeLeft, setTimeLeft] = useState(BASE_TIMER);
  const [timerMax, setTimerMax] = useState(BASE_TIMER);
  const timerRef = useRef(null);
  const activeCardRef = useRef(null);
  const revealedRef = useRef(null);
  const lastTickRef = useRef(0);
  const bossPhase2Ref = useRef(false);
  const saveRef = useRef(save);
  const turnBusyRef = useRef(false);
  const closingRef = useRef(false);

  const [playerAnim, setPlayerAnim] = useState("idle");
  const [playerAnimKey, setPlayerAnimKey] = useState(0);
  const [enemyAnim, setEnemyAnim] = useState("idle");
  const [enemyAnimKey, setEnemyAnimKey] = useState(0);
  const [enemyDying, setEnemyDying] = useState(false);
  const [popups, setPopups] = useState([]);
  const [slashKey, setSlashKey] = useState(0);
  const [showSlash, setShowSlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [particles, setParticles] = useState([]);
  const [impacts, setImpacts] = useState([]);

  useEffect(() => { activeCardRef.current = activeCard; }, [activeCard]);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);
  useEffect(() => { bossPhase2Ref.current = bossPhase2; }, [bossPhase2]);
  useEffect(() => { saveRef.current = save; }, [save]);

  useEffect(() => {
    loadSave().then((s) => { setSave(s); setSaveLoaded(true); });
  }, []);

  function updateSave(mutator) {
    setSave((prev) => {
      const next = mutator({ ...prev, topicStats: { ...prev.topicStats }, unlocks: { ...prev.unlocks }, runs: [...prev.runs] });
      persistSave(next);
      return next;
    });
  }

  function recordTopicResult(topic, correct) {
    updateSave((s) => {
      const t = s.topicStats[topic] || { c: 0, w: 0 };
      s.topicStats[topic] = correct ? { ...t, c: t.c + 1 } : { ...t, w: t.w + 1 };
      return s;
    });
  }

  const loadingLines = [
    "BINDING KNOWLEDGE INTO CARDS...",
    "FORGING THREE TIERS OF POWER...",
    "TEACHING ENEMIES THEIR TRICKS...",
    "SUMMONING THE SPIRE...",
    "DECK READY.",
  ];

  useEffect(() => {
    if (stage !== STAGES.GENERATING) return;
    const id = setInterval(() => setLoadingLine((n) => Math.min(n + 1, loadingLines.length - 1)), 650);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== STAGES.BATTLE || !activeCard || revealed) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const nt = Math.max(0, t - 0.1);
        if (nt < timerMax * 0.25 && nt > 0 && Math.floor(nt) !== lastTickRef.current) {
          lastTickRef.current = Math.floor(nt);
          sfx("tick");
        }
        return nt;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [stage, activeCard, revealed, timerMax]);

  useEffect(() => {
    if (timeLeft === 0 && activeCard && !revealed && stage === STAGES.BATTLE) resolveAnswer(null, true);
  }, [timeLeft]);

  function popText(side, text, color) {
    const id = Math.random().toString(36).slice(2) + Date.now();
    setPopups((p) => [...p, { id, side, text, color }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  }
  function popImpact(side, color) {
    const id = Math.random().toString(36).slice(2) + Date.now();
    setImpacts((arr) => [...arr, { id, side, color }]);
    setTimeout(() => setImpacts((arr) => arr.filter((x) => x.id !== id)), 550);
  }
  function burstParticles(side, color) {
    const burst = Array.from({ length: 10 }).map(() => ({
      id: Math.random().toString(36).slice(2), side, color,
      dx: (Math.random() - 0.5) * 120 + "px", dy: (Math.random() - 0.8) * 100 + "px",
    }));
    setParticles((p) => [...p, ...burst]);
    setTimeout(() => setParticles((p) => p.filter((x) => !burst.find((b) => b.id === x.id))), 700);
  }
  function doShake() { setShake(true); setTimeout(() => setShake(false), 380); }
  function anim(setter, keySetter, name, dur = 480) {
    setter(name);
    keySetter((k) => k + 1);
    setTimeout(() => setter("idle"), dur);
  }

  function tierPrompt(tier, tierDesc) {
    return `You are generating quiz cards for a knowledge card-battler game.

Generate exactly 8 ${tier} questions from the source material provided. ${tierDesc} Mix multiple-choice (4 options) and short-answer.

Return ONLY a raw JSON array (no markdown, no prose, no preamble), objects shaped exactly like:
[
  {
    "difficulty": "${tier}",
    "type": "mcq",
    "topic": "2-4 word topic label",
    "question": "the question text",
    "options": ["a","b","c","d"],
    "answer": "correct option text if mcq, or correct short answer",
    "explanation": "one short sentence why this is correct"
  }
]
Keep explanations under 15 words. Short-answer questions omit "options".`;
  }

  async function generateDeck() {
    setStage(STAGES.GENERATING);
    setLoadingLine(0);
    setErrorMsg("");
    setDailySeed(dailyMode);
    try {
      const makeContent = (instruction) => {
        if (pdfData) {
          return [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfData } },
            { type: "text", text: instruction },
          ];
        }
        return `Source material:\n"""\n${docText.slice(0, 12000)}\n"""\n\n${instruction}`;
      };

      const tiers = [
        ["easy", "Basic recall, definitions, and simple facts."],
        ["medium", "Application, connections between ideas, and moderately tricky details."],
        ["hard", "Genuinely demanding final-exam level: synthesis, edge cases, precise details."],
      ];

      const settled = await Promise.allSettled(tiers.map(([tier, desc]) => callClaude(makeContent(tierPrompt(tier, desc)))));

      let parsed = [];
      for (let i = 0; i < settled.length; i++) {
        if (settled[i].status !== "fulfilled") continue;
        const text = extractText(settled[i].value);
        const qs = salvageQuestions(text).map((q) => ({ ...q, difficulty: q.difficulty || tiers[i][0] }));
        parsed = parsed.concat(qs);
      }

      parsed = parsed.map((q, i) => ({ ...q, id: `c${i + 1}`, role: ROLE_CYCLE[i % ROLE_CYCLE.length] }));

      const counts = {
        easy: parsed.filter((q) => q.difficulty === "easy").length,
        medium: parsed.filter((q) => q.difficulty === "medium").length,
        hard: parsed.filter((q) => q.difficulty === "hard").length,
      };
      if (parsed.length < 8 || counts.easy < 3) {
        throw new Error(`Only forged ${parsed.length} cards (easy: ${counts.easy}, medium: ${counts.medium}, hard: ${counts.hard}).`);
      }

      setPool(parsed);
      setStage(STAGES.CHARACTER);
    } catch (e) {
      setErrorMsg(`Couldn't forge a full deck. ${e && e.message ? e.message : ""} Try again — or paste more source content.`);
      setStage(STAGES.ERROR);
    }
  }

  function pickCharacter(charId) {
    const ch = CHARACTERS[charId];
    setCharacter(ch);
    const weakness = (q) => {
      const t = saveRef.current.topicStats[q.topic];
      if (!t || t.c + t.w === 0) return 0.5;
      return t.w / (t.c + t.w);
    };
    const byTier = (tier) => shuffle(pool.filter((q) => q.difficulty === tier)).sort((a, b) => weakness(b) - weakness(a)).slice(0, 5);
    setDraftOffers({ easy: byTier("easy"), medium: byTier("medium"), hard: byTier("hard") });
    setDraftPicks([]);
    setStage(STAGES.DRAFT);
  }

  function toggleDraftPick(id) {
    setDraftPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 9 ? [...p, id] : p));
  }

  function confirmDraft() {
    const ch = character;
    const hasU = (u) => !!saveRef.current.unlocks[u];
    const startHp = ch.hp + (hasU("vigor") ? 10 : 0);
    setDeckIds(draftPicks);
    setUpgraded([]);
    setRunMap(generateRunMap());
    setFloorIndex(0);
    setUsedIds([]);
    setMissedIds([]);
    setPlayerHp(startHp);
    setPlayerMaxHp(startHp);
    setGold(15 + (hasU("purse") ? 20 : 0));
    setPotions(hasU("satchel") ? 2 : 1);
    setInsights(0);
    setEnergyBonus(0);
    setTimerBonus((hasU("hourglass") ? 4 : 0) + ch.timerMod);
    setMissedTopics([]);
    setTotalAnswered(0);
    setTotalCorrect(0);
    setBestStreak(0);
    setSwiftCount(0);
    setStage(STAGES.ACT_INTRO);
  }

  function cardById(id) { return pool.find((c) => c.id === id); }

  function battlePoolIds(actIdx) {
    const allowed = ACTS[actIdx].pools;
    let ids = deckIds.filter((id) => { const c = cardById(id); return c && allowed.includes(c.difficulty); });
    if (ids.length < 4) ids = [...deckIds];
    if (ids.length < 4) ids = pool.filter((c) => allowed.includes(c.difficulty)).map((c) => c.id);
    if (ids.length < 4) ids = pool.map((c) => c.id);
    return ids;
  }

  function prepareBattle(enemyDef) {
    let battleDeck;
    if (enemyDef.ability === "recall" && missedIds.length > 0) {
      const hardIds = battlePoolIds(enemyDef.actIdx).filter((id) => !missedIds.includes(id));
      battleDeck = shuffle([...new Set(missedIds)]).concat(shuffle(hardIds));
    } else {
      const ids = battlePoolIds(enemyDef.actIdx);
      const fresh = ids.filter((id) => !usedIds.includes(id));
      battleDeck = shuffle(fresh.length >= 4 ? fresh : ids);
    }
    setPendingDeck(battleDeck);
    setEnemy(enemyDef);
    setStage(STAGES.BRIEF);
  }

  function beginBattle() {
    const e = enemy;
    const battleDeck = pendingDeck;
    turnBusyRef.current = false;
    closingRef.current = false;
    setEnemyHp(e.hp);
    setBossPhase2(false);
    setEnemyIntent(randInt(e.intentMin, e.intentMax));
    setDrawPile(battleDeck.slice(4));
    setHand(battleDeck.slice(0, 4));
    setDiscardPile([]);
    setEnergy(3 + energyBonus);
    setTurnCount(0);
    setPlayerBlock(false);
    setActiveCard(null);
    setAnswerVal("");
    setRevealed(null);
    setHiddenOptions([]);
    setBlurredOption(null);
    setStreak(0);
    setEnemyDying(false);
    setPlayerAnim("idle");
    setEnemyAnim("idle");
    setParticles([]);
    setImpacts([]);
    setLog([e.boss ? `${e.name} rises. It remembers your mistakes.` : `A ${e.name} blocks the path.`]);
    setStage(STAGES.BATTLE);
  }

  function effectiveTimerMax() {
    const crushed = enemy && (enemy.ability === "crush" || (enemy.boss && bossPhase2Ref.current));
    return Math.max(8, (crushed ? BASE_TIMER / 2 : BASE_TIMER) + timerBonus);
  }

  function playCard(id) {
    if (energy < 1 || activeCard) return;
    initSound();
    const card = cardById(id);
    setActiveCard(id);
    setAnswerVal("");
    setRevealed(null);
    setHiddenOptions([]);
    lastTickRef.current = 0;

    const max = effectiveTimerMax();
    setTimerMax(max);
    setTimeLeft(max);

    const opts = card.options || [];
    setDisplayOptions(opts);
    if (card.type === "mcq" && enemy.ability === "blur") {
      const wrong = opts.filter((o) => String(o).trim().toLowerCase() !== String(card.answer).trim().toLowerCase());
      setBlurredOption(wrong.length ? shuffle(wrong)[0] : null);
    } else setBlurredOption(null);
    if (card.type === "mcq" && enemy.ability === "shuffle") {
      setTimeout(() => {
        if (activeCardRef.current === id && !revealedRef.current) {
          setDisplayOptions((prev) => shuffle(prev));
          setLog((l) => [...l, `${enemy.name} second-guesses you — the options shift.`]);
        }
      }, 3000);
    }
  }

  function useInsight() {
    const card = cardById(activeCard);
    if (!card || card.type !== "mcq" || insights < 1 || hiddenOptions.length > 0) return;
    const wrong = (card.options || []).filter((o) => String(o).trim().toLowerCase() !== String(card.answer).trim().toLowerCase());
    setHiddenOptions(shuffle(wrong).slice(0, 2));
    setInsights((n) => n - 1);
    setLog((l) => [...l, "Insight scroll burns away two false paths."]);
  }

  function usePotion() {
    if (potions < 1 || playerHp >= playerMaxHp) return;
    setPotions((n) => n - 1);
    setPlayerHp((hp) => Math.min(playerMaxHp, hp + 20));
    popText("player", "+20", C.green);
    sfx("gold");
    setLog((l) => [...l, "You drink a Memory Potion. +20 HP."]);
  }

  function resolveAnswer(chosen, timedOut = false) {
    const card = cardById(activeCard);
    if (!card || revealedRef.current) return;
    closingRef.current = false;

    const isCorrect = !timedOut && (
      card.type === "mcq"
        ? String(chosen).trim().toLowerCase() === String(card.answer).trim().toLowerCase()
        : isCloseMatch(chosen, card.answer)
    );

    setUsedIds((u) => (u.includes(card.id) ? u : [...u, card.id]));
    setTotalAnswered((n) => n + 1);
    recordTopicResult(card.topic, isCorrect);

    const swift = isCorrect && timeLeft > timerMax * 0.5;
    if (swift) setSwiftCount((n) => n + 1);
    const comboBonus = Math.min(streak * 2, 6);
    const role = card.role || "strike";
    const isUpgraded = upgraded.includes(card.id);

    let dmg = 0, heal = 0, gainBlock = false, selfDmg = 0;
    if (isCorrect) {
      let base = DIFF[card.difficulty].dmg + comboBonus;
      if (isUpgraded) base = Math.round(base * 1.5);
      if (swift) base = Math.round(base * 1.25);
      if (role === "strike") dmg = base;
      if (role === "shield") { dmg = Math.round(base / 2); gainBlock = true; }
      if (role === "drain") { dmg = Math.round(base * 0.7); heal = 6; }
      if (role === "gambit") dmg = Math.round(base * (character ? character.gambitMod : 2));
    } else {
      if (role === "gambit") selfDmg = enemyIntent;
      else if (enemy.ability === "dread") selfDmg = 5;
      else if (enemy.negativeMarking) selfDmg = 7;
    }

    const goldEarn = isCorrect ? Math.round((DIFF[card.difficulty].gold + (swift ? 2 : 0)) * (character ? character.goldMod : 1)) : 0;

    if (isCorrect) {
      setTotalCorrect((n) => n + 1);
      const ns = streak + 1;
      setStreak(ns);
      setBestStreak((b) => Math.max(b, ns));
      setGold((g) => g + goldEarn);
      if (heal) setPlayerHp((hp) => Math.min(playerMaxHp, hp + heal));
      if (gainBlock) setPlayerBlock(true);
    } else {
      setStreak(0);
      setMissedTopics((t) => [...t, card.topic]);
      setMissedIds((m) => (m.includes(card.id) ? m : [...m, card.id]));
    }

    const enemyDefeated = isCorrect && Math.max(0, enemyHp - dmg) <= 0;
    const playerDefeated = !isCorrect && selfDmg > 0 && Math.max(0, playerHp - selfDmg) <= 0;
    setRevealed({ correct: isCorrect, dmg, selfDmg, comboBonus, goldEarn, swift, heal, gainBlock, timedOut, role, enemyDefeated, playerDefeated });
    setEnergy((e) => e - 1);

    if (isCorrect) {
      sfx(role === "gambit" || swift ? "crit" : "hit");
      anim(setPlayerAnim, setPlayerAnimKey, "attack", 700);
      setShowSlash(true);
      setSlashKey((k) => k + 1);
      setTimeout(() => setShowSlash(false), 600);
      setTimeout(() => {
        anim(setEnemyAnim, setEnemyAnimKey, "hurt", 600);
        doShake();
        popImpact("enemy", role === "gambit" ? C.red : C.gold);
        popText("enemy", `-${dmg}`, role === "gambit" ? C.red : C.gold);
        if (swift) setTimeout(() => popText("enemy", "SWIFT!", C.teal), 200);
        if (heal) setTimeout(() => popText("player", `+${heal}`, C.green), 200);
        if (gainBlock) setTimeout(() => popText("player", "🛡️", C.blue), 200);
        burstParticles("enemy", role === "gambit" ? C.red : C.gold);
        setEnemyHp((hp) => {
          const nhp = Math.max(0, hp - dmg);
          if (enemy.boss && !bossPhase2Ref.current && nhp > 0 && nhp <= enemy.hp / 2) {
            setBossPhase2(true);
            setPhaseBannerKey((k) => k + 1);
            sfx("phase");
            setLog((l) => [...l, "THE FORGETTING ENRAGES — time itself compresses."]);
          }
          return nhp;
        });
      }, 330);
      setLog((l) => [...l, `${ROLES[role].icon} ${ROLES[role].name} lands for ${dmg}.${swift ? " Swift bonus!" : ""}`]);
    } else if (selfDmg > 0) {
      sfx("hurt");
      anim(setEnemyAnim, setEnemyAnimKey, "attack", 700);
      setTimeout(() => {
        anim(setPlayerAnim, setPlayerAnimKey, "hurt", 600);
        doShake();
        popImpact("player", C.red);
        popText("player", `-${selfDmg}`, C.red);
        burstParticles("player", C.red);
        setPlayerHp((hp) => Math.max(0, hp - selfDmg));
      }, 330);
      setLog((l) => [...l, timedOut ? `Time runs out — you take ${selfDmg}.` : role === "gambit" ? `The gambit backfires — ${selfDmg} damage!` : `Wrong — you take ${selfDmg} damage.`]);
    } else {
      sfx("miss");
      setLog((l) => [...l, timedOut ? "Time runs out — the card crumbles." : "Wrong answer — the card fizzles. Combo broken."]);
    }

    setHand((h) => h.filter((cid) => cid !== activeCard));
    setDiscardPile((d) => [...d, activeCard]);
  }

  function closeCardResult() {
    if (closingRef.current) return;
    closingRef.current = true;
    const wasLethal = !!(revealed && revealed.enemyDefeated);
    const playerDied = !!(revealed && revealed.playerDefeated);
    setActiveCard(null);
    setRevealed(null);
    setHiddenOptions([]);
    setBlurredOption(null);
    if (playerDied) {
      setTimeout(() => finishRun(false), 300);
    } else if (wasLethal) {
      setEnemyDying(true);
      burstParticles("enemy", C.purple);
      setTimeout(() => onEnemyDefeated(), 600);
    }
  }

  function onEnemyDefeated() {
    const actIdx = enemy.actIdx || 0;
    const bounty = enemy.boss ? 0 : (enemy.elite ? 36 : 20) + actIdx * 8;
    if (bounty) {
      setGold((g) => g + bounty);
      sfx("gold");
      setLog((l) => [...l, `${enemy.name} defeated. +${bounty} gold.`]);
    }
    if (enemy.boss) { finishRun(true); return; }
    advanceFloor();
  }

  function advanceFloor() {
    const nextIdx = floorIndex + 1;
    setPlayerHp((hp) => Math.min(playerMaxHp, hp + 6));
    const cur = runMap[floorIndex];
    const next = runMap[nextIdx];
    setFloorIndex(nextIdx);
    if (next && cur && next.actIdx !== cur.actIdx) {
      setUsedIds([]);
      setStage(STAGES.SHOP);
    } else {
      setStage(STAGES.MAP);
    }
  }

  function finishRun(victory) {
    sfx(victory ? "win" : "lose");
    const acc = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const wisdomEarn = Math.max(3, Math.round(acc / 5) + floorIndex * 2 + (victory ? 15 : 0));
    updateSave((s) => {
      s.wisdom += wisdomEarn;
      s.bestFloor = Math.max(s.bestFloor, floorIndex + 1);
      if (victory) s.wins += 1;
      s.runs = [...s.runs.slice(-19), { d: new Date().toISOString().slice(0, 10), acc, floor: floorIndex + 1, win: victory, char: character ? character.id : "?" }];
      return s;
    });
    setStage(victory ? STAGES.VICTORY : STAGES.GAMEOVER);
  }

  function buyItem(item, upgradeTargetId) {
    if (gold < item.cost) return;
    setGold((g) => g - item.cost);
    sfx("gold");
    if (item.id === "potion") setPotions((n) => n + 1);
    if (item.id === "insight") setInsights((n) => n + 1);
    if (item.id === "maxhp") { setPlayerMaxHp((m) => m + 15); setPlayerHp((hp) => hp + 15); }
    if (item.id === "energy") setEnergyBonus((b) => b + 1);
    if (item.id === "timer") setTimerBonus((b) => b + 8);
    if (item.id === "upgrade" && upgradeTargetId) setUpgraded((u) => [...u, upgradeTargetId]);
  }

  function buyUnlock(u) {
    if (save.wisdom < u.cost || save.unlocks[u.id]) return;
    sfx("gold");
    updateSave((s) => { s.wisdom -= u.cost; s.unlocks[u.id] = true; return s; });
  }

  function endTurn() {
    if (turnBusyRef.current) return;
    turnBusyRef.current = true;
    initSound();
    setDiscardPile((d) => [...d, ...hand]);
    let newDiscard = [...discardPile, ...hand];
    let newDraw = drawPile;
    setHand([]);

    const blocked = playerBlock;
    const phaseBoost = enemy.boss && bossPhase2 ? 4 : 0;
    const dmgTaken = blocked ? 0 : enemyIntent + phaseBoost;
    anim(setEnemyAnim, setEnemyAnimKey, "attack", 700);
    setTimeout(() => {
      if (blocked) {
        sfx("block");
        popText("player", "BLOCKED", C.blue);
        popImpact("player", C.blue);
        setPlayerBlock(false);
        setLog((l) => [...l, `Your shield absorbs ${enemy.name}'s strike!`]);
      } else {
        sfx("hurt");
        anim(setPlayerAnim, setPlayerAnimKey, "hurt", 600);
        doShake();
        popImpact("player", C.red);
        popText("player", `-${dmgTaken}`, C.red);
        burstParticles("player", C.red);
        setLog((l) => [...l, `${enemy.name} strikes for ${dmgTaken}.`]);
      }
      const newHp = playerHp - dmgTaken;
      setPlayerHp(Math.max(0, newHp));

      if (newHp <= 0) { setTimeout(() => finishRun(false), 500); return; }

      setTimeout(() => {
        let dp = [...newDraw];
        let disc = [...newDiscard];
        const nextHand = [];
        for (let i = 0; i < 4; i++) {
          if (dp.length === 0) {
            if (disc.length === 0) break;
            dp = shuffle(disc);
            disc = [];
          }
          nextHand.push(dp.shift());
        }
        setDrawPile(dp);
        setDiscardPile(disc);
        setHand(nextHand);
        const nextTurn = turnCount + 1;
        setTurnCount(nextTurn);
        const stolen = enemy.ability === "steal" && nextTurn % 2 === 1 ? 1 : 0;
        if (stolen) setLog((l) => [...l, `${enemy.name} saps your focus — 1 energy stolen.`]);
        setEnergy(Math.max(1, 3 + energyBonus - stolen));
        setEnemyIntent(randInt(enemy.intentMin, enemy.intentMax));
        turnBusyRef.current = false;
      }, 320);
    }, 330);
  }

  function enterCampfire() {
    const candidates = missedIds.map(cardById).filter(Boolean);
    setCampfireCard(candidates.length ? shuffle(candidates)[0] : null);
    setCampfireResult(null);
    setCampfireAnswer("");
    setStage(STAGES.CAMPFIRE);
    sfx("fire");
  }
  function campfireRest() {
    setPlayerHp((hp) => Math.min(playerMaxHp, hp + 15));
    sfx("gold");
    advanceFloor();
  }
  function campfireAttempt(chosen) {
    const card = campfireCard;
    const isCorrect = card.type === "mcq"
      ? String(chosen).trim().toLowerCase() === String(card.answer).trim().toLowerCase()
      : isCloseMatch(chosen, card.answer);
    recordTopicResult(card.topic, isCorrect);
    if (isCorrect) {
      setPlayerHp((hp) => Math.min(playerMaxHp, hp + 25));
      setMissedIds((m) => m.filter((id) => id !== card.id));
      sfx("win");
      setCampfireResult({ correct: true });
    } else {
      sfx("miss");
      setCampfireResult({ correct: false });
    }
  }

  const MYSTERIES = [
    { id: "keeper", title: "The Keeper's Riddle", desc: "An old keeper offers coin for a moment of your attention.", choices: [{ label: "Accept the gift (+18g)", gold: 18 }, { label: "Decline and move on" }] },
    { id: "tome", title: "The Cursed Tome", desc: "A gilded book radiates power — and something else.", choices: [{ label: "Take it (+30g, lose 8 HP)", gold: 30, hp: -8 }, { label: "Leave it be" }] },
    { id: "fountain", title: "The Still Fountain", desc: "Water that remembers. Drink deep.", choices: [{ label: "Drink (heal 12 HP)", hp: 12 }, { label: "Bottle it (+1 potion)", potion: 1 }] },
  ];
  function enterMystery() {
    setMysteryEvent(MYSTERIES[Math.floor(rng() * MYSTERIES.length)]);
    setStage(STAGES.MYSTERY);
  }
  function resolveMystery(choice) {
    if (choice.gold) { setGold((g) => g + choice.gold); sfx("gold"); }
    if (choice.hp) setPlayerHp((hp) => choice.hp > 0 ? Math.min(playerMaxHp, hp + choice.hp) : Math.max(1, hp + choice.hp));
    if (choice.potion) { setPotions((n) => n + choice.potion); sfx("gold"); }
    if (choice.hp && choice.hp < 0) sfx("hurt");
    advanceFloor();
  }

  function chooseMapOption(opt) {
    initSound();
    if (opt.type === "fight" || opt.type === "elite") prepareBattle(opt.enemy);
    else if (opt.type === "campfire") enterCampfire();
    else if (opt.type === "mystery") enterMystery();
  }

  function copyStudyList() {
    const uniqueMissed = [...new Set(missedTopics)];
    const lines = ["STUDY LIST — The Forgetting Spire", ...uniqueMissed.map((t) => {
      const s = save.topicStats[t];
      const acc = s && s.c + s.w > 0 ? ` (lifetime: ${Math.round((s.c / (s.c + s.w)) * 100)}%)` : "";
      return `- ${t}${acc}`;
    })];
    try {
      navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  function resetAll() {
    setStage(STAGES.TITLE);
    setDocText(""); setPdfData(null); setPdfName("");
    setPool([]); setDeckIds([]); setCharacter(null);
    setFloorIndex(0); setRunMap([]);
  }

  const currentActIdx = runMap.length ? (runMap[Math.min(floorIndex, runMap.length - 1)].actIdx || 0) : 0;
  const currentAct = ACTS[currentActIdx];
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `${currentAct.bgGrad}, radial-gradient(circle at 50% 0%, ${C.bg2} 0%, ${C.bg} 60%)`,
        color: C.text,
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        animation: shake ? "screenShake 0.38s ease" : "none",
      }}
    >
      <style>{GLOBAL_CSS}</style>

      <div style={{ width: "100%", borderBottom: `1px solid ${C.line}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box" }}>
        <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2, fontSize: 14, color: C.gold }}>THE FORGETTING SPIRE</span>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: C.muted, alignItems: "center" }}>
          {[STAGES.MAP, STAGES.BRIEF, STAGES.BATTLE, STAGES.SHOP, STAGES.CAMPFIRE, STAGES.MYSTERY, STAGES.ACT_INTRO].includes(stage) && (
            <>
              <span>{character ? character.icon : ""}</span>
              <span>♥ {playerHp}/{playerMaxHp}</span>
              <span style={{ color: C.gold }}>◉ {gold}g</span>
              <span>🧪{potions}</span>
              <span>📜{insights}</span>
            </>
          )}
          <span style={{ color: C.purple }}>🔮 {save.wisdom}</span>
          <button onClick={() => { sound.muted = !sound.muted; setMuted(sound.muted); initSound(); }} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 680, padding: "22px 20px 60px", boxSizing: "border-box" }}>
        {stage === STAGES.TITLE && (
          <TitleStage save={save} saveLoaded={saveLoaded} onStart={() => setStage(STAGES.INPUT)} onSanctum={() => setStage(STAGES.SANCTUM)} />
        )}

        {stage === STAGES.SANCTUM && (
          <SanctumStage save={save} onBuy={buyUnlock} onBack={() => setStage(STAGES.TITLE)} />
        )}

        {stage === STAGES.INPUT && (
          <InputStage docText={docText} setDocText={setDocText} pdfData={pdfData} setPdfData={setPdfData} pdfName={pdfName} setPdfName={setPdfName} dailyMode={dailyMode} setDailyMode={setDailyMode} onGenerate={generateDeck} />
        )}

        {stage === STAGES.GENERATING && (
          <div style={{ textAlign: "center", paddingTop: 70 }}>
            <div style={{ width: 54, height: 54, margin: "0 auto 24px", borderRadius: "50%", border: `3px solid ${C.line}`, borderTopColor: C.gold, animation: "spin 0.9s linear infinite" }} />
            <p style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1.5, color: C.teal, fontSize: 14 }}>{loadingLines[loadingLine]}</p>
          </div>
        )}

        {stage === STAGES.ERROR && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <p style={{ color: C.red, fontFamily: "'Cinzel', serif" }}>THE SPIRE REJECTS THIS TEXT</p>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>{errorMsg}</p>
            <button onClick={() => setStage(STAGES.INPUT)} style={btn(C.gold)}>Try again</button>
          </div>
        )}

        {stage === STAGES.CHARACTER && <CharacterStage onPick={pickCharacter} />}

        {stage === STAGES.DRAFT && (
          <DraftStage offers={draftOffers} picks={draftPicks} onToggle={toggleDraftPick} onConfirm={confirmDraft} topicStats={save.topicStats} />
        )}

        {stage === STAGES.ACT_INTRO && (
          <ActIntroStage act={currentAct} actIdx={currentActIdx} onContinue={() => setStage(STAGES.MAP)} />
        )}

        {stage === STAGES.MAP && runMap.length > 0 && (
          <MapStage runMap={runMap} floorIndex={floorIndex} onChoose={chooseMapOption} />
        )}

        {stage === STAGES.BRIEF && enemy && (
          <BriefStage enemy={enemy} deck={pendingDeck} cardById={cardById} missedIds={missedIds} topicStats={save.topicStats} onBegin={beginBattle} />
        )}

        {stage === STAGES.SHOP && (
          <ShopStage gold={gold} onBuy={buyItem} energyBonus={energyBonus} deckIds={deckIds} upgraded={upgraded} cardById={cardById} onLeave={() => setStage(STAGES.ACT_INTRO)} nextAct={currentAct} />
        )}

        {stage === STAGES.CAMPFIRE && (
          <CampfireStage card={campfireCard} result={campfireResult} answer={campfireAnswer} setAnswer={setCampfireAnswer} onRest={campfireRest} onAttempt={campfireAttempt} onContinue={advanceFloor} />
        )}

        {stage === STAGES.MYSTERY && mysteryEvent && (
          <MysteryStage event={mysteryEvent} onChoose={resolveMystery} />
        )}

        {stage === STAGES.BATTLE && enemy && (
          <BattleStage
            enemy={enemy} enemyHp={enemyHp} enemyIntent={enemyIntent} bossPhase2={bossPhase2} phaseBannerKey={phaseBannerKey}
            playerHp={playerHp} playerMaxHp={playerMaxHp} playerBlock={playerBlock}
            hand={hand} energy={energy} maxEnergy={3 + energyBonus} cardById={cardById} upgraded={upgraded}
            activeCard={activeCard} answerVal={answerVal} setAnswerVal={setAnswerVal}
            revealed={revealed} hiddenOptions={hiddenOptions} blurredOption={blurredOption} displayOptions={displayOptions}
            timeLeft={timeLeft} timerMax={timerMax}
            onPlayCard={playCard} onResolve={resolveAnswer} onCloseResult={closeCardResult} onEndTurn={endTurn}
            onUsePotion={usePotion} onUseInsight={useInsight} potions={potions} insights={insights}
            streak={streak} log={log} drawCount={drawPile.length} discardCount={discardPile.length}
            playerAnim={playerAnim} playerAnimKey={playerAnimKey}
            enemyAnim={enemyAnim} enemyAnimKey={enemyAnimKey} enemyDying={enemyDying}
            popups={popups} particles={particles} impacts={impacts} showSlash={showSlash} slashKey={slashKey}
          />
        )}

        {(stage === STAGES.GAMEOVER || stage === STAGES.VICTORY) && (
          <EndStage
            victory={stage === STAGES.VICTORY}
            totalCorrect={totalCorrect} totalAnswered={totalAnswered} missedTopics={missedTopics}
            bestStreak={bestStreak} swiftCount={swiftCount} floorIndex={floorIndex} totalFloors={runMap.length}
            gold={gold} save={save} copied={copied} onCopy={copyStudyList} onRestart={resetAll}
          />
        )}
      </div>
    </div>
  );
}

function btn(bg, extra = {}) {
  return {
    marginTop: 18, background: bg, color: "#0D0B14", border: "none", borderRadius: 8,
    padding: "12px 22px", fontFamily: "'Cinzel', serif", fontWeight: 700, letterSpacing: 1,
    fontSize: 13, cursor: "pointer", ...extra,
  };
}

// ---------- Title & Sanctum ----------

function TitleStage({ save, saveLoaded, onStart, onSanctum }) {
  const totalTopics = Object.keys(save.topicStats).length;
  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 34, color: C.gold, marginBottom: 6 }}>THE FORGETTING SPIRE</div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 26 }}>Your knowledge is the weapon. The Spire remembers what you don't.</p>

      {saveLoaded && (save.runs.length > 0 || save.wisdom > 0) && (
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 10 }}>
          <div><div style={{ fontSize: 20, fontFamily: "'Cinzel', serif", color: C.purple }}>🔮 {save.wisdom}</div><div style={{ fontSize: 11, color: C.muted }}>WISDOM</div></div>
          <div><div style={{ fontSize: 20, fontFamily: "'Cinzel', serif", color: C.gold }}>{save.wins}</div><div style={{ fontSize: 11, color: C.muted }}>SPIRES CONQUERED</div></div>
          <div><div style={{ fontSize: 20, fontFamily: "'Cinzel', serif", color: C.teal }}>{save.bestFloor}</div><div style={{ fontSize: 11, color: C.muted }}>BEST FLOOR</div></div>
          <div><div style={{ fontSize: 20, fontFamily: "'Cinzel', serif", color: C.green }}>{totalTopics}</div><div style={{ fontSize: 11, color: C.muted }}>TOPICS TRACKED</div></div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(C.gold, { fontSize: 15, padding: "14px 28px" })}>New Climb →</button>
        <button onClick={onSanctum} style={btn(C.panelLight, { color: C.purple })}>🔮 Sanctum (spend Wisdom)</button>
      </div>

      {save.runs.length > 0 && (
        <div style={{ marginTop: 26, textAlign: "left" }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.muted, fontFamily: "'Cinzel', serif", marginBottom: 8 }}>RECENT CLIMBS</div>
          {save.runs.slice(-5).reverse().map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              <span>{r.d} · {CHARACTERS[r.char] ? CHARACTERS[r.char].icon : ""} floor {r.floor}</span>
              <span style={{ color: r.win ? C.gold : C.muted }}>{r.win ? "★ CONQUERED" : `${r.acc}% acc`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SanctumStage({ save, onBuy, onBack }) {
  return (
    <div>
      <div style={{ fontFamily: "'Cinzel', serif", color: C.purple, fontSize: 12, letterSpacing: 2, marginBottom: 10 }}>THE SANCTUM</div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: "0 0 6px" }}>Permanent power, bought with Wisdom</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>You hold <span style={{ color: C.purple }}>🔮 {save.wisdom} Wisdom</span> — earned from every climb, win or lose.</p>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>Unlocks apply to every future run, forever.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {UNLOCKS.map((u) => {
          const owned = !!save.unlocks[u.id];
          const affordable = save.wisdom >= u.cost;
          return (
            <div key={u.id} style={{ background: C.panel, border: `1px solid ${owned ? C.purple : C.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{u.icon}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: C.muted, margin: "4px 0 10px", lineHeight: 1.4 }}>{u.desc}</div>
              <button
                onClick={() => onBuy(u)} disabled={owned || !affordable}
                style={btn(owned ? C.purple : affordable ? C.gold : C.line, { marginTop: 0, padding: "8px 14px", fontSize: 12, color: owned ? "#fff" : affordable ? "#0D0B14" : C.muted, cursor: owned || !affordable ? "default" : "pointer" })}
              >
                {owned ? "OWNED" : `🔮 ${u.cost}`}
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={onBack} style={btn(C.panelLight, { color: C.text })}>← Back</button>
    </div>
  );
}

// ---------- Input / Character / Draft ----------

function InputStage({ docText, setDocText, pdfData, setPdfData, pdfName, setPdfName, dailyMode, setDailyMode, onGenerate }) {
  const [fileError, setFileError] = useState("");

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileError("");
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) {
      if (file.size > 8 * 1024 * 1024) { setFileError("PDF too large — keep it under 8MB."); return; }
      const reader = new FileReader();
      reader.onload = () => { setPdfData(String(reader.result).split(",")[1]); setPdfName(file.name); setDocText(""); };
      reader.onerror = () => setFileError("Couldn't read that PDF. Try another file.");
      reader.readAsDataURL(file);
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = () => { setDocText(String(reader.result)); setPdfData(null); setPdfName(""); };
      reader.onerror = () => setFileError("Couldn't read that file.");
      reader.readAsText(file);
    } else {
      setFileError("Supported files: PDF, TXT, MD. For Word docs, copy-paste the text instead.");
    }
    e.target.value = "";
  }

  const ready = pdfData || docText.trim().length >= 40;

  return (
    <div>
      <div style={{ fontFamily: "'Cinzel', serif", color: C.teal, fontSize: 12, letterSpacing: 2, marginBottom: 10 }}>BEFORE THE CLIMB</div>
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 26, margin: "0 0 10px" }}>Feed the Spire your source material</h1>
      <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
        Upload a PDF or paste text. Then pick your climber, draft your deck, and choose your path
        up the Spire — fights, elites, campfires, and stranger things await.
      </p>

      <label style={{ display: "block", border: `1px dashed ${pdfData ? C.gold : C.line}`, borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", background: pdfData ? "rgba(212,175,55,0.06)" : C.panel, marginBottom: 8 }}>
        <input type="file" accept=".pdf,.txt,.md" onChange={handleFile} style={{ display: "none" }} />
        {pdfData ? (
          <span style={{ fontSize: 13, color: C.gold }}>📄 {pdfName} loaded</span>
        ) : (
          <span style={{ fontSize: 13, color: C.muted }}>📄 Tap to upload a PDF, TXT, or MD file</span>
        )}
      </label>
      {pdfData && (
        <button onClick={() => { setPdfData(null); setPdfName(""); }} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 8, textDecoration: "underline" }}>
          Remove file and paste text instead
        </button>
      )}
      {fileError && <div style={{ fontSize: 12, color: C.red, marginBottom: 8 }}>{fileError}</div>}

      {!pdfData && (
        <>
          <div style={{ textAlign: "center", color: C.muted, fontSize: 11, letterSpacing: 2, margin: "10px 0" }}>— OR —</div>
          <textarea
            value={docText} onChange={(e) => setDocText(e.target.value)}
            placeholder="Paste your document text here..." rows={9}
            style={{ width: "100%", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 14, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }}
          />
        </>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer", fontSize: 13, color: dailyMode ? C.gold : C.muted }}>
        <input type="checkbox" checked={dailyMode} onChange={(e) => setDailyMode(e.target.checked)} />
        🗓️ Daily Climb — same map layout for everyone today (compare runs with your team)
      </label>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {pdfData ? "PDF ready" : `${docText.trim().split(/\s+/).filter(Boolean).length} words`}
        </span>
        <button
          disabled={!ready} onClick={onGenerate}
          style={btn(!ready ? C.line : C.gold, { color: !ready ? C.muted : "#0D0B14", cursor: !ready ? "not-allowed" : "pointer" })}
        >
          Forge the Deck →
        </button>
      </div>
    </div>
  );
}

function CharacterStage({ onPick }) {
  return (
    <div>
      <div style={{ fontFamily: "'Cinzel', serif", color: C.teal, fontSize: 12, letterSpacing: 2, marginBottom: 10 }}>CHOOSE YOUR CLIMBER</div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: "0 0 16px" }}>Who climbs the Spire?</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.values(CHARACTERS).map((ch) => (
          <button key={ch.id} onClick={() => onPick(ch.id)} style={{ display: "flex", alignItems: "center", gap: 14, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, textAlign: "left", color: C.text, cursor: "pointer" }}>
            <span style={{ fontSize: 32 }}>{ch.icon}</span>
            <span>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16 }}>{ch.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{ch.desc}</div>
              <div style={{ fontSize: 11, color: C.teal, marginTop: 4 }}>♥ {ch.hp} HP{ch.timerMod ? ` · ${ch.timerMod > 0 ? "+" : ""}${ch.timerMod}s timers` : ""}{ch.goldMod !== 1 ? ` · ${ch.goldMod}× gold` : ""}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DraftStage({ offers, picks, onToggle, onConfirm, topicStats }) {
  const need = 9;
  const lifetime = (topic) => {
    const t = topicStats[topic];
    if (!t || t.c + t.w === 0) return null;
    return Math.round((t.c / (t.c + t.w)) * 100);
  };
  const tierRow = (tier, cards) => (
    <div key={tier} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, color: DIFF[tier].color, fontFamily: "'Cinzel', serif", marginBottom: 8 }}>{DIFF[tier].label} TIER</div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
        {cards.map((c) => {
          const picked = picks.includes(c.id);
          const r = ROLES[c.role || "strike"];
          const acc = lifetime(c.topic);
          return (
            <button key={c.id} onClick={() => onToggle(c.id)} style={{ minWidth: 140, maxWidth: 140, background: picked ? C.panelLight : C.panel, border: `2px solid ${picked ? C.gold : C.line}`, borderRadius: 10, padding: 12, textAlign: "left", color: C.text, cursor: "pointer", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: r.color, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>{r.icon} {r.name}</div>
              <div style={{ fontSize: 12, color: DIFF[tier].color, margin: "5px 0 2px" }}>{c.topic}</div>
              {acc !== null && <div style={{ fontSize: 10, color: acc < 60 ? C.red : C.muted }}>lifetime {acc}%{acc < 60 ? " ⚠ weak" : ""}</div>}
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{r.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ fontFamily: "'Cinzel', serif", color: C.gold, fontSize: 12, letterSpacing: 2, marginBottom: 10 }}>DRAFT YOUR DECK</div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, margin: "0 0 4px" }}>Pick {need} cards ({picks.length}/{need})</h2>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>Topics you've struggled with before are flagged ⚠ — drafting them is how you fix them. Questions stay hidden until battle.</p>
      {tierRow("easy", offers.easy)}
      {tierRow("medium", offers.medium)}
      {tierRow("hard", offers.hard)}
      <div style={{ textAlign: "right" }}>
        <button onClick={onConfirm} disabled={picks.length < need} style={btn(picks.length >= need ? C.gold : C.line, { color: picks.length >= need ? "#0D0B14" : C.muted, cursor: picks.length >= need ? "pointer" : "not-allowed" })}>
          Lock in deck →
        </button>
      </div>
    </div>
  );
}

// ---------- Act intro / vertical map ----------

function ActIntroStage({ act, actIdx, onContinue }) {
  const isFinal = act.name === "FINAL EXAM";
  return (
    <div style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: 3, color: act.theme, marginBottom: 12 }}>
        {isFinal ? "THE SUMMIT" : `ACT ${actIdx + 1}`}
      </div>
      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: isFinal ? 900 : 700, fontSize: isFinal ? 34 : 28, color: isFinal ? C.crimson : C.text, marginBottom: 10 }}>
        {act.name}
      </div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 4 }}>{act.tagline}</p>
      <p style={{ color: act.theme, fontSize: 12, letterSpacing: 1 }}>CARD POOL: {act.pools.map((p) => p.toUpperCase()).join(" + ")}</p>
      {isFinal && (
        <p style={{ color: C.red, fontSize: 13, maxWidth: 420, margin: "12px auto 0", lineHeight: 1.6 }}>
          One boss with Total Recall — it re-asks the questions you got wrong on the climb.
          Every wrong answer costs you HP directly. At half health, it enrages.
        </p>
      )}
      <button onClick={onContinue} style={btn(isFinal ? C.crimson : act.theme, { color: isFinal ? "#fff" : "#0D0B14" })}>
        {isFinal ? "Begin the Final Exam →" : "Enter →"}
      </button>
    </div>
  );
}

function nodeIcon(node) {
  if (node.kind === "boss") return "★";
  if (node.kind === "guardian") return "☠";
  if (node.kind === "choice" && node.options.some((o) => o.type === "campfire" || o.type === "mystery")) return "?";
  return "⚔";
}

function MapStage({ runMap, floorIndex, onChoose }) {
  const node = runMap[floorIndex];
  const act = ACTS[node.actIdx];

  return (
    <div style={{ display: "flex", gap: 18 }}>
      {/* Vertical spire */}
      <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 4, paddingTop: 6 }}>
        {runMap.map((n, i) => {
          const a = ACTS[n.actIdx];
          const done = i < floorIndex, here = i === floorIndex;
          return (
            <React.Fragment key={i}>
              <div style={{ width: 30, height: 30, borderRadius: n.kind === "boss" ? 4 : "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? C.green : here ? a.theme : C.panel, border: `2px solid ${here ? a.theme : C.line}`, color: done || here ? "#0D0B14" : C.muted, fontSize: 13, fontFamily: "'Cinzel', serif", fontWeight: 700, boxShadow: here ? `0 0 12px ${a.theme}` : "none" }}>
                {nodeIcon(n)}
              </div>
              {i < runMap.length - 1 && <div style={{ width: 2, height: 10, background: i < floorIndex ? C.green : C.line }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Choices */}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Cinzel', serif", color: act.theme, fontSize: 12, letterSpacing: 2, marginBottom: 14 }}>
          {act.name.toUpperCase()} — FLOOR {floorIndex + 1} OF {runMap.length}
        </div>

        {node.kind === "choice" ? (
          <>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Two paths ahead. Choose:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {node.options.map((opt, i) => (
                <button key={i} onClick={() => onChoose(opt)} style={{ background: C.panel, border: `1px solid ${opt.type === "elite" ? C.orange : opt.type === "campfire" ? C.green : opt.type === "mystery" ? C.purple : act.theme}`, borderRadius: 10, padding: 16, textAlign: "left", color: C.text, cursor: "pointer" }}>
                  {opt.type === "fight" && (<><div style={{ fontFamily: "'Cinzel', serif", fontSize: 16 }}>⚔ {opt.enemy.name}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{opt.enemy.hp} HP · standard bounty{ABILITIES[opt.enemy.ability].name ? ` · ✦ ${ABILITIES[opt.enemy.ability].name}` : ""}</div></>)}
                  {opt.type === "elite" && (<><div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: C.orange }}>🔥 {opt.enemy.name}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{opt.enemy.hp} HP · hits harder · +80% gold bounty{ABILITIES[opt.enemy.ability].name ? ` · ✦ ${ABILITIES[opt.enemy.ability].name}` : ""}</div></>)}
                  {opt.type === "campfire" && (<><div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: C.green }}>🔥 Campfire</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Rest to heal — or face a question you got wrong for a bigger heal</div></>)}
                  {opt.type === "mystery" && (<><div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: C.purple }}>❓ Mystery</div><div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Something waits in the dark. Could be fortune. Could be teeth.</div></>)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background: C.panel, border: `1px solid ${node.kind === "boss" ? C.crimson : act.theme}`, borderRadius: 10, padding: 20, textAlign: "center" }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: node.kind === "boss" ? C.crimson : C.text }}>{node.enemy.name}</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{node.enemy.hp} HP{ABILITIES[node.enemy.ability].name ? ` · ✦ ${ABILITIES[node.enemy.ability].name}` : ""}</div>
            <button onClick={() => onChoose({ type: "fight", enemy: node.enemy })} style={btn(node.kind === "boss" ? C.crimson : act.theme, { color: node.kind === "boss" ? "#fff" : "#0D0B14" })}>
              {node.kind === "boss" ? "Face the Final Exam →" : "Fight the Guardian →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// ---------- Brief / Shop / Campfire / Mystery ----------

function BriefStage({ enemy, deck, cardById, missedIds, topicStats, onBegin }) {
  const ability = ABILITIES[enemy.ability];
  const upcoming = deck.slice(0, 8).map((id) => cardById(id)).filter(Boolean);
  const topics = [...new Set(upcoming.map((c) => c.topic))];
  const diffs = upcoming.reduce((acc, c) => { acc[c.difficulty] = (acc[c.difficulty] || 0) + 1; return acc; }, {});
  const roles = upcoming.reduce((acc, c) => { acc[c.role || "strike"] = (acc[c.role || "strike"] || 0) + 1; return acc; }, {});
  const recallCount = enemy.ability === "recall" ? deck.filter((id) => missedIds.includes(id)).length : 0;

  const lifetime = (topic) => {
    const t = topicStats[topic];
    if (!t || t.c + t.w === 0) return null;
    return Math.round((t.c / (t.c + t.w)) * 100);
  };

  const tips = [];
  if (enemy.ability === "blur") tips.push("One option will be fogged out each question — Insight scrolls counter this.");
  if (enemy.ability === "shuffle") tips.push("Options reshuffle 3 seconds in — read fast or commit early.");
  if (enemy.ability === "crush") tips.push("Timer runs at half speed — know the topics cold before entering.");
  if (enemy.ability === "steal") tips.push("You'll lose energy every second turn — make the first turn count.");
  if (enemy.ability === "dread") tips.push("Wrong answers cost 5 HP — avoid Gambits unless you're certain.");
  if (enemy.ability === "recall") tips.push(`It will re-ask ${recallCount || "the"} question${recallCount === 1 ? "" : "s"} you got wrong this run. Review those topics NOW. It enrages at half HP — timers compress.`);
  if (enemy.elite) tips.push("Elite: hits harder than normal, but pays +80% bounty.");
  if (roles.gambit) tips.push(`${roles.gambit} Gambit card${roles.gambit > 1 ? "s" : ""} in this deck — save them for topics you know cold.`);

  return (
    <div>
      <div style={{ fontFamily: "'Cinzel', serif", color: C.teal, fontSize: 12, letterSpacing: 2, marginBottom: 10 }}>SCOUT REPORT</div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: "0 0 4px", color: enemy.boss ? C.crimson : enemy.elite ? C.orange : C.text }}>{enemy.name}</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
        {enemy.hp} HP · hits for {enemy.intentMin}–{enemy.intentMax}
        {ability.name && <span style={{ color: C.purple }}> · ✦ {ability.name}: {ability.desc}</span>}
      </p>

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.gold, fontFamily: "'Cinzel', serif", marginBottom: 10 }}>
          TOPICS AHEAD — REVIEW BEFORE YOU COMMIT
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {topics.map((t, i) => {
            const acc = lifetime(t);
            return (
              <span key={i} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${acc !== null && acc < 60 ? C.red : C.teal}`, color: acc !== null && acc < 60 ? C.red : C.teal, fontSize: 13 }}>
                {t}{acc !== null ? ` · ${acc}%` : ""}
              </span>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>
          Difficulty mix: {["easy", "medium", "hard"].filter((d) => diffs[d]).map((d) => `${diffs[d]} ${d}`).join(" · ")}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Card roles: {Object.entries(roles).map(([r, n]) => `${n}× ${ROLES[r].icon}`).join("  ")}
        </div>
      </div>

      {tips.length > 0 && (
        <div style={{ background: C.bg2, border: `1px solid ${C.purple}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.purple, fontFamily: "'Cinzel', serif", marginBottom: 8 }}>BATTLE PLAN</div>
          {tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 4 }}>→ {tip}</div>
          ))}
        </div>
      )}

      <p style={{ color: C.muted, fontSize: 12, fontStyle: "italic", marginBottom: 4 }}>
        Take a moment. Run each topic through your head — what do you actually remember about it? When you're ready:
      </p>
      <div style={{ textAlign: "right" }}>
        <button onClick={onBegin} style={btn(enemy.boss ? C.crimson : C.gold, { color: enemy.boss ? "#fff" : "#0D0B14" })}>
          I'm ready — Begin Battle →
        </button>
      </div>
    </div>
  );
}

function ShopStage({ gold, onBuy, onLeave, energyBonus, deckIds, upgraded, cardById, nextAct }) {
  const [upgradeMode, setUpgradeMode] = useState(false);
  const upgradable = deckIds.filter((id) => !upgraded.includes(id)).map(cardById).filter(Boolean);

  return (
    <div>
      <div style={{ fontFamily: "'Cinzel', serif", color: C.gold, fontSize: 12, letterSpacing: 2, marginBottom: 10 }}>THE WANDERING MERCHANT</div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: "0 0 6px" }}>Spend your knowledge-gold</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>You have <span style={{ color: C.gold }}>◉ {gold}g</span>. Next: {nextAct.name}.</p>

      {!upgradeMode ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {SHOP_ITEMS.map((item) => {
              const affordable = gold >= item.cost;
              const soldOut = (item.id === "energy" && energyBonus >= 2) || (item.id === "upgrade" && upgradable.length === 0);
              return (
                <div key={item.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, margin: "4px 0 10px", lineHeight: 1.4 }}>{item.desc}</div>
                  <button
                    onClick={() => {
                      if (soldOut || !affordable) return;
                      if (item.id === "upgrade") setUpgradeMode(true);
                      else onBuy(item);
                    }}
                    disabled={!affordable || soldOut}
                    style={btn(soldOut ? C.line : affordable ? C.gold : C.line, { marginTop: 0, padding: "8px 14px", fontSize: 12, color: soldOut || !affordable ? C.muted : "#0D0B14", cursor: soldOut || !affordable ? "not-allowed" : "pointer" })}
                  >
                    {soldOut ? (item.id === "upgrade" ? "ALL UPGRADED" : "MAXED") : `◉ ${item.cost}g`}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "right" }}>
            <button onClick={onLeave} style={btn(C.teal)}>Continue the climb →</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>🪨 Choose a card to sharpen (+50% damage for the rest of the run):</p>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
            {upgradable.map((c) => {
              const r = ROLES[c.role || "strike"];
              return (
                <button key={c.id} onClick={() => { onBuy(SHOP_ITEMS.find((s) => s.id === "upgrade"), c.id); setUpgradeMode(false); }} style={{ minWidth: 140, maxWidth: 140, background: C.panel, border: `1px solid ${r.color}`, borderRadius: 10, padding: 12, textAlign: "left", color: C.text, cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: r.color, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>{r.icon} {r.name} · {DIFF[c.difficulty].label}</div>
                  <div style={{ fontSize: 12, color: DIFF[c.difficulty].color, margin: "5px 0" }}>{c.topic}</div>
                  <div style={{ fontSize: 11, color: C.gold }}>{DIFF[c.difficulty].dmg} → {Math.round(DIFF[c.difficulty].dmg * 1.5)} dmg</div>
                </button>
              );
            })}
          </div>
          <button onClick={() => setUpgradeMode(false)} style={btn(C.panelLight, { color: C.text })}>← Back to shop</button>
        </>
      )}
    </div>
  );
}

function CampfireStage({ card, result, answer, setAnswer, onRest, onAttempt, onContinue }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 30 }}>
      <div style={{ fontSize: 54, animation: "campfireFlicker 1.2s ease infinite" }}>🔥</div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: "10px 0 6px", color: C.green }}>Campfire</h2>

      {!result ? (
        <>
          <p style={{ color: C.muted, fontSize: 13, maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>
            The flames hold back the Forgetting for a while. Rest — or face one of the questions
            that beat you, and burn it away for good.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onRest} style={btn(C.green)}>😴 Rest (heal 15 HP)</button>
            {card && (
              <button onClick={() => setAnswer("__attempt__")} style={btn(C.orange, { color: "#0D0B14" })}>
                ⚔ Face your mistake (heal 25 if right)
              </button>
            )}
          </div>

          {answer === "__attempt__" && card && (
            <div style={{ background: C.panelLight, border: `1px solid ${C.orange}`, borderRadius: 10, padding: 18, marginTop: 20, textAlign: "left" }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: C.orange, fontFamily: "'Cinzel', serif", marginBottom: 8 }}>
                THE QUESTION THAT BEAT YOU · {card.topic}
              </div>
              <div style={{ fontSize: 15, marginBottom: 14, lineHeight: 1.4 }}>{card.question}</div>
              {card.type === "mcq" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(card.options || []).map((opt, i) => (
                    <button key={i} onClick={() => onAttempt(opt)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.bg2, color: C.text, cursor: "pointer", fontSize: 13 }}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <CampfireShortInput onAttempt={onAttempt} />
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: result.correct ? C.green : C.red, marginBottom: 8 }}>
            {result.correct ? "✦ BURNED AWAY — the Forgetting loses its grip. +25 HP" : "It still eludes you. The answer stays hidden — it will find you again."}
          </div>
          <button onClick={onContinue} style={btn(C.teal)}>Continue the climb →</button>
        </div>
      )}
    </div>
  );
}

function CampfireShortInput({ onAttempt }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) onAttempt(val); }} placeholder="Your answer..." style={{ flex: 1, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 12px", color: C.text, fontSize: 13 }} />
      <button onClick={() => onAttempt(val)} disabled={!val.trim()} style={btn(val.trim() ? C.gold : C.line, { marginTop: 0 })}>Answer</button>
    </div>
  );
}

function MysteryStage({ event, onChoose }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ fontSize: 44 }}>❓</div>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: "10px 0 6px", color: C.purple }}>{event.title}</h2>
      <p style={{ color: C.muted, fontSize: 14, maxWidth: 380, margin: "0 auto 22px", lineHeight: 1.6 }}>{event.desc}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, margin: "0 auto" }}>
        {event.choices.map((ch, i) => (
          <button key={i} onClick={() => onChoose(ch)} style={btn(i === 0 ? C.purple : C.panelLight, { marginTop: 0, color: i === 0 ? "#fff" : C.text })}>
            {ch.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Sprites & VFX ----------

function PlayerSprite({ anim, animKey, hasBlock }) {
  const animName = anim === "attack" ? "heroAttack" : anim === "hurt" ? "hurtKnockLeft" : "floatIdle";
  const duration = anim === "idle" ? "2.4s" : anim === "attack" ? "0.7s" : "0.6s";
  const iteration = anim === "idle" ? "infinite" : "1";
  return (
    <div key={`p-${animKey}`} style={{ animation: `${animName} ${duration} cubic-bezier(0.34, 1.2, 0.64, 1) ${iteration}`, width: 90, height: 100, position: "relative", zIndex: anim === "attack" ? 5 : 1 }}>
      {hasBlock && (
        <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: `2px solid ${C.blue}`, animation: "shieldGlow 1.4s ease infinite", pointerEvents: "none" }} />
      )}
      <svg viewBox="0 0 90 100" width="90" height="100">
        <ellipse cx="45" cy="94" rx="26" ry="5" fill="#000" opacity="0.35" />
        <rect x="30" y="38" width="30" height="42" rx="8" fill={C.teal} />
        <circle cx="45" cy="24" r="16" fill="#F1D9B5" />
        <path d="M29 20 Q45 2 61 20 Q52 12 45 12 Q38 12 29 20Z" fill={C.gold} />
        <g style={{ transformOrigin: "60px 46px", animation: anim === "attack" ? "swordSwing 0.48s ease 1" : "none" }}>
          <rect x="58" y="10" width="5" height="42" rx="2" fill="#DCE6EA" />
          <rect x="54" y="46" width="13" height="7" rx="2" fill="#7A5A2E" />
        </g>
        <rect x="20" y="46" width="10" height="26" rx="4" fill={C.teal} />
        <rect x="60" y="46" width="10" height="26" rx="4" fill={C.teal} opacity="0.85" />
      </svg>
    </div>
  );
}

function EnemySprite({ kind, anim, animKey, dying, boss, phase2 }) {
  const animName = dying ? "deathFall" : anim === "attack" ? "enemyAttackDash" : anim === "hurt" ? "hurtKnock" : "floatIdle";
  const duration = dying ? "0.55s" : anim === "idle" ? "2.6s" : anim === "attack" ? "0.7s" : "0.6s";
  const iteration = anim === "idle" && !dying ? "infinite" : "1";
  const fill = dying ? "forwards" : "none";
  const size = boss ? 140 : 92;

  const bodies = {
    wisp: (<><ellipse cx="46" cy="55" rx="30" ry="24" fill={C.teal} opacity="0.55" /><ellipse cx="46" cy="50" rx="20" ry="16" fill={C.teal} opacity="0.85" /><circle cx="38" cy="46" r="3" fill="#0D0B14" /><circle cx="54" cy="46" r="3" fill="#0D0B14" /></>),
    specter: (<><path d="M20 70 Q20 20 46 20 Q72 20 72 70 L64 62 L56 70 L46 60 L36 70 L28 62 Z" fill={C.purple} opacity="0.9" /><circle cx="38" cy="42" r="4" fill="#0D0B14" /><circle cx="54" cy="42" r="4" fill="#0D0B14" /></>),
    blank: (<><circle cx="46" cy="50" r="30" fill="#B9B4C7" /><circle cx="38" cy="46" r="3" fill="#0D0B14" /><circle cx="54" cy="46" r="3" fill="#0D0B14" /></>),
    golem: (<><rect x="16" y="30" width="60" height="50" rx="6" fill="#8A6A3E" /><rect x="24" y="40" width="16" height="16" fill="#5C4426" /><rect x="52" y="40" width="16" height="16" fill="#5C4426" /><rect x="30" y="64" width="32" height="8" fill="#5C4426" /></>),
    wraith: (<><path d="M46 15 L76 78 L46 66 L16 78 Z" fill="#4B2E63" /><circle cx="38" cy="46" r="3.5" fill={C.red} /><circle cx="54" cy="46" r="3.5" fill={C.red} /></>),
    revenant: (<><path d="M46 12 Q76 30 68 78 L46 70 L24 78 Q16 30 46 12 Z" fill="#5C1E2A" /><circle cx="37" cy="42" r="4" fill={C.red} /><circle cx="55" cy="42" r="4" fill={C.red} /><path d="M30 34 L20 20 M62 34 L72 20" stroke="#5C1E2A" strokeWidth="5" strokeLinecap="round" /></>),
    boss: (<><path d="M70 20 L120 110 L70 96 L20 110 Z" fill={phase2 ? "#4A0A12" : "#2A0A12"} /><circle cx="52" cy="66" r="5" fill={phase2 ? "#FF3355" : C.crimson} /><circle cx="70" cy="60" r="5" fill={phase2 ? "#FF3355" : C.crimson} /><circle cx="88" cy="66" r="5" fill={phase2 ? "#FF3355" : C.crimson} /><path d="M40 50 L28 30 M100 50 L112 30" stroke={phase2 ? "#4A0A12" : "#2A0A12"} strokeWidth="7" strokeLinecap="round" /></>),
  };

  return (
    <div key={`e-${animKey}`} style={{ animation: `${animName} ${duration} cubic-bezier(0.34, 1.2, 0.64, 1) ${iteration} ${fill}`, width: size, height: size, filter: phase2 ? `drop-shadow(0 0 14px ${C.crimson})` : "none" }}>
      <svg viewBox={boss ? "0 0 140 130" : "0 0 92 100"} width={size} height={size}>
        <ellipse cx={boss ? 70 : 46} cy={boss ? 118 : 92} rx={boss ? 40 : 28} ry="6" fill="#000" opacity="0.35" />
        {bodies[kind] || bodies.wisp}
      </svg>
    </div>
  );
}

function Arena({ enemy, playerAnim, playerAnimKey, enemyAnim, enemyAnimKey, enemyDying, popups, particles, impacts, showSlash, slashKey, streak, playerBlock, bossPhase2, phaseBannerKey }) {
  return (
    <div style={{ position: "relative", height: 160, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 10px", marginBottom: 4, overflow: "visible" }}>
      <div style={{ position: "absolute", bottom: 2, left: "5%", right: "5%", height: 1, background: `linear-gradient(90deg, transparent, ${C.line}, transparent)` }} />

      {streak > 1 && (
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", fontFamily: "'Cinzel', serif", fontSize: 14, color: C.gold, letterSpacing: 1, animation: "streakPulse 0.8s ease infinite" }}>
          🔥 COMBO x{streak}
        </div>
      )}

      {bossPhase2 && (
        <div key={`phase-${phaseBannerKey}`} style={{ position: "absolute", top: 30, left: "50%", transform: "translateX(-50%)", fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 900, color: C.crimson, letterSpacing: 2, animation: "phaseBanner 2.2s ease forwards", pointerEvents: "none", whiteSpace: "nowrap", textShadow: `0 0 12px ${C.crimson}` }}>
          ⚠ ENRAGED ⚠
        </div>
      )}

      <div style={{ position: "relative" }}>
        <PlayerSprite anim={playerAnim} animKey={playerAnimKey} hasBlock={playerBlock} />
        {impacts.filter((x) => x.side === "player").map((x) => (
          <React.Fragment key={x.id}>
            <span style={{ position: "absolute", top: "30%", left: "20%", width: 60, height: 60, borderRadius: "50%", border: `4px solid ${x.color}`, animation: "impactRing 0.5s ease-out forwards", pointerEvents: "none" }} />
            <span style={{ position: "absolute", inset: 0, background: x.color, opacity: 0, borderRadius: 12, animation: "flashWhite 0.3s ease-out forwards", pointerEvents: "none", mixBlendMode: "screen" }} />
          </React.Fragment>
        ))}
        {popups.filter((p) => p.side === "player").map((p) => (
          <span key={p.id} style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", color: p.color, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, animation: "floatUpFade 0.9s ease forwards", pointerEvents: "none", whiteSpace: "nowrap" }}>{p.text}</span>
        ))}
        {particles.filter((x) => x.side === "player").map((x) => (
          <span key={x.id} style={{ position: "absolute", top: "40%", left: "50%", width: 6, height: 6, borderRadius: "50%", background: x.color, "--dx": x.dx, "--dy": x.dy, animation: "particleBurst 0.7s ease forwards", pointerEvents: "none" }} />
        ))}
      </div>

      {showSlash && (
        <div key={`slash-${slashKey}`} style={{ position: "absolute", right: "12%", top: "26%", width: 90, height: 8, background: `linear-gradient(90deg, transparent, ${C.gold}, #fff)`, borderRadius: 4, transformOrigin: "left center", animation: "weaponTrail 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards", pointerEvents: "none", boxShadow: `0 0 12px ${C.gold}` }} />
      )}

      <div style={{ position: "relative" }}>
        <EnemySprite kind={enemy.kind} anim={enemyAnim} animKey={enemyAnimKey} dying={enemyDying} boss={enemy.boss} phase2={bossPhase2} />
        {impacts.filter((x) => x.side === "enemy").map((x) => (
          <React.Fragment key={x.id}>
            <span style={{ position: "absolute", top: "30%", left: "20%", width: 60, height: 60, borderRadius: "50%", border: `4px solid ${x.color}`, animation: "impactRing 0.5s ease-out forwards", pointerEvents: "none" }} />
            <span style={{ position: "absolute", inset: 0, background: x.color, opacity: 0, borderRadius: 12, animation: "flashWhite 0.3s ease-out forwards", pointerEvents: "none", mixBlendMode: "screen" }} />
          </React.Fragment>
        ))}
        {popups.filter((p) => p.side === "enemy").map((p) => (
          <span key={p.id} style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", color: p.color, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, animation: "floatUpFade 0.9s ease forwards", pointerEvents: "none", whiteSpace: "nowrap" }}>{p.text}</span>
        ))}
        {particles.filter((x) => x.side === "enemy").map((x) => (
          <span key={x.id} style={{ position: "absolute", top: "40%", left: "50%", width: 6, height: 6, borderRadius: "50%", background: x.color, "--dx": x.dx, "--dy": x.dy, animation: "particleBurst 0.7s ease forwards", pointerEvents: "none" }} />
        ))}
      </div>
    </div>
  );
}

// ---------- Battle ----------

function BattleStage({
  enemy, enemyHp, enemyIntent, bossPhase2, phaseBannerKey, playerHp, playerMaxHp, playerBlock, hand, energy, maxEnergy, cardById, upgraded,
  activeCard, answerVal, setAnswerVal, revealed, hiddenOptions, blurredOption, displayOptions, timeLeft, timerMax,
  onPlayCard, onResolve, onCloseResult, onEndTurn, onUsePotion, onUseInsight, potions, insights,
  streak, log, drawCount, discardCount,
  playerAnim, playerAnimKey, enemyAnim, enemyAnimKey, enemyDying, popups, particles, impacts, showSlash, slashKey,
}) {
  const activeCardData = activeCard ? cardById(activeCard) : null;
  const boss = enemy.boss;
  const ability = ABILITIES[enemy.ability];
  const timerPct = timerMax ? (timeLeft / timerMax) * 100 : 100;
  const timerColor = timerPct > 50 ? C.teal : timerPct > 25 ? C.gold : C.red;
  const phaseBoost = boss && bossPhase2 ? 4 : 0;

  return (
    <div>
      <Arena enemy={enemy} playerAnim={playerAnim} playerAnimKey={playerAnimKey} enemyAnim={enemyAnim} enemyAnimKey={enemyAnimKey} enemyDying={enemyDying} popups={popups} particles={particles} impacts={impacts} showSlash={showSlash} slashKey={slashKey} streak={streak} playerBlock={playerBlock} bossPhase2={bossPhase2} phaseBannerKey={phaseBannerKey} />

      <div style={{ background: C.panel, border: `1px solid ${boss ? C.crimson : enemy.elite ? C.orange : C.line}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: boss ? C.crimson : enemy.elite ? C.orange : C.text }}>{enemy.name}{bossPhase2 ? " (ENRAGED)" : ""}</span>
          <span style={{ fontSize: 12, color: phaseBoost ? C.crimson : C.muted }}>Intent: ⚔ {enemyIntent + phaseBoost}</span>
        </div>
        <div style={{ height: 10, background: C.bg2, borderRadius: 5, marginTop: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.max(0, (enemyHp / enemy.hp) * 100)}%`, background: `linear-gradient(90deg, ${boss ? C.crimson : C.red}, ${C.gold})`, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{enemyHp} / {enemy.hp} HP</span>
          {ability.name && <span style={{ fontSize: 11, color: C.purple }}>✦ {ability.name}</span>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: C.muted }}>
          HP: <span style={{ color: playerHp < playerMaxHp * 0.3 ? C.red : C.text }}>{playerHp}/{playerMaxHp}</span>
          {playerBlock && <span style={{ color: C.blue, marginLeft: 6 }}>🛡️</span>}
        </div>
        <div style={{ fontSize: 13, color: C.gold }}>⚡ {energy}/{maxEnergy}</div>
        <div style={{ fontSize: 12, color: C.muted }}>Draw {drawCount} · Discard {discardCount}</div>
        <button onClick={onUsePotion} disabled={potions < 1 || playerHp >= playerMaxHp} style={{ background: C.panelLight, border: `1px solid ${C.line}`, borderRadius: 6, color: potions < 1 || playerHp >= playerMaxHp ? C.muted : C.text, fontSize: 12, padding: "5px 9px", cursor: potions < 1 || playerHp >= playerMaxHp ? "not-allowed" : "pointer" }}>
          🧪 {potions}
        </button>
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, minHeight: 18 }}>{log[log.length - 1]}</div>

      {activeCardData && (
        <div style={{ background: C.panelLight, border: `1px solid ${ROLES[activeCardData.role || "strike"].color}`, borderRadius: 10, padding: 18, marginBottom: 18 }}>
          {!revealed && (
            <div style={{ height: 6, background: C.bg2, borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, transition: "width 0.1s linear" }} />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 11, letterSpacing: 1.5, color: DIFF[activeCardData.difficulty].color, fontFamily: "'Cinzel', serif" }}>
              {ROLES[activeCardData.role || "strike"].icon} {ROLES[activeCardData.role || "strike"].name}{upgraded.includes(activeCardData.id) ? "+" : ""} · {DIFF[activeCardData.difficulty].label} · {activeCardData.topic}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!revealed && <span style={{ fontSize: 12, color: timerColor, fontFamily: "'Cinzel', serif" }}>{Math.ceil(timeLeft)}s</span>}
              {activeCardData.type === "mcq" && !revealed && (
                <button onClick={onUseInsight} disabled={insights < 1 || hiddenOptions.length > 0} style={{ background: "transparent", border: `1px solid ${insights > 0 && hiddenOptions.length === 0 ? C.gold : C.line}`, borderRadius: 6, color: insights > 0 && hiddenOptions.length === 0 ? C.gold : C.muted, fontSize: 11, padding: "4px 8px", cursor: insights > 0 && hiddenOptions.length === 0 ? "pointer" : "not-allowed" }}>
                  📜 ({insights})
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize: 15, marginBottom: 14, lineHeight: 1.4 }}>{activeCardData.question}</div>

          {!revealed ? (
            activeCardData.type === "mcq" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {displayOptions.map((opt, i) => {
                  const hidden = hiddenOptions.includes(opt);
                  const blurred = blurredOption === opt;
                  return (
                    <button key={`${opt}-${i}`} onClick={() => !hidden && onResolve(opt)} disabled={hidden} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.bg2, color: hidden ? C.line : C.text, cursor: hidden ? "not-allowed" : "pointer", fontSize: 13, textDecoration: hidden ? "line-through" : "none", opacity: hidden ? 0.4 : 1 }}>
                      {String.fromCharCode(65 + i)}. {blurred ? "▓▓▓▓▓▓▓▓▓▓" : opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={answerVal} onChange={(e) => setAnswerVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && answerVal.trim()) onResolve(answerVal); }} placeholder="Your answer..." style={{ flex: 1, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 12px", color: C.text, fontSize: 13 }} />
                <button onClick={() => onResolve(answerVal)} disabled={!answerVal.trim()} style={btn(answerVal.trim() ? C.gold : C.line, { marginTop: 0 })}>Cast</button>
              </div>
            )
          ) : (
            <div>
              <div style={{ color: revealed.correct ? C.green : C.red, fontFamily: "'Cinzel', serif", fontSize: 14, marginBottom: 6 }}>
                {revealed.correct
                  ? `${ROLES[revealed.role].icon} HIT — ${revealed.dmg} damage!${revealed.swift ? " ⚡ SWIFT" : ""}${revealed.heal ? ` +${revealed.heal} HP` : ""}${revealed.gainBlock ? " 🛡️ shield up" : ""} · +${revealed.goldEarn}g`
                  : revealed.timedOut ? "⏳ TIME'S UP" + (revealed.selfDmg ? ` — you take ${revealed.selfDmg}` : " — the card crumbles")
                  : revealed.selfDmg ? `${revealed.role === "gambit" ? "🎲 GAMBIT BACKFIRES" : "WRONG"} — you take ${revealed.selfDmg} damage`
                  : "MISS — card fizzles. Combo broken."}
              </div>
              {revealed.correct ? (
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{activeCardData.explanation}</div>
              ) : (
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                  The answer stays hidden — revisit <span style={{ color: C.red }}>{activeCardData.topic}</span> in your source material. This question will find you again.
                </div>
              )}
              <button onClick={onCloseResult} style={btn(C.teal)}>Continue</button>
            </div>
          )}
        </div>
      )}

      {!activeCardData && (
        <>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
            {hand.map((id, idx) => {
              const c = cardById(id);
              if (!c) return null;
              const d = DIFF[c.difficulty];
              const r = ROLES[c.role || "strike"];
              const isUp = upgraded.includes(id);
              const affordable = energy >= 1;
              return (
                <button key={id} onClick={() => affordable && onPlayCard(id)} style={{ minWidth: 138, maxWidth: 138, background: C.panel, border: `${isUp ? 2 : 1}px solid ${r.color}`, borderRadius: 10, padding: 12, textAlign: "left", color: C.text, cursor: affordable ? "pointer" : "not-allowed", opacity: affordable ? 1 : 0.4, flexShrink: 0, animation: `cardDraw 0.35s ease ${idx * 0.07}s backwards`, boxShadow: isUp ? `0 0 8px ${r.color}44` : "none" }}>
                  <div style={{ fontSize: 10, color: r.color, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>{r.icon} {r.name}{isUp ? "+" : ""} · {d.label}</div>
                  <div style={{ fontSize: 10, color: C.muted, margin: "4px 0" }}>{r.desc}</div>
                  <div style={{ fontSize: 11, color: d.color }}>{c.topic}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.3, marginTop: 4 }}>{c.question.slice(0, 45)}{c.question.length > 45 ? "…" : ""}</div>
                </button>
              );
            })}
          </div>
          <div style={{ textAlign: "right", marginTop: 14 }}>
            <button onClick={onEndTurn} style={btn(C.purple, { color: "#fff" })}>End Turn →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- End screen with study debrief ----------

function EndStage({ victory, totalCorrect, totalAnswered, missedTopics, bestStreak, swiftCount, floorIndex, totalFloors, gold, save, copied, onCopy, onRestart }) {
  const accuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const uniqueMissed = [...new Set(missedTopics)];
  const lifetime = (topic) => {
    const t = save.topicStats[topic];
    if (!t || t.c + t.w === 0) return null;
    return Math.round((t.c / (t.c + t.w)) * 100);
  };
  return (
    <div style={{ textAlign: "center", paddingTop: 30 }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 28, color: victory ? C.gold : C.red, marginBottom: 8 }}>
        {victory ? "YOU PASSED THE FINAL EXAM" : "YOU HAVE FALLEN"}
      </div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
        {victory ? "Every guardian defeated. The Spire is conquered." : `Fell on floor ${floorIndex + 1} of ${totalFloors}.`}
      </p>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 20, marginBottom: 16, textAlign: "left" }}>
        <div style={{ fontSize: 14 }}>{totalCorrect} / {totalAnswered} cards landed — {accuracy}% accuracy</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Best combo: x{bestStreak} · Swift answers: {swiftCount} · Gold: ◉ {gold}g · Wisdom banked: 🔮 {save.wisdom}</div>
        {uniqueMissed.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>STUDY DEBRIEF — TOPICS THAT BEAT YOU</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {uniqueMissed.map((t, i) => {
                const acc = lifetime(t);
                return (
                  <span key={i} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.red}`, color: C.red, fontSize: 12 }}>
                    {t}{acc !== null ? ` · lifetime ${acc}%` : ""}
                  </span>
                );
              })}
            </div>
            <button onClick={onCopy} style={btn(C.panelLight, { color: C.teal, marginTop: 12, padding: "8px 14px", fontSize: 12 })}>
              {copied ? "✓ Copied!" : "📋 Copy study list to clipboard"}
            </button>
          </div>
        )}
      </div>
      <button onClick={onRestart} style={btn(C.gold)}>Back to the Spire gates</button>
    </div>
  );
}
