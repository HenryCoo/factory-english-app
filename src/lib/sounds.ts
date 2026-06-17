/**
 * Web Audio API 音效工具 — 零外部依赖
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) {
  const c = getCtx();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

/** 答对 — 上升叮咚 */
export function playCorrect() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  [523, 659].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.25);
  });
}

/** 答错 — 低沉嗡 */
export function playWrong() {
  playTone(220, 0.35, 'sawtooth', 0.06);
}

/** 翻转 / 切换 — 短促咔嗒 */
export function playFlip() {
  playTone(800, 0.06, 'square', 0.04);
  setTimeout(() => playTone(1200, 0.04, 'square', 0.03), 40);
}

/** 页面切换 / 点击 */
export function playClick() {
  playTone(600, 0.05, 'sine', 0.05);
}
