/**
 * 自动分类工具 — 根据单词/例句关键词匹配所属分类
 */

const categoryKeywords: Record<string, string[]> = {
  'production': ['production', 'assembly', 'capacity', 'manufacturing', 'output', 'line', 'process', 'operation', 'efficiency', 'productivity', 'throughput', 'bottleneck', 'downtime', 'changeover', 'model', 'schedule', 'plan', 'order', 'shift', 'setup', 'machine', 'equipment', 'tool', 'fixture', 'workstation', 'run', 'batch', 'lot', 'NPI', 'trial', 'pilot'],
  'quality': ['quality', 'inspection', 'defect', 'measurement', 'check', 'test', 'standard', 'specification', 'tolerance', 'calibration', 'audit', 'compliance', 'corrective', 'preventive', 'CAPA', 'FMEA', 'SPC', 'control', 'gauge', 'rework', 'scrap', 'reject', 'non-conformance', 'deviation', 'conform', 'criteria', 'acceptance', 'sampling', 'AQL', 'traceability', 'first article', 'OQC', 'IQC', 'PQC'],
  'supply-chain': ['supply', 'vendor', 'supplier', 'procurement', 'purchase', 'buy', 'material', 'raw', 'component', 'part', 'logistics', 'warehouse', 'inventory', 'stock', 'delivery', 'shipment', 'freight', 'transport', 'container', 'lead time', 'replenishment', 'JIT', 'kanban', 'Milk Run', 'FOB', 'receiving', 'dispatch', 'pick'],
  'safety': ['safety', 'PPE', 'accident', 'hazard', 'risk', 'emergency', 'fire', 'first aid', 'ergonomic', 'injury', 'incident', 'protection', 'evacuation', 'security', 'danger', 'harm'],
  'engineering': ['design', 'drawing', 'blueprint', 'CAD', 'engineering', 'R&D', 'technology', 'innovation', 'specification', 'parameter', 'dimension', 'prototype', 'development', 'layout', 'automation', 'robot', 'PLC', 'sensor', 'software', 'upgrade', 'maintenance', 'repair', 'breakdown', 'diagnostic', 'troubleshoot', 'spare'],
  'management': ['management', 'leader', 'supervisor', 'manager', 'director', 'team', 'meeting', 'report', 'KPI', 'performance', 'review', 'objective', 'target', 'goal', 'strategy', 'improvement', 'PDCA', 'lean', 'Kaizen', 'training', 'communication', 'feedback', 'policy', 'procedure', 'instruction', 'auditor', 'certification', 'ISO', 'culture', 'accountability'],
  'finance': ['cost', 'budget', 'price', 'margin', 'revenue', 'profit', 'expense', 'investment', 'ROI', 'financial', 'saving', 'overhead', 'rate', 'invoice', 'payment', 'contract', 'negotiation', 'quote', 'pricing', 'dollar'],
  'hr': ['employee', 'staff', 'worker', 'operator', 'technician', 'engineer', 'hire', 'recruit', 'training', 'competency', 'skill', 'career', 'promotion', 'salary', 'wage', 'benefit', 'leave', 'absent', 'overtime', 'resignation', 'attendance', 'appraisal', 'rotation', 'motivation'],
  'warehouse': ['store', 'warehouse', 'stock', 'inventory', 'bin', 'shelf', 'location', 'label', 'tag', 'FIFO', 'LIFO', 'cycle count', 'physical count', 'storage', 'rack', 'pallet'],
};

export function autoCategorize(word: string, sentence: string): string {
  const text = (word + ' ' + sentence).toLowerCase();
  const scores: Record<string, number> = {};
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score++;
    }
    if (score > 0) scores[cat] = score;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return best.length > 0 ? best[0][0] : 'general';
}
