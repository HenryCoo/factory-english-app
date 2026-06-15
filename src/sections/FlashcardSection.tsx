import { useState, useCallback, useEffect } from 'react';
import { useLearning } from '@/context/LearningContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_MAP } from '@/types';

export function FlashcardSection() {
  const navigate = useNavigate();
  const { state, dispatch, getFilteredSentences, sentences } = useLearning();
  const [flipped, setFlipped] = useState(false);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<'new' | 'review'>('new');

  const allSentences = getFilteredSentences();
  const dueReview = sentences.filter(s => {
    const rec = state.records[s.id_num];
    return rec && rec.nextReview <= Date.now() && rec.status !== 'mastered';
  }).sort((a, b) => ((state.records[a.id_num]?.nextReview || 0) - (state.records[b.id_num]?.nextReview || 0)));

  const currentList = mode === 'review' && dueReview.length > 0 ? dueReview : allSentences;
  const current = currentList[idx] || allSentences[Math.min(idx, allSentences.length - 1)];
  const catInfo = CATEGORY_MAP[current?.category];

  const handleAnswer = useCallback((correct: boolean) => {
    if (current) {
      dispatch({ type: 'ANSWER', sentenceId: current.id_num, correct, mode: 'flashcard' });
    }
    setFlipped(false);
    if (idx < currentList.length - 1) {
      setIdx(idx + 1);
    } else {
      setIdx(0);
    }
  }, [current, idx, currentList.length, dispatch]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    return () => { speechSynthesis.cancel(); };
  }, []);

  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">没有找到学习内容</h2>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/')}>← 返回</Button>
          <div className="flex gap-2">
            <Badge variant={mode === 'new' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => { setMode('new'); setIdx(0); setFlipped(false); }}>
              学习
            </Badge>
            <Badge variant={mode === 'review' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => { setMode('review'); setIdx(0); setFlipped(false); }}>
              复习 {dueReview.length > 0 && `(${dueReview.length})`}
            </Badge>
          </div>
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between mb-3 text-sm text-slate-500 dark:text-slate-400">
          <span>{catInfo?.icon} {catInfo?.name || '全部'}</span>
          <span>{idx + 1} / {currentList.length}</span>
        </div>

        {/* Flashcard */}
        <div className="perspective-1000 mb-6" style={{ perspective: '1000px' }}>
          <div
            className={`relative w-full min-h-[320px] cursor-pointer transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}
            style={{ transformStyle: 'preserve-3d' }}
            onClick={() => setFlipped(!flipped)}
          >
            {/* Front */}
            <Card
              className="absolute inset-0 backface-hidden border-2 border-blue-200 dark:border-blue-800"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <CardContent className="pt-8 pb-6 px-6 flex flex-col items-center justify-center min-h-[320px]">
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3 leading-relaxed">
                    {current.word}
                  </div>
                  <div className="text-sm text-slate-400 dark:text-slate-500 mb-2">
                    {current.pronunciation_us}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {current.pos}
                  </div>
                  <div className="text-base italic text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                    "{current.sentence_en}"
                  </div>
                  <div className="mt-4">
                    <Badge variant="secondary" className="text-xs">
                      {catInfo?.name || current.category}
                    </Badge>
                    <Badge variant={current.difficulty === 1 ? 'secondary' : current.difficulty === 2 ? 'default' : 'destructive'} className="ml-2 text-xs">
                      {'★'.repeat(current.difficulty)}
                    </Badge>
                  </div>
                  <div className="mt-4 text-sm text-slate-400 dark:text-slate-500">
                    👆 点击翻转查看中文
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Back */}
            <Card
              className="absolute inset-0 backface-hidden rotate-y-180 border-2 border-emerald-200 dark:border-emerald-800"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <CardContent className="pt-10 pb-6 px-6 flex flex-col items-center justify-center min-h-[320px]">
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4 leading-relaxed">
                    {current.word}
                  </div>
                  <div className="text-2xl text-emerald-600 dark:text-emerald-400 font-semibold mb-4">
                    {current.chinese_word}
                  </div>
                  <div className="text-base text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                    "{current.sentence_cn}"
                  </div>
                  <div className="text-sm text-slate-400 dark:text-slate-500">
                    {current.pos} · {current.pronunciation_us}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => speak(current.sentence_en)} className="flex items-center gap-1">
            🔊 朗读
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setFlipped(false); if (idx < currentList.length - 1) setIdx(idx + 1); else setIdx(0); }}>
            ⏭ 跳过
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            onClick={() => handleAnswer(false)}
          >
            😣 再复习
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
            onClick={() => handleAnswer(true)}
          >
            🤔 不确定
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleAnswer(true)}
          >
            ✅ 记住了
          </Button>
        </div>

        {/* Category progress */}
        <div className="mt-6">
          <Progress value={(idx / currentList.length) * 100} className="h-2" />
        </div>
      </div>
    </div>
  );
}
