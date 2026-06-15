import { useMemo } from 'react';
import { useLearning } from '@/context/LearningContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORY_MAP } from '@/types';

export function CategoriesSection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCat = searchParams.get('cat');
  const { state, dispatch, sentences } = useLearning();

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; mastered: number; learning: number; new: number }> = {};
    sentences.forEach(s => {
      if (!stats[s.category]) stats[s.category] = { total: 0, mastered: 0, learning: 0, new: 0 };
      stats[s.category].total++;
      const rec = state.records[s.id_num];
      if (rec?.status === 'mastered') stats[s.category].mastered++;
      else if (rec && rec.status !== 'new') stats[s.category].learning++;
      else stats[s.category].new++;
    });
    return stats;
  }, [sentences, state.records]);

  const handleSelectCategory = (cat: string) => {
    dispatch({ type: 'SET_CATEGORY', category: cat });
    navigate('/learn/flashcard');
  };

  const categories = activeCat
    ? Object.entries(CATEGORY_MAP).filter(([k]) => k === activeCat)
    : Object.entries(CATEGORY_MAP);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>← 返回</Button>
          <h1 className="text-xl font-bold text-slate-700 dark:text-slate-300">
            {activeCat ? `${CATEGORY_MAP[activeCat]?.icon} ${CATEGORY_MAP[activeCat]?.name}` : '📂 分类浏览'}
          </h1>
          <div className="w-16" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(([key, cat]) => {
            const stat = categoryStats[key] || { total: 0, mastered: 0, learning: 0, new: 0 };
            const pct = stat.total > 0 ? Math.round((stat.mastered / stat.total) * 100) : 0;

            return (
              <Card key={key} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{cat.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{cat.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{cat.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">进度</span>
                      <span className="font-medium">{stat.mastered}/{stat.total} 已掌握</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">已掌握 {stat.mastered}</span>
                    <span className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">学习中 {stat.learning}</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">未学 {stat.new}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => handleSelectCategory(key)}>
                      📇 卡片学习
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      dispatch({ type: 'SET_CATEGORY', category: key });
                      navigate('/learn/typing');
                    }}>
                      ⌨️ 默写
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
