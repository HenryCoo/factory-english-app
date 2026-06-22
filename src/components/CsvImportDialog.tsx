import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { autoCategorize } from '@/lib/categorizer';
import type { WordFormData } from './AddWordDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (list: WordFormData[]) => void;
}

export function CsvImportDialog({ open, onClose, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<WordFormData[]>([]);
  const [error, setError] = useState('');

  const parseCSV = (text: string): WordFormData[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('CSV 文件至少需要标题行 + 1 行数据');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const colMap: Record<string, number> = {};
    headers.forEach((h, i) => { colMap[h] = i; });

    const requiredFields = ['word', 'chinese_word'];
    for (const f of requiredFields) {
      if (!(f in colMap)) throw new Error(`缺少必要字段: ${f}`);
    }

    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const word = cols[colMap.word] || '';
      const chinese = cols[colMap.chinese_word] || '';
      const sentEn = cols[colMap['sentence_en']] || cols[colMap['english']] || '';
      const sentCn = cols[colMap['sentence_cn']] || cols[colMap['chinese']] || '';
      const category = cols[colMap.category] || autoCategorize(word, sentEn);

      return {
        word,
        pos: cols[colMap.pos] || '',
        chinese_word: chinese,
        pronunciation_us: cols[colMap.pronunciation_us] || cols[colMap.pronunciation] || '',
        sentence_en: sentEn,
        sentence_cn: sentCn,
        category,
        difficulty: cols[colMap.difficulty] || (cols[colMap['difficulty']] || '2'),
      };
    }).filter(r => r.word.trim() && r.chinese_word.trim());
  };

  const handleFile = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length === 0) { setError('未解析到有效数据，请检查 CSV 格式'); return; }
        setPreview(rows);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '解析失败');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    onImport(preview);
    setPreview([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    setPreview([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📥 CSV 批量导入</DialogTitle>
        </DialogHeader>

        {/* Upload */}
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            选择 CSV 文件
          </Button>
          <p className="text-xs text-slate-400 mt-2">
            支持字段: word, chinese_word, pos, pronunciation_us, sentence_en, sentence_cn, category, difficulty
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>导入错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">预览（共 {preview.length} 条）</p>
            <div className="max-h-48 overflow-y-auto border rounded text-xs">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="p-1 text-left">单词</th>
                    <th className="p-1 text-left">释义</th>
                    <th className="p-1 text-left">分类</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-1">{r.word}</td>
                      <td className="p-1">{r.chinese_word}</td>
                      <td className="p-1 text-slate-400">{r.category}</td>
                    </tr>
                  ))}
                  {preview.length > 20 && (
                    <tr><td colSpan={3} className="p-1 text-center text-slate-400">...还有 {preview.length - 20} 条</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button onClick={handleConfirm} disabled={preview.length === 0}>
            导入 {preview.length} 条
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
