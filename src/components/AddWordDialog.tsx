import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_MAP } from '@/types';
import { autoCategorize } from '@/lib/categorizer';

export interface WordFormData {
  word: string;
  pos: string;
  chinese_word: string;
  pronunciation_us: string;
  sentence_en: string;
  sentence_cn: string;
  category: string;
  difficulty: string;
}

const emptyForm: WordFormData = {
  word: '', pos: '', chinese_word: '', pronunciation_us: '',
  sentence_en: '', sentence_cn: '', category: '', difficulty: '2',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: WordFormData) => void;
  initial?: WordFormData;
  title?: string;
}

export function AddWordDialog({ open, onClose, onSave, initial, title }: Props) {
  const [form, setForm] = useState<WordFormData>(initial || emptyForm);

  const handleChange = (field: keyof WordFormData, value: string) => {
    const next = { ...form, [field]: value };
    // 自动分类：当 word 或 sentence_en 变更时
    if ((field === 'word' || field === 'sentence_en') && next.word) {
      const cat = autoCategorize(next.word, next.sentence_en);
      if (cat !== 'general' || !next.category) {
        next.category = cat;
      }
    }
    setForm(next);
  };

  const handleSave = () => {
    if (!form.word.trim() || !form.chinese_word.trim()) return;
    if (!form.category) {
      form.category = autoCategorize(form.word, form.sentence_en);
    }
    onSave(form);
    if (!initial) setForm(emptyForm);
  };

  // 当 initial 变化时重置
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
    else setForm(initial || emptyForm);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title || '新增词条'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>单词 *</Label>
              <Input value={form.word} onChange={e => handleChange('word', e.target.value)} placeholder="downtime" />
            </div>
            <div className="space-y-1">
              <Label>词性</Label>
              <Input value={form.pos} onChange={e => handleChange('pos', e.target.value)} placeholder="n." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>中文释义 *</Label>
            <Input value={form.chinese_word} onChange={e => handleChange('chinese_word', e.target.value)} placeholder="停机时间" />
          </div>
          <div className="space-y-1">
            <Label>美式音标</Label>
            <Input value={form.pronunciation_us} onChange={e => handleChange('pronunciation_us', e.target.value)} placeholder="/ˈdaʊntaɪm/" />
          </div>
          <div className="space-y-1">
            <Label>英文例句</Label>
            <Input value={form.sentence_en} onChange={e => handleChange('sentence_en', e.target.value)} placeholder="We have to reduce machine downtime." />
          </div>
          <div className="space-y-1">
            <Label>中文例句</Label>
            <Input value={form.sentence_cn} onChange={e => handleChange('sentence_cn', e.target.value)} placeholder="我们必须减少机器停机时间。" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>分类</Label>
              <Select value={form.category} onValueChange={v => handleChange('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="自动检测中..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_MAP).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>难度</Label>
              <Select value={form.difficulty} onValueChange={v => handleChange('difficulty', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">★ 简单</SelectItem>
                  <SelectItem value="2">★★ 中等</SelectItem>
                  <SelectItem value="3">★★★ 困难</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={!form.word.trim() || !form.chinese_word.trim()}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
