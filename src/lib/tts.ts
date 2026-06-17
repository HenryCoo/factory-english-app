/**
 * 跨平台 TTS 语音工具
 *
 * 策略：
 * 1. Edge TTS (speech.platform.bing.com) — 微软 TTS，国内可访问，音质最好
 * 2. speechSynthesis — 浏览器原生，桌面端兜底
 */

import EdgeTTSBrowser from '@kingdanx/edge-tts-browser';

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

// 通过 Audio blob 播放
function playBlob(blob: Blob) {
  stopAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = 1;
  currentAudio = audio;
  audio.play().catch(() => {});
}

// === 方案 A：Edge TTS（微软云端，国内可达） ===
async function speakViaEdge(text: string, rate: number): Promise<boolean> {
  try {
    const tts = new EdgeTTSBrowser();
    const ratePercent = Math.round((rate - 1) * 100);
    const rateStr = (ratePercent >= 0 ? '+' : '') + ratePercent + '%';

    tts.tts.setVoiceParams({
      text,
      voice: 'en-US-AriaNeural',
      rate: rateStr,
      volume: '+0%',
    });

    const blob = await tts.ttsToFile('audio.mp3');
    playBlob(blob as Blob);
    return true;
  } catch {
    return false;
  }
}

// === 方案 B：Web Speech API 兜底 ===
function speakViaSpeech(text: string, rate: number): boolean {
  if (!('speechSynthesis' in window)) return false;

  try {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.volume = 1;

    const voices = speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (enVoices.length > 0) {
      utterance.voice = enVoices.find(v => v.lang === 'en-US') || enVoices[0];
    }

    speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

// === 公开 API ===

export function initTTS(): void {
  // 预加载 Edge TTS 的语音列表（触发 DNS/连接预热）
  EdgeTTSBrowser.getVoices().catch(() => {});

  if (!('speechSynthesis' in window)) return;
  speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
  };
}

export function speak(text: string, rate = 0.9): void {
  if (!text?.trim()) return;

  const now = Date.now();
  if (now - lastSpokeTime < 400) return;
  lastSpokeTime = now;

  // 优先 Edge TTS（音质好，墙内可达）
  speakViaEdge(text, rate).then(success => {
    if (!success) {
      // 兜底：浏览器自带语音
      speakViaSpeech(text, rate);
    }
  });
}
