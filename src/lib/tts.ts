/**
 * 跨平台 TTS 语音工具
 * speechSynthesis 失败时自动降级到 Google TTS 音频流
 * 确保鸿蒙/iOS/Android 全平台可用
 */

let audioElement: HTMLAudioElement | null = null;

// 判断是否支持 speechSynthesis 且能正常工作
// 鸿蒙浏览器可能声明支持但实际不会播放声音
function checkSpeechSupport(): boolean {
  if (!('speechSynthesis' in window)) return false;
  // 检测是否有英文语音可用
  try {
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return false;
    return voices.some(v => v.lang.startsWith('en'));
  } catch {
    return false;
  }
}

// 预加载 — app 启动时触发 voices 加载
export function initTTS(): void {
  if (!('speechSynthesis' in window)) return;

  // 触发 voices 加载（某些浏览器需要用户手势后才加载，我们只是提前调用）
  speechSynthesis.getVoices();

  speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
  };

  // 预加载一个静默 utterance 以"激活"语音引擎
  new SpeechSynthesisUtterance('');
}

// 方案 A：Web Speech API（桌面端优先）
function speakViaWebSpeech(text: string, rate: number, pitch: number): boolean {
  try {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = 'en-US';
    utterance.volume = 1;

    // 选最优美式英文语音
    const voices = speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (enVoices.length > 0) {
      const us = enVoices.find(v => v.lang === 'en-US');
      utterance.voice = us || enVoices[0];
    }

    speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

// 方案 B：Google TTS 音频流（全平台兜底，包括鸿蒙）
function speakViaAudio(text: string): void {
  // 停止上一个
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement.remove();
  }

  // 拆分长文本避免 URL 过长（Google TTS 限制约 200 字符）
  const chunkSize = 180;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }

  let currentChunk = 0;

  const playNext = () => {
    if (currentChunk >= chunks.length) return;

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(chunks[currentChunk])}`;

    const audio = new Audio(url);
    audio.volume = 1;
    audio.onended = () => {
      currentChunk++;
      playNext();
    };
    audio.onerror = () => {
      currentChunk++;
      playNext();
    };

    audioElement = audio;
    audio.play().catch(() => {
      // 自动播放被阻止，静默失败
    });
  };

  playNext();
}

// 核心 speak — 自动选最优方案
export function speak(text: string, rate = 0.9, _pitch = 1): void {
  if (!text || text.trim().length === 0) return;

  // 桌面端优先用 Web Speech API（音质更好）
  if (checkSpeechSupport() && !isMobileDevice()) {
    speakViaWebSpeech(text, rate, 1);
    return;
  }

  // 移动端 / 鸿蒙 → 直接走音频流方案
  speakViaAudio(text);
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|HarmonyOS|OpenHarmony|Mobile/i.test(navigator.userAgent);
}
