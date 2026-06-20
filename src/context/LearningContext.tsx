import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { Sentence, LearningRecord, DailyStats } from '@/types';
import sentenceData from '@/data/sentences.json';

// SRS intervals (in days) based on correct answer streak
const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

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

const STORAGE_KEY = 'factory-english-learning';

function loadState(): Partial<LearningState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function saveState(state: LearningState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      records: state.records,
      dailyStats: state.dailyStats,
      currentIndex: state.currentIndex,
      selectedCategory: state.selectedCategory,
    }));
  } catch {}
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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

      // 自适应：错误的词间隔短，正确的按 streak 递增
      const days = correct
        ? (SRS_INTERVALS[intervalIndex] || 1)
        : 1; // 答错 → 明天再来

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

      const todayKey = getTodayKey();
      const todayStats = state.dailyStats[todayKey] || { date: todayKey, newLearned: 0, reviewed: 0, correctRate: 0 };
      const updatedStats = {
        ...todayStats,
        reviewed: todayStats.reviewed + 1,
        newLearned: existing ? todayStats.newLearned : todayStats.newLearned + 1,
        correctRate: 0, // will be recalculated
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

interface LearningContextType {
  state: LearningState;
  dispatch: React.Dispatch<LearningAction>;
  sentences: Sentence[];
  getFilteredSentences: () => Sentence[];
  getDueReviewSentences: () => Sentence[];
  getStats: () => { total: number; learned: number; mastered: number; reviewing: number; accuracy: number; streak: number };
}

const LearningContext = createContext<LearningContextType | null>(null);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const sentences = sentenceData as Sentence[];
  const [state, dispatch] = useReducer(reducer, {
    records: {},
    dailyStats: {},
    currentIndex: 0,
    selectedCategory: 'all',
    showFlipped: false,
  });

  // Load saved state on mount
  useEffect(() => {
    const saved = loadState();
    if (saved.records || saved.dailyStats) {
      dispatch({ type: 'LOAD_STATE', state: saved });
    }
  }, []);

  // Save state on change
  useEffect(() => {
    saveState(state);
  }, [state]);

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
      const recA = state.records[a.id_num];
      const recB = state.records[b.id_num];
      return (recA?.nextReview || 0) - (recB?.nextReview || 0);
    });
  }, [state.records, sentences]);

  const getStats = useCallback(() => {
    const learned = Object.values(state.records).filter(r => r.status !== 'new').length;
    const mastered = Object.values(state.records).filter(r => r.status === 'mastered').length;
    const reviewing = Object.values(state.records).filter(r => r.status === 'reviewing').length;
    const allReviews = Object.values(state.records).flatMap(r => r.history);
    const correctReviews = allReviews.filter(h => h.result === 'correct').length;
    const accuracy = allReviews.length > 0 ? Math.round(correctReviews / allReviews.length * 100) : 0;

    // Calculate streak
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

    return {
      total: sentences.length,
      learned,
      mastered,
      reviewing,
      accuracy,
      streak,
    };
  }, [state.records, state.dailyStats, sentences.length]);

  return (
    <LearningContext.Provider value={{ state, dispatch, sentences, getFilteredSentences, getDueReviewSentences, getStats }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error('useLearning must be used within LearningProvider');
  return ctx;
}
