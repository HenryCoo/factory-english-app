export interface Sentence {
  id: string;
  id_num: number;
  word: string;
  pos: string;
  chinese_word: string;
  pronunciation_en: string;
  pronunciation_us: string;
  sentence_en: string;
  sentence_cn: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

export interface LearningRecord {
  sentenceId: number;
  status: 'new' | 'learning' | 'reviewing' | 'mastered';
  lastReview: number;
  nextReview: number;
  correctCount: number;
  wrongCount: number;
  history: Array<{
    timestamp: number;
    result: 'correct' | 'wrong';
    mode: 'flashcard' | 'typing' | 'dialogue';
  }>;
}

export interface DailyStats {
  date: string;
  newLearned: number;
  reviewed: number;
  correctRate: number;
}

export interface SentenceOverride {
  id_num: number;
  word: string;
  pos: string;
  chinese_word: string;
  pronunciation_en: string;
  pronunciation_us: string;
  sentence_en: string;
  sentence_cn: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

export interface CategoryInfo {
  key: string;
  name: string;
  icon: string;
  description: string;
}

export const CATEGORY_MAP: Record<string, CategoryInfo> = {
  'production': { key: 'production', name: '生产管理', icon: '🏭', description: '生产计划、排程、产能与效率管理' },
  'quality': { key: 'quality', name: '质量控制', icon: '✅', description: '检验、缺陷、质量体系与改进' },
  'supply-chain': { key: 'supply-chain', name: '供应链', icon: '🚚', description: '采购、供应商、物料与物流管理' },
  'safety': { key: 'safety', name: '安全管理', icon: '🛡️', description: '安全规范、防护装备与应急处理' },
  'engineering': { key: 'engineering', name: '工程技术', icon: '🔧', description: '工程设计、自动化与设备维护' },
  'management': { key: 'management', name: '运营管理', icon: '📊', description: '团队管理、会议报告与持续改进' },
  'finance': { key: 'finance', name: '财务成本', icon: '💰', description: '成本控制、预算与财务指标' },
  'hr': { key: 'hr', name: '人力资源', icon: '👥', description: '员工招聘、培训与绩效考核' },
  'warehouse': { key: 'warehouse', name: '仓储物流', icon: '📦', description: '仓库管理、库存盘点与存储' },
  'general': { key: 'general', name: '综合', icon: '📚', description: '其他工厂英语常用词汇' },
};
