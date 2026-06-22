import { useState, useMemo } from 'react';
import { useLearning } from '@/context/LearningContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_MAP } from '@/types';
import { AddWordDialog, type WordFormData } from '@/components/AddWordDialog';
import { CsvImportDialog } from '@/components/CsvImportDialog';

export function LibrarySection() {
  const navigate = useNavigate();
  const { library, sentences } = useLearning();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editing, setEditing] = useState<{ id_num: number; data: WordFormData; isCustom: boolean } | null>(null);
  const [importMsg, setImportMsg] = useState('');

  const staticCount = useMemo(() => sentences.filter(s => s.id_num < 10000).length, [sentences]);
  const customCount = useMemo(() => sentences.filter(s => s.id_num >= 10000).length, [sentences]);

  const filtered = useMemo(() => {
    return sentences.filter(s => {
      if (catFilter !== 'all' && s.category !== catFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.word.toLowerCase().includes(q) && !s.chinese_word.includes(q)) return false;
      }
      return true;
    });
  }, [sentences, search, catFilter]);

  // 获取已有记录（判断是内置还是自定义）
  const isCustom = (s: typeof sentences[0]) => s.id_num >= 10000;

  const handleEdit = (s: typeof sentences[0]) => {
    setEditing({
      id_num: s.id_num,
      isCustom: isCustom(s),
      data: {
        word: s.word,
        pos: s.pos,
        chinese_word: s.chinese_word,
        pronunciation_us: s.pronunciation_us,
        sentence_en: s.sentence_en,
        sentence_cn: s.sentence_cn,
        category: s.category,
        difficulty: String(s.difficulty),
      },
    });
  };

  const handleEditSave = (data: WordFormData) => {
    if (!editing) return;
    const { id_num, isCustom: isC } = editing;
    const partial = {
      word: data.word,
      pos: data.pos,
      chinese_word: data.chinese_word,
      pronunciation_us: data.pronunciation_us,
      pronunciation_en: data.pronunciation_us,
      sentence_en: data.sentence_en,
      sentence_cn: data.sentence_cn,
      category: data.category,
      difficulty: Number(data.difficulty) as 1 | 2 | 3,
    };
    if (isC) {
      library.updateCustomSentence(id_num, partial);
    } else {
      library.overrideBuiltin(id_num, partial);
    }
    setEditing(null);
  };

  const handleDelete = (s: typeof sentences[0]) => {
    if (!isCustom(s)) return;
    if (confirm(`确定删除「${s.word}」？此操作不可撤销。`)) {
      library.deleteCustomSentence(s.id_num);
    }
  };

  const handleRestore = (s: typeof sentences[0]) => {
    if (isCustom(s)) return;
    if (confirm(`还原「${s.word}」到原始状态？`)) {
      library.restoreBuiltin(s.id_num);
    }
  };

  const handleAddSave = (data: WordFormData) => {
    library.addCustomSentence({
      word: data.word,
      pos: data.pos,
      chinese_word: data.chinese_word,
      pronunciation_en: data.pronunciation_us,
      pronunciation_us: data.pronunciation_us,
      sentence_en: data.sentence_en,
      sentence_cn: data.sentence_cn,
      category: data.category || 'general',
      difficulty: Number(data.difficulty) as 1 | 2 | 3,
    });
    setShowAdd(false);
  };

  const handleCSVImport = (list: WordFormData[]) => {
    const count = library.importCustomSentences(list.map(d => ({
      word: d.word,
      pos: d.pos,
      chinese_word: d.chinese_word,
      pronunciation_en: d.pronunciation_us,
      pronunciation_us: d.pronunciation_us,
      sentence_en: d.sentence_en,
      sentence_cn: d.sentence_cn,
      category: d.category || 'general',
      difficulty: Number(d.difficulty) as 1 | 2 | 3,
    })));
    setImportMsg(`✅ 成功导入 ${count} 条词条`);
    setTimeout(() => setImportMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/')}>← 返回</Button>
          <h1 className="text-xl font-bold text-slate-700 dark:text-slate-300">📚 管理学习库</h1>
          <div className="w-16" />
        </div>

        {/* Summary */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span>共 <strong>{sentences.length}</strong> 词条</span>
              <span>📄 原始 <strong>{staticCount}</strong></span>
              <span>➕ 自定义 <strong>{customCount}</strong></span>
              {importMsg && <span className="text-emerald-600">{importMsg}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button size="sm" onClick={() => setShowAdd(true)}>➕ 新增词条</Button>
          <Button size="sm" variant="outline" onClick={() => setShowCSV(true)}>📥 CSV 导入</Button>
          <div className="flex-1" />
          <Input
            placeholder="🔍 搜索单词或中文..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs h-8 text-sm"
          />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {Object.entries(CATEGORY_MAP).map(([k, c]) => (
                <SelectItem key={k} value={k}>{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="p-2 text-left w-16">ID</th>
                  <th className="p-2 text-left">单词</th>
                  <th className="p-2 text-left hidden sm:table-cell">中文</th>
                  <th className="p-2 text-left w-20">分类</th>
                  <th className="p-2 text-center w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const custom = isCustom(s);
                  return (
                    <tr key={s.id_num} className="border-t hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="p-2 text-slate-400 font-mono text-xs">{custom ? `C${s.id_num}` : s.id}</td>
                      <td className="p-2 font-medium">{s.word}</td>
                      <td className="p-2 text-slate-500 hidden sm:table-cell">{s.chinese_word}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">{CATEGORY_MAP[s.category]?.icon}</Badge>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEdit(s)} title="编辑">✏️</Button>
                          {custom ? (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDelete(s)} title="删除">🗑️</Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRestore(s)} title="还原">↩️</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">无匹配词条</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Dialogs */}
        <AddWordDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSave={handleAddSave}
          title="➕ 新增词条"
        />

        <CsvImportDialog
          open={showCSV}
          onClose={() => setShowCSV(false)}
          onImport={handleCSVImport}
        />

        {editing && (
          <AddWordDialog
            open={true}
            onClose={() => setEditing(null)}
            onSave={handleEditSave}
            initial={editing.data}
            title={`✏️ 编辑: ${editing.id_num >= 10000 ? '自定义' : ''}词条`}
          />
        )}
      </div>
    </div>
  );
}
