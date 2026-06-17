/**
 * 跨平台 TTS 语音工具
 *
 * 策略：
 * 1. speechSynthesis — 桌面端可用，鸿蒙上 API 存在但不发音
 * 2. 检测是否真正发出了声音，没发出来就走音频流兜底
 */

import { toast } from 'sonner';

let lastSpokeTime = 0;
let currentAudio: HTMLAudioElement | null = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio.remove();
    currentAudio = null;
  }
}

// === 方案 B：音频流兜底（Google TTS + 多个代理源） ===
function playAudioFallback(text: string): void {
  stopAudio();

  const chunkSize = 180;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, Math.min(i + chunkSize, text.length)));
  }

  // 代理源列表（按优先级，有些在国内能用）
  const proxies = [
    // 直连 Google（有梯子时可用）
    (q: string) => `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(q)}`,
    // corsproxy.io（通用代理）
    (q: string) => `https://corsproxy.io/?${encodeURIComponent(`https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(q)}`)}`,
    // allorigins
    (q: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(q)}`)}`,
    // codetabs
    (q: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(q)}`)}`,
  ];

  let proxyIdx = 0;
  let chunkIdx = 0;

  const playChunk = () => {
    if (chunkIdx >= chunks.length) {
      stopAudio();
      return;
    }

    const url = proxies[proxyIdx](chunks[chunkIdx]);

    const audio = new Audio();
    audio.volume = 1;

    let settled = false;
    let cleanupTimer: ReturnType<typeof setTimeout>;

    const nextChunk = () => {
      if (settled) return;
      settled = true;
      clearTimeout(cleanupTimer);
      chunkIdx++;
      playChunk();
    };

    const nextProxy = () => {
      if (settled) return;
      settled = true;
      clearTimeout(cleanupTimer);
      proxyIdx++;
      if (proxyIdx < proxies.length) {
        playChunk(); // 用下一个代理重试同一个 chunk
      } else {
        // 所有代理都失败，跳过这个 chunk
        proxyIdx = 0;
        chunkIdx++;
        playChunk();
      }
    };

    audio.oncanplaythrough = () => {
      audio.play().catch(() => {});
    };

    audio.onended = nextChunk;
    audio.onerror = nextProxy;

    // 5 秒超时 → 换代理
    cleanupTimer = setTimeout(nextProxy, 5000);

    currentAudio = audio;
    audio.src = url;
    audio.load();
  };

  // 显示加载提示
  toast.info('正在加载语音...', { duration: 2000 });

  playChunk();
}

// === 方案 A + 失败检测 ===
function trySpeechWithFallback(text: string, rate: number): void {
  if (!('speechSynthesis' in window)) {
    playAudioFallback(text);
    return;
  }

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

    let started = false;

    // 1.2 秒内 onstart 没触发 → 认为语音引擎不可用
    const failTimer = setTimeout(() => {
      if (!started) {
        speechSynthesis.cancel();
        playAudioFallback(text);
      }
    }, 1200);

    utterance.onstart = () => {
      started = true;
      clearTimeout(failTimer);
    };

    utterance.onerror = () => {
      if (!started) {
        clearTimeout(failTimer);
        speechSynthesis.cancel();
        playAudioFallback(text);
      }
    };

    speechSynthesis.speak(utterance);
  } catch {
    playAudioFallback(text);
  }
}

// === 公开 API ===

export function initTTS(): void {
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

  trySpeechWithFallback(text, rate);
}
