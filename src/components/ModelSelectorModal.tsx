import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Cpu,
  Eye,
  Globe,
  Brain,
  Calculator,
  Zap,
  Layers,
  Search,
} from 'lucide-react';
import type { CloudflareAiModelCategory } from '../types';
import { CLOUDFLARE_FREE_AI_MODELS } from '../data/aiModels';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

const CATEGORIES: { id: CloudflareAiModelCategory; label: string; icon: any }[] = [
  { id: 'all', label: 'All Models', icon: Layers },
  { id: 'flagship', label: 'Flagship & Top', icon: Sparkles },
  { id: 'vision', label: 'Vision & OCR', icon: Eye },
  { id: 'multilingual', label: 'Multilingual & Persian', icon: Globe },
  { id: 'reasoning', label: 'Deep Reasoning', icon: Brain },
  { id: 'math', label: 'Math & STEM', icon: Calculator },
  { id: 'fast', label: 'Fast & Lightweight', icon: Zap },
];

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  onSelectModel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CloudflareAiModelCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredModels = CLOUDFLARE_FREE_AI_MODELS.filter(model => {
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      model.name.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query) ||
      (model.descriptionEn && model.descriptionEn.toLowerCase().includes(query)) ||
      (model.badgeEn && model.badgeEn.toLowerCase().includes(query)) ||
      model.languages.some(l => l.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const activeModel = CLOUDFLARE_FREE_AI_MODELS.find(m => m.id === selectedModelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-[#10111a] border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Cloudflare Workers AI Engines
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  100% Free & Unlimited
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Select your preferred model for multilingual reasoning, mathematical problem solving, and image reading
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by model name, provider (Meta, Qwen, DeepSeek...) or language..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredModels.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <Cpu className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No models found matching your query.</p>
            </div>
          ) : (
            filteredModels.map(model => {
              const isSelected = model.id === selectedModelId;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    onClose();
                  }}
                  className={`group relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-500 shadow-md shadow-violet-500/10 ring-1 ring-violet-500'
                      : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Selection check indicator */}
                    <div className="shrink-0 flex items-center justify-center mt-1">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700 group-hover:border-violet-400 transition-colors" />
                      )}
                    </div>

                    {/* Right: Model Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
                          {model.name}
                        </span>

                        <span
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${model.accentColor}18`,
                            color: model.accentColor,
                          }}
                        >
                          {model.badgeEn || model.badgeFa}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {model.provider}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          Context: {model.contextWindow}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
                        {model.descriptionEn || model.descriptionFa}
                      </p>

                      {model.recommendedFor && (
                        <div className="text-[11px] text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-lg">
                          🎯 <strong>Recommended for:</strong> {model.recommendedFor}
                        </div>
                      )}

                      {/* Language badges */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-neutral-400 font-medium mr-1">Languages:</span>
                        {model.languages.map((lang, lIdx) => (
                          <span
                            key={lIdx}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              lang === 'فارسی'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>Active Model:</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-200">
              {activeModel?.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all shadow-sm"
          >
            Confirm & Select Model
          </button>
        </div>
      </div>
    </div>
  );
};
