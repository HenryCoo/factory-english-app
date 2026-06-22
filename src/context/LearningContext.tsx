import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useMemo } from 'react';
import type { Sentence, SentenceOverride, LearningRecord, DailyStats } from '@/types';
import sentenceData from '@/data/sentences.json';

// SRS intervals (in days) based on correct answer streak
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

// localStorage keys
const STORAGE_KEY = 'factory-english-learning';
const CUSTOM_KEY = 'factory-english-custom';
const OVERRIDES_KEY = 'factory-english-overrides';
const NEXT_CUSTOM_ID_KEY = 'factory-english-next-id';

interface LearningState {
  records: Record<number, LearningRecord>;
  dailyStats: Record<string, DailyStats>;
  currentIndex: number;
  selectedCategory: string;
  showFlipped: boolean;
}

type LearningAction =
  | { type: 'ANSWER'; sentenceId: number; correct: boolean; mode: 'flashcard' | 'typing' | 'dialogue' }
  | { type: 'SET_CATEGORY'; category: string }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'FLIP_CARD' }
  | { type: 'LOAD_STATE'; state: Partial<LearningState> };

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const staticSentences = sentenceData as Sentence[];

function reducer(state: LearningState, action: LearningAction): LearningState {
  switch (action.type) {
    case 'ANSWER': {
      const { sentenceId, correct, mode } = action;
      const existing = state.records[sentenceId];
      const now = Date.now();
      const newRecord: LearningRecord = existing || {
        sentenceId,
        status: 'learning',
        lastReview: 0,
        nextReview: 0,
        correctCount: 0,
        wrongCount: 0,
        history: [],
      };

      const baseStreak = correct ? (newRecord.history.filter(h => h.result === 'correct').length) : 0;
      const intervalIndex = Math.min(baseStreak, SRS_INTERVALS.length - 1);

      const days = correct
        ? (SRS_INTERVALS[intervalIndex] || 1)
        : 1;

      newRecord.history = [...newRecord.history, { timestamp: now, result: correct ? 'correct' : 'wrong', mode }];
      newRecord.lastReview = now;
      newRecord.nextReview = now + days * 86400000;
      if (correct) newRecord.correctCount++;
      else newRecord.wrongCount++;

      const totalCorrect = newRecord.history.filter(h => h.result === 'correct').length;
      const totalEntries = newRecord.history.length;
      const accuracy = totalEntries > 0 ? totalCorrect / totalEntries : 0;

      if (accuracy >= 0.85 && totalEntries >= 5) {
        newRecord.status = 'mastered';
      } else if (totalEntries >= 2) {
        newRecord.status = 'reviewing';
      } else {
        newRecord.status = 'learning';
      }

      const todayKey = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      })();
      const todayStats = state.dailyStats[todayKey] || { date: todayKey, newLearned: 0, reviewed: 0, correctRate: 0 };
      const updatedStats = {
        ...todayStats,
        reviewed: todayStats.reviewed + 1,
        newLearned: existing ? todayStats.newLearned : todayStats.newLearned + 1,
        correctRate: 0,
      };

      return {
        ...state,
        records: { ...state.records, [sentenceId]: newRecord },
        dailyStats: { ...state.dailyStats, [todayKey]: updatedStats },
      };
    }
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.category, currentIndex: 0 };
    case 'SET_INDEX':
      return { ...state, currentIndex: action.index, showFlipped: false };
    case 'FLIP_CARD':
      return { ...state, showFlipped: !state.showFlipped };
    case 'LOAD_STATE':
      return { ...state, ...action.state };
    default:
      return state;
  }
}

interface LibraryApi {
  /** 最终合并的词条列表（内置+覆盖+自定义） */
  allSentences: Sentence[];
  /** 自定义词条 */
  customSentences: Sentence[];
  /** 添加自定义词条，返回它的 id_num */
  addCustomSentence(s: Omit<Sentence, 'id' | 'id_num'>): number;
  /** 更新自定义词条 */
  updateCustomSentence(id_num: number, s: Partial<Omit<Sentence, 'id' | 'id_num'>>): void;
  /** 删除自定义词条 */
  deleteCustomSentence(id_num: number): void;
  /** 覆盖内置词条 */
  overrideBuiltin(id_num: number, s: Partial<Omit<Sentence, 'id' | 'id_num'>>): void;
  /** 还原内置词条（清除覆盖） */
  restoreBuiltin(id_num: number): void;
  /** 导入多条自定义 */
  importCustomSentences(list: Omit<Sentence, 'id' | 'id_num'>[]): number;
}

interface LearningContextType {
  state: LearningState;
  dispatch: React.Dispatch<LearningAction>;
  sentences: Sentence[];
  library: LibraryApi;
  getFilteredSentences: () => Sentence[];
  getDueReviewSentences: () => Sentence[];
  getStats: () => { total: number; learned: number; mastered: number; reviewing: number; accuracy: number; streak: number };
}

