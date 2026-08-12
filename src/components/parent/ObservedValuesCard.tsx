import React from 'react';
import { Card } from '../ui/Card';
import { Shield, Heart, Leaf, Flag, Award } from 'lucide-react';

const coreValuesList = [
  {
    category: '1. Maka-Diyos',
    icon: Shield,
    colorClass: 'text-amber-500 bg-amber-50 border-amber-200/50',
    headerBg: 'bg-amber-50/50 border-amber-100',
    items: [
      { key: 'makaDiyos1', statement: 'Expresses one’s spiritual beliefs while respecting the spiritual beliefs of others.' },
      { key: 'makaDiyos2', statement: 'Shows adherence to ethical principles by upholding truth.' }
    ]
  },
  {
    category: '2. Makatao',
    icon: Heart,
    colorClass: 'text-rose-500 bg-rose-50 border-rose-200/50',
    headerBg: 'bg-rose-50/50 border-rose-100',
    items: [
      { key: 'makatao1', statement: 'Is sensitive to individual, social, and cultural differences.' },
      { key: 'makatao2', statement: 'Demonstrates contributions towards solidarity.' }
    ]
  },
  {
    category: '3. Maka-Kalikasan',
    icon: Leaf,
    colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-200/50',
    headerBg: 'bg-emerald-50/50 border-emerald-100',
    items: [
      { key: 'makakalikasan1', statement: 'Cares for the environment and utilizes resources wisely and economically.' }
    ]
  },
  {
    category: '4. Makabansa',
    icon: Flag,
    colorClass: 'text-red-500 bg-red-50 border-red-200/50',
    headerBg: 'bg-red-50/50 border-red-100',
    items: [
      { key: 'makabansa1', statement: 'Demonstrates pride in being a Filipino; exercises rights and duties.' },
      { key: 'makabansa2', statement: 'Demonstrates appropriate behavior in carrying out school/community duties.' }
    ]
  }
];

const markingDescriptions: Record<string, string> = {
  'AO': 'Always Observed',
  'SO': 'Sometimes Observed',
  'RO': 'Rarely Observed',
  'NO': 'Not Observed'
};

const getMarkingBadge = (mark?: string) => {
  if (mark === 'AO') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">AO</span>;
  if (mark === 'SO') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">SO</span>;
  if (mark === 'RO') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">RO</span>;
  if (mark === 'NO') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">NO</span>;
  return <span className="text-slate-300 font-medium text-xs">--</span>;
};

interface ObservedValuesCardProps {
  observedValues?: Record<string, any>;
  gradeLevel?: string;
}

export function ObservedValuesCard({ observedValues, gradeLevel }: ObservedValuesCardProps) {
  // Try to get values for current grade level, fallback to raw observedValues if no grade level nesting
  let currentValues = {};
  if (observedValues) {
    const rawGrade = gradeLevel || null;
    const formattedGrade = rawGrade ? (rawGrade.startsWith('Grade') ? rawGrade : `Grade ${rawGrade}`) : null;
    
    if (rawGrade && observedValues[rawGrade]) {
      currentValues = observedValues[rawGrade];
    } else if (formattedGrade && observedValues[formattedGrade]) {
      currentValues = observedValues[formattedGrade];
    } else {
      // It might not be nested by grade level if it was saved directly
      const hasCategories = Object.keys(observedValues).some(k => k.startsWith('maka'));
      if (hasCategories) {
        currentValues = observedValues;
      }
    }
  }

  const hasAnyValues = Object.keys(currentValues).length > 0;

  if (!hasAnyValues) {
    return (
      <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D8232A]" />
            Learner's Observed Values
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Core values and character evaluation</p>
        </div>
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-slate-300" />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">No Evaluation Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The class adviser has not encoded the observed values for this student yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
      <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D8232A]" />
            Learner's Observed Values
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Core values and character evaluation</p>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(markingDescriptions).map(([mark, desc]) => (
            <div key={mark} className="flex items-center gap-1.5">
              {getMarkingBadge(mark)}
              <span className="text-[10px] text-slate-500 font-medium">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {coreValuesList.map((core) => {
          const Icon = core.icon;
          return (
            <div key={core.category} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <div className={`px-4 py-3 border-b flex items-center gap-2 ${core.headerBg}`}>
                <div className={`p-1.5 rounded-lg border ${core.colorClass} bg-white`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-800">{core.category}</h4>
              </div>
              
              <div className="divide-y divide-slate-100 bg-white">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-8">Behavioral Statements</div>
                  <div className="col-span-1 text-center">Q1</div>
                  <div className="col-span-1 text-center">Q2</div>
                  <div className="col-span-1 text-center">Q3</div>
                  <div className="col-span-1 text-center">Q4</div>
                </div>
                
                {core.items.map((item) => {
                  const itemMarks = (currentValues as any)[item.key] || {};
                  return (
                    <div key={item.key} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                      <div className="col-span-8 text-xs text-slate-600 font-medium pr-4">
                        {item.statement}
                      </div>
                      <div className="col-span-1 flex justify-center">{getMarkingBadge(itemMarks['q1'])}</div>
                      <div className="col-span-1 flex justify-center">{getMarkingBadge(itemMarks['q2'])}</div>
                      <div className="col-span-1 flex justify-center">{getMarkingBadge(itemMarks['q3'])}</div>
                      <div className="col-span-1 flex justify-center">{getMarkingBadge(itemMarks['q4'])}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
