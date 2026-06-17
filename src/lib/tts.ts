/**
 * 跨平台 TTS 语音工具
 *
 * 策略（按优先级）：
 * 1. 远程 TTS API（HTTP POST，兼容性好）→ 返回 MP3 blob → Audio 播放
 * 2. speechSynthesis 兜底
 */

let lastSpokeTime = 0;
let currentAudio: HTMLAudioElement | null = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    URL.revokeObjectURL(currentAudio.src);
    currentAudio.remove();
    currentAudio = null;
  }
}

function playBlob(blob: Blob) {
  stopAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = 1;
  currentAudio = audio;
  audio.play().catch(() => {});
}

// === 方案 A：远程 Edge TTS 代理 API ===
const TTS_ENDPOINTS = [
  'https://tts.wangwangit.com/v1/audio/speech',
  'https://tts-api.ssrsss.workers.dev/v1/audio/speech',
];

async function speakViaAPI(text: string, rate: number): Promise<boolean> {
  for (const endpoint of TTS_ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          voice: 'en-US-AriaNeural',
          speed: rate,
          pitch: '0',
          style: 'general',
        }),
      });

      if (!resp.ok) continue;

      const blob = await resp.blob();
      if (blob.size < 200) continue; // 太小说明是错误响应
      playBlob(blob);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

// === 方案 B：Web Speech API ===
function speakViaSpeech(text: string, rate: number): boolean {
  if (!('speechSynthesis' in window)) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    u.volume = 1;
    const voices = speechSynthesis.getVoices();
    const en = voices.filter(v => v.lang.startsWith('en'));
    if (en.length > 0) u.voice = en.find(v => v.lang === 'en-US') || en[0];
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

// === 公开 API ===

export function initTTS(): void {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

export async function speak(text: string, rate = 0.9): Promise<void> {
  if (!text?.trim()) return;
  const now = Date.now();
  if (now - lastSpokeTime < 400) return;
  lastSpokeTime = now;

  const ok = await speakViaAPI(text, rate);
  if (!ok) speakViaSpeech(text, rate);
}
