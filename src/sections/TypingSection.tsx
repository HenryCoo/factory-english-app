import { useState, useMemo } from 'react';
import { useLearning } from '@/context/LearningContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_MAP } from '@/types';
import { speak } from '@/lib/tts';
import { playCorrect, playWrong, playFlip } from '@/lib/sounds';

export function TypingSection() {
  const navigate = useNavigate();
  const { dispatch, getFilteredSentences } = useLearning();
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 100000));

  const baseList = getFilteredSentences();

  const sentences = useMemo(() => {
    if (!shuffle) return baseList;
    let s = shuffleSeed;
    const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const arr = [...baseList];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [baseList, shuffle, shuffleSeed]);

  const current = sentences[idx] || sentences[0];
  const catInfo = CATEGORY_MAP[current?.category];

  const checkAnswer = () => {
    if (!current || result) return;

    // Normalize for comparison
    const userAnswer = input.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?;:'"]/g, '');
    const correctAnswer = current.sentence_en.toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?;:'"]/g, '');

    // Calculate accuracy (allow some leniency - 80% match)
    const userWords = userAnswer.split(' ');
    const correctWords = correctAnswer.split(' ');
    const matches = userWords.filter((w, i) => w === correctWords[i]).length;
    const accuracy = correctWords.length > 0 ? matches / correctWords.length : 0;

    const isCorrect = accuracy >= 0.8;

    setResult(isCorrect ? 'correct' : 'wrong');
    setTotalCount(prev => prev + 1);
    if (isCorrect) { setCorrectCount(prev => prev + 1); playCorrect(); }
    else playWrong();

    dispatch({ type: 'ANSWER', sentenceId: current.id_num, correct: isCorrect, mode: 'typing' });
  };

  const next = () => {
    setInput('');
    setResult(null);
    if (idx < sentences.length - 1) {
      setIdx(idx + 1);
    } else {
      setIdx(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (result) {
        next();
      } else {
        checkAnswer();
      }
    }
  };

  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-bold mb-2">暂无内容</h2>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>← 返回</Button>
          <Badge
            variant={shuffle ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => { setShuffle(!shuffle); setIdx(0); setInput(''); setResult(null); playFlip(); }}
          >
            {shuffle ? '🔀 随机' : '📋 顺序'}
          </Badge>
          <div className="text-sm text-slate-500">
            <span className="text-green-600 font-semibold">{correctCount}</span>/{totalCount} 正确
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          {catInfo && <Badge variant="secondary">{catInfo.icon} {catInfo.name}</Badge>}
          <Badge variant="outline">{'★'.repeat(current.difficulty)}</Badge>
        </div>

        {/* Chinese prompt */}
        <Card className="mb-4">
          <CardContent className="pt-6 pb-4 text-center">
            <div className="text-lg text-slate-500 dark:text-slate-400 mb-2">请翻译以下中文句子：</div>
            <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
              "{current.sentence_cn}"
            </div>
          </CardContent>
        </Card>

        {/* Input area */}
        <div className="mb-4">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入对应的英文句子..."
            className={`text-lg p-4 ${result === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''} ${result === 'wrong' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}
            disabled={!!result}
            autoFocus
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => speak(current.sentence_en)}>
            🔊 提示发音
          </Button>
          {result ? (
            <Button onClick={next} className="flex-1">
              {idx < sentences.length - 1 ? '下一题 →' : '重新开始'}
            </Button>
          ) : (
            <Button onClick={checkAnswer} className="flex-1" disabled={!input.trim()}>
              ✓ 提交
            </Button>
          )}
        </div>

        {/* Result feedback */}
        {result && (
          <Card className={`mb-4 ${result === 'correct' ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
            <CardContent className="pt-4 pb-4">
              <div className={`font-semibold mb-2 ${result === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                {result === 'correct' ? '✅ 回答正确！' : '❌ 回答有误'}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-500">参考译文：</span>
                <span className="text-green-700 dark:text-green-400">{current.sentence_en}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <Progress value={(idx / sentences.length) * 100} className="h-2" />
      </div>
    </div>
  );
}
