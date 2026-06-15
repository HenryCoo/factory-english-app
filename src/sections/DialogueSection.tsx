import { useState } from 'react';
import { useLearning } from '@/context/LearningContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_MAP } from '@/types';

export function DialogueSection() {
  const navigate = useNavigate();
  const { getFilteredSentences } = useLearning();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const allSentences = getFilteredSentences();

  // Group sentences by category
  const grouped = allSentences.reduce<Record<string, typeof allSentences>>((acc, s) => {
    const cat = s.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const filtered = searchQuery
    ? allSentences.filter(s =>
        s.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.chinese_word.includes(searchQuery) ||
        s.sentence_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sentence_cn.includes(searchQuery)
      )
    : selectedCat
    ? (grouped[selectedCat] || [])
    : allSentences.slice(0, 50);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/')}>← 返回</Button>
          <h1 className="text-xl font-bold text-slate-700 dark:text-slate-300">💬 情景词库</h1>
          <div className="w-16" />
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSelectedCat(null); }}
          placeholder="🔍 搜索单词、中文或例句..."
          className="mb-4"
        />

        {/* Category filter chips */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant={selectedCat === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCat(null)}
            >
              全部
            </Badge>
            {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
              <Badge
                key={key}
                variant={selectedCat === key ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCat(key)}
              >
                {cat.icon} {cat.name} ({grouped[key]?.length || 0})
              </Badge>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="space-y-3">
          {filtered.map((s) => {
            const catInfo = CATEGORY_MAP[s.category];
            return (
              <Card key={s.id_num} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-slate-800 dark:text-slate-100">
                          {s.word}
                        </span>
                        <span className="text-xs text-slate-400">{s.pronunciation_us}</span>
                        {catInfo && <Badge variant="outline" className="text-xs">{catInfo.icon}</Badge>}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                        {s.pos} {s.chinese_word}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        "{s.sentence_en}"
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        "{s.sentence_cn}"
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 shrink-0"
                      onClick={() => speak(s.sentence_en)}
                      title="朗读"
                    >
                      🔊
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p>未找到匹配结果</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