const LearningContext = createContext<LearningContextType | null>(null);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    records: {},
    dailyStats: {},
    currentIndex: 0,
    selectedCategory: 'all',
    showFlipped: false,
  });

  // 自定义 + 覆盖数据
  const [customSentences, setCustomSentences_] = useState<Sentence[]>(() => loadJSON(CUSTOM_KEY, []));
  const [overrides, setOverrides_] = useState<Record<number, SentenceOverride>>(() => loadJSON(OVERRIDES_KEY, {}));

  const persistCustom = (list: Sentence[]) => {
    setCustomSentences_(list);
    saveJSON(CUSTOM_KEY, list);
  };
  const persistOverrides = (map: Record<number, SentenceOverride>) => {
    setOverrides_(map);
    saveJSON(OVERRIDES_KEY, map);
  };

  // 合并：内置 + 覆盖 + 自定义
  const allSentences = useMemo<Sentence[]>(() => {
    const base = staticSentences.map(s => overrides[s.id_num] ? { ...s, ...overrides[s.id_num] } : s);
    return [...base, ...customSentences];
  }, [overrides, customSentences]);

  // 存学习状态
  useEffect(() => {
    saveJSON(STORAGE_KEY, {
      records: state.records,
      dailyStats: state.dailyStats,
      currentIndex: state.currentIndex,
      selectedCategory: state.selectedCategory,
    });
  }, [state]);

  // 加载学习状态
  useEffect(() => {
    const saved = loadJSON<Partial<LearningState>>(STORAGE_KEY, {});
    if (saved.records || saved.dailyStats) {
      dispatch({ type: 'LOAD_STATE', state: saved });
    }
  }, []);

  // 生成下一个自定义 ID
  const nextCustomId = useCallback(() => {
    let next = loadJSON<number>(NEXT_CUSTOM_ID_KEY, 10000);
    saveJSON(NEXT_CUSTOM_ID_KEY, next + 1);
    return next;
  }, []);

  // === 学习库 CRUD ===
  const library: LibraryApi = {
    allSentences,

    customSentences,

    addCustomSentence(s): number {
      const id_num = nextCustomId();
      const entry: Sentence = {
        id: `C${id_num}`,
        id_num,
        word: s.word,
        pos: s.pos || '',
        chinese_word: s.chinese_word,
        pronunciation_en: s.pronunciation_en || '',
        pronunciation_us: s.pronunciation_us || '',
        sentence_en: s.sentence_en || '',
        sentence_cn: s.sentence_cn || '',
        category: s.category,
        difficulty: s.difficulty || 2,
      };
      persistCustom([...customSentences, entry]);
      return id_num;
    },

    updateCustomSentence(id_num, s) {
      persistCustom(customSentences.map(item =>
        item.id_num === id_num ? { ...item, ...s } : item
      ));
    },

    deleteCustomSentence(id_num) {
      persistCustom(customSentences.filter(item => item.id_num !== id_num));
    },

    overrideBuiltin(id_num, s) {
      const existing = staticSentences.find(x => x.id_num === id_num);
      if (!existing) return;
      persistOverrides({ ...overrides, [id_num]: { ...existing, ...s } });
    },

    restoreBuiltin(id_num) {
      const { [id_num]: _, ...rest } = overrides;
      persistOverrides(rest);
    },

    importCustomSentences(list) {
      let count = 0;
      const batch: Sentence[] = [];
      for (const item of list) {
        const id_num = nextCustomId();
        batch.push({
          id: `C${id_num}`,
          id_num,
          word: item.word,
          pos: item.pos || '',
          chinese_word: item.chinese_word,
          pronunciation_en: item.pronunciation_en || '',
          pronunciation_us: item.pronunciation_us || '',
          sentence_en: item.sentence_en || '',
          sentence_cn: item.sentence_cn || '',
          category: item.category || 'general',
          difficulty: item.difficulty || 2,
        });
        count++;
      }
      persistCustom([...customSentences, ...batch]);
      return count;
    },
  };

  // 以下保持原有逻辑不变
  const sentences = allSentences;

  const getFilteredSentences = useCallback(() => {
    if (state.selectedCategory === 'all') return sentences;
    return sentences.filter(s => s.category === state.selectedCategory);
  }, [state.selectedCategory, sentences]);

  const getDueReviewSentences = useCallback(() => {
    const now = Date.now();
    return sentences.filter(s => {
      const rec = state.records[s.id_num];
      return rec && rec.nextReview <= now && rec.status !== 'mastered';
    }).sort((a, b) => {
      const ra = state.records[a.id_num];
      const rb = state.records[b.id_num];
      if ((rb?.wrongCount || 0) !== (ra?.wrongCount || 0)) return (rb?.wrongCount || 0) - (ra?.wrongCount || 0);
      return (ra?.nextReview || 0) - (rb?.nextReview || 0);
    });
  }, [state.records, sentences]);

  const getStats = useCallback(() => {
    const learned = Object.values(state.records).filter(r => r.status !== 'new').length;
    const mastered = Object.values(state.records).filter(r => r.status === 'mastered').length;
    const reviewing = Object.values(state.records).filter(r => r.status === 'reviewing').length;
    const allReviews = Object.values(state.records).flatMap(r => r.history);
    const correctReviews = allReviews.filter(h => h.result === 'correct').length;
    const accuracy = allReviews.length > 0 ? Math.round(correctReviews / allReviews.length * 100) : 0;

    let streak = 0;
    const today = new Date();
    for (let d = 0; d < 365; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      if (state.dailyStats[key] && state.dailyStats[key].reviewed > 0) {
        streak++;
      } else if (d > 0) {
        break;
      }
    }

    return { total: sentences.length, learned, mastered, reviewing, accuracy, streak };
  }, [state.records, state.dailyStats, sentences.length]);

  return (
    <LearningContext.Provider value={{
      state, dispatch, sentences, library,
      getFilteredSentences, getDueReviewSentences, getStats,
    }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error('useLearning must be used within LearningProvider');
  return ctx;
}
