/**
 * 跨平台 TTS 语音工具
 * 解决移动端 voices 异步加载导致的静默失败
 */

let voicesLoaded = false;
let englishVoices: SpeechSynthesisVoice[] = [];

// 预加载 voices — 在 app 初始化时调用一次
export function initTTS(): void {
  if (!('speechSynthesis' in window)) return;

  const loadVoices = () => {
    const all = speechSynthesis.getVoices();
    if (all.length > 0) {
      englishVoices = all.filter(v => v.lang.startsWith('en'));
      voicesLoaded = true;
    }
  };

  // 立即尝试（某些浏览器同步返回）
  loadVoices();

  // 异步加载兜底（Chrome/Android 是异步的）
  speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

// 核心 speak 函数
export function speak(text: string, rate = 0.9, pitch = 1): void {
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported');
    return;
  }

  // 先取消当前正在播放的声音，避免排队
  speechSynthesis.cancel();

  // 小延迟避免被浏览器静默忽略（特别是 iOS Safari 要求在当前事件循环中调用）
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = 'en-US';

    // 如果已加载英文 voice，选一个最好的
    if (voicesLoaded && englishVoices.length > 0) {
      // 优先选美式英语
      const usVoice = englishVoices.find(v => v.lang === 'en-US');
      utterance.voice = usVoice || englishVoices[0];
    } else {
      // voices 还没加载完 — 重新获取一次
      const all = speechSynthesis.getVoices();
      const enList = all.filter(v => v.lang.startsWith('en'));
      if (enList.length > 0) {
        const us = enList.find(v => v.lang === 'en-US');
        utterance.voice = us || enList[0];
        englishVoices = enList;
        voicesLoaded = true;
      }
    }

    speechSynthesis.speak(utterance);
  }, 10);
}
