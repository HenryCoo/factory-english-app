import { useLearning } from '@/context/LearningContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_MAP } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useMemo } from 'react';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export function ProgressSection() {
  const navigate = useNavigate();
  const { state, sentences, getStats } = useLearning();
  const stats = getStats();

  // Category breakdown
  const categoryData = useMemo(() => {
    const catMap: Record<string, { total: number; mastered: number; learning: number }> = {};
    sentences.forEach(s => {
      if (!catMap[s.category]) catMap[s.category] = { total: 0, mastered: 0, learning: 0 };
      catMap[s.category].total++;
      const rec = state.records[s.id_num];
      if (rec?.status === 'mastered') catMap[s.category].mastered++;
      else if (rec && rec.status !== 'new') catMap[s.category].learning++;
    });
    return Object.entries(catMap).map(([key, val]) => ({
      name: CATEGORY_MAP[key]?.name || key,
      icon: CATEGORY_MAP[key]?.icon || '',
      已掌握: val.mastered,
      学习中: val.learning,
      未学: val.total - val.mastered - val.learning,
    }));
  }, [sentences, state.records]);

  // Pie data
  const pieData = [
    { name: '已掌握', value: stats.mastered },
    { name: '学习中', value: stats.learned - stats.mastered },
    { name: '未学', value: stats.total - stats.learned },
  ];

  // Daily stats for line chart
  const dailyData = useMemo(() => {
    return Object.entries(state.dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, ds]) => ({
        date: date.slice(5),
        学习: ds.reviewed,
        新学: ds.newLearned,
      }));
  }, [state.dailyStats]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>← 返回</Button>
          <h1 className="text-xl font-bold text-slate-700 dark:text-slate-300">📊 学习统计</h1>
          <div className="w-16" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-slate-500">总词汇</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.mastered}</div>
              <div className="text-xs text-slate-500">已掌握</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-amber-500">{stats.reviewing}</div>
              <div className="text-xs text-slate-500">复习中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.accuracy}%</div>
              <div className="text-xs text-slate-500">正确率</div>
            </CardContent>
          </Card>
        </div>

        {/* Mastery pie chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">整体掌握分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category bar chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">分类掌握情况</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="已掌握" stackId="a" fill="#10b981" />
                  <Bar dataKey="学习中" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="未学" stackId="a" fill="#e2e8f0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily progress line chart */}
        {dailyData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">每日学习趋势（近14天）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="学习" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="新学" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streak display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔥 连续学习</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-6xl mb-2">🔥</div>
              <div className="text-4xl font-bold text-orange-500">{stats.streak}</div>
              <div className="text-sm text-slate-500 mt-1">天连续学习</div>
            </div>
            <Progress value={Math.min((stats.streak / 30) * 100, 100)} className="h-2 mt-4" />
            <div className="text-xs text-center text-slate-400 mt-1">目标：30天连续学习</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
