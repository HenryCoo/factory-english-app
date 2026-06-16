/**
 * 跨平台 TTS 语音工具
 * 统一使用 Web Speech API，预加载 voices 解决移动端问题
 */

// 获取英文语音列表
function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
}

// 预加载 — app 启动时调用
export function initTTS(): void {
  if (!('speechSynthesis' in window)) return;

  const load = () => {
    getEnglishVoices();
  };

  // 首次尝试（某些浏览器同步）
  load();

  // 异步加载兜底
  speechSynthesis.onvoiceschanged = load;
}

// 核心 speak 函数
export function speak(text: string, rate = 0.9): void {
  if (!text || text.trim().length === 0) return;
  if (!('speechSynthesis' in window)) return;

  // 先停止当前播放
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.volume = 1;

  // 选英文语音 — 优先美式
  const voices = getEnglishVoices();
  if (voices.length > 0) {
    const us = voices.find(v => v.lang === 'en-US');
    utterance.voice = us || voices[0];
  }

  speechSynthesis.speak(utterance);
}
