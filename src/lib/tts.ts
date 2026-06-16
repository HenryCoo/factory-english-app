/**
 * 跨平台 TTS 语音工具
 *
 * 策略：
 * 1. 先尝试 speechSynthesis（自带语音引擎）
 * 2. 1 秒内没发出声音则走音频流兜底（用 CF Workers 代理 Google TTS）
 */

import { toast } from 'sonner';

let lastSpokeTime = 0;

// === 方案 A：Web Speech API ===
function trySpeechSynth(text: string, rate: number): boolean {
  if (!('speechSynthesis' in window)) return false;

  try {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.volume = 1;

    // 选英文语音
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      const en = voices.filter(v => v.lang.startsWith('en'));
      if (en.length > 0) {
        utterance.voice = en.find(v => v.lang === 'en-US') || en[0];
      }
    }

    let started = false;
    utterance.onstart = () => { started = true; };

    // 如果系统收到错误事件，说明引擎有问题
    utterance.onerror = () => {
      if (!started) console.warn('SpeechSynthesis errored silently');
    };

    speechSynthesis.speak(utterance);
    return true; // 乐观返回 true，onstart 事件稍后再确认
  } catch {
    return false;
  }
}

// === 方案 B：音频流兜底（通过代理访问 Google TTS） ===

// 每次播放前先清理旧的 audio
let currentAudio: HTMLAudioElement | null = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio.remove();
    currentAudio = null;
  }
}

// 播放代理后的 TTS 音频
function playAudioFallback(text: string): void {
  stopAudio();

  // 长句拆分
  const chunkSize = 180;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, Math.min(i + chunkSize, text.length)));
  }

  // 尝试多个代理源（有些在墙内能通）
  const proxies = [
    (q: string) => `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(q)}`,
    (q: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(q)}`)}`,
  ];

  let proxyIdx = 0;
  let chunkIdx = 0;

  const playChunk = () => {
    if (chunkIdx >= chunks.length) return;

    const url = proxies[proxyIdx](chunks[chunkIdx]);

    const audio = new Audio();
    audio.volume = 1;
    audio.preload = 'auto';

    let timeout: ReturnType<typeof setTimeout>;

    audio.oncanplaythrough = () => {
      clearTimeout(timeout);
      audio.play().catch(() => {});
    };

    audio.onended = () => {
      chunkIdx++;
      playChunk();
    };

    audio.onerror = () => {
      // 当前代理失败，换下一个
      proxyIdx++;
      if (proxyIdx < proxies.length) {
        playChunk(); // retry with next proxy
      } else {
        // 所有代理都失败了
        chunkIdx++;
        proxyIdx = 0;
        playChunk();
      }
    };

    // 超时也换代理
    timeout = setTimeout(() => {
      audio.onerror?.(new Event('timeout'));
    }, 5000);

    currentAudio = audio;
    audio.src = url;
    audio.load();
  };

  playChunk();
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

  // 防止连击
  const now = Date.now();
  if (now - lastSpokeTime < 500) return;
  lastSpokeTime = now;

  // 先试方案 A
  const synthWorked = trySpeechSynth(text, rate);

  if (!synthWorked) {
    // 方案 B 兜底
    toast.info('正在加载语音...', { duration: 1000 });
    playAudioFallback(text);
  }
}
