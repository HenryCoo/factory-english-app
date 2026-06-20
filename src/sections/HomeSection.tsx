import { useLearning } from '@/context/LearningContext';
import { CATEGORY_MAP } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

export function HomeSection() {
  const { getStats, getDueReviewSentences, sentences, state } = useLearning();
  const navigate = useNavigate();
  const stats = getStats();
  const dueReview = getDueReviewSentences();
  const pct = Math.round((stats.learned / stats.total) * 100);

  // Count by category
  const catCounts: Record<string, number> = {};
  sentences.forEach(s => {
    catCounts[s.category] = (catCounts[s.category] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            🏭 工厂英语900词900句
          </h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
            制造业场景英语 · 逐词逐句掌握
          </p>
        </div>

        {/* Progress overview */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">学习进度</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {stats.learned} / {stats.total} 词
              </span>
            </div>
            <Progress value={pct} className="h-3" />
            <div className="grid grid-cols-4 gap-4 mt-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.mastered}</div>
                <div className="text-xs text-slate-500">已掌握</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-500">{stats.reviewing}</div>
                <div className="text-xs text-slate-500">学习中</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.accuracy}%</div>
                <div className="text-xs text-slate-500">正确率</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">🔥{stats.streak}</div>
                <div className="text-xs text-slate-500">连续天数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review reminder */}
        {dueReview.length > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  📝 有 {dueReview.length} 个词需要复习
                </span>
                <Button size="sm" onClick={() => navigate('/learn/flashcard')}>
                  开始复习
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily calendar */}
        <Card className="mb-6">
          <CardContent className="pt-5 pb-4">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">📅 学习日历</h2>
            <CalendarHeatmap dailyStats={state.dailyStats} />
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/learn/flashcard')}>
            <CardContent className="pt-6 pb-4 text-center">
              <div className="text-3xl mb-2">📇</div>
              <div className="font-semibold text-sm">卡片学习</div>
              <div className="text-xs text-slate-400 mt-1">翻转记忆</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/learn/typing')}>
            <CardContent className="pt-6 pb-4 text-center">
              <div className="text-3xl mb-2">⌨️</div>
              <div className="font-semibold text-sm">打字默写</div>
              <div className="text-xs text-slate-400 mt-1">中译英</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/categories')}>
            <CardContent className="pt-6 pb-4 text-center">
              <div className="text-3xl mb-2">📂</div>
              <div className="font-semibold text-sm">分类浏览</div>
              <div className="text-xs text-slate-400 mt-1">按主题</div>
            </CardContent>
          </Card>
        </div>

        {/* Category breakdown */}
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">📊 分类概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(CATEGORY_MAP).map(([key, cat]) => {
            const total = catCounts[key] || 0;
            return (
              <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/categories?cat=${key}`)}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{cat.name}</div>
                      <div className="text-xs text-slate-400">{total} 词</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate('/progress')}>
            📈 查看学习统计
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple calendar heatmap component
function CalendarHeatmap({ dailyStats }: { dailyStats: Record<string, { date: string; reviewed: number }> }) {
  // Show last 14 weeks (98 days) for a good visual
  const weeks: string[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let w = 13; w >= 0; w--) {
    const week: string[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + d));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      week.push(key);
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Object.values(dailyStats).map(d => d.reviewed || 0));

  function heatColor(dateKey: string): string {
    const count = dailyStats[dateKey]?.reviewed || 0;
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
    const intensity = count / maxCount;
    if (intensity <= 0.25) return 'bg-emerald-200 dark:bg-emerald-900';
    if (intensity <= 0.5) return 'bg-emerald-400 dark:bg-emerald-700';
    if (intensity <= 0.75) return 'bg-emerald-500 dark:bg-emerald-600';
    return 'bg-emerald-600 dark:bg-emerald-400';
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayCount = dailyStats[todayKey]?.reviewed || 0;

  // Day labels
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="w-full overflow-x-auto">
      <div className="text-xs text-slate-500 mb-2 text-center">
        今日已学 <strong className="text-emerald-600">{todayCount}</strong> 词 · 近 14 周学习记录
      </div>
      <div className="flex justify-center">
        <div className="flex gap-0.5">
            {weeks[0]?.map((_, dayIdx) => (
              <div key={`col-${dayIdx}`} className="flex flex-col gap-0.5">
                {weeks.map((week) => {
                const key = week[dayIdx];
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className={`w-3 h-3 rounded-sm ${heatColor(key)} ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                    title={`${key}: ${dailyStats[key]?.reviewed || 0} 词`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-between ml-2 text-[10px] text-slate-400 h-24 py-0.5">
          {dayLabels.map((label, i) => (
            <span key={i} className={i % 2 === 0 ? 'visible' : 'invisible'}>{label}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-400">
        <span>少</span>
        <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
        <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
        <span>多</span>
      </div>
    </div>
  );
}
