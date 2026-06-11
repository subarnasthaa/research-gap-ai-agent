import { create } from 'zustand';
import type { ExtractedPaper, ResearchGap, ComparisonResult, ResearchIdea, AnalysisState } from '@/lib/types';

interface ResearchStore extends AnalysisState {
  // Paper actions
  addPaper: (paper: ExtractedPaper) => void;
  removePaper: (id: string) => void;
  clearPapers: () => void;

  // Analysis actions
  setGaps: (gaps: ResearchGap[]) => void;
  setComparison: (comparison: ComparisonResult) => void;
  setIdeas: (ideas: ResearchIdea[]) => void;

  // UI state
  setAnalyzing: (isAnalyzing: boolean) => void;
  setExtracting: (isExtracting: boolean) => void;
  setCurrentStep: (step: string) => void;
  setProgress: (progress: number) => void;
  setSelectedField: (field: string) => void;
  setGithubToken: (token: string) => void;

  // Reset
  reset: () => void;
}

const initialState: AnalysisState = {
  papers: [],
  gaps: [],
  comparison: null,
  ideas: [],
  isAnalyzing: false,
  isExtracting: false,
  currentStep: '',
  progress: 0,
  selectedField: 'Artificial Intelligence',
  githubToken: '',
};

export const useResearchStore = create<ResearchStore>((set) => ({
  ...initialState,

  addPaper: (paper) =>
    set((state) => ({ papers: [...state.papers, paper] })),

  removePaper: (id) =>
    set((state) => ({ papers: state.papers.filter((p) => p.id !== id) })),

  clearPapers: () =>
    set({ papers: [], gaps: [], comparison: null, ideas: [] }),

  setGaps: (gaps) => set({ gaps }),
  setComparison: (comparison) => set({ comparison }),
  setIdeas: (ideas) => set({ ideas }),

  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setExtracting: (isExtracting) => set({ isExtracting }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setProgress: (progress) => set({ progress }),
  setSelectedField: (selectedField) => set({ selectedField }),
  setGithubToken: (githubToken) => set({ githubToken }),

  reset: () => set(initialState),
}));
