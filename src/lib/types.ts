// Core types for the Research Gap AI Agent

export interface ExtractedPaper {
  id: string;
  fileName: string;
  title: string;
  abstract: string;
  methodology: string;
  results: string;
  limitations: string;
  conclusion: string;
  fullText: string;
  keywords: string[];
  topics: string[];
  researchFocus: string;
  uploadedAt: number;
  source: 'pdf' | 'link';
  link?: string;
}

export interface ResearchGap {
  id: string;
  description: string;
  gapType: GapType;
  affectedPapers: string[]; // paper IDs
  affectedPaperTitles: string[];
  severityScore: number; // 1-10
  noveltyScore: number; // 0-100
  explanation: string;
  whyItIsAGap: string;
  supportingEvidence: string[];
  isPriority?: boolean; // flagged by AI agent as priority gap
}

export type GapType =
  | 'missing_dataset'
  | 'methodology_gap'
  | 'conflicting_results'
  | 'no_real_world_validation'
  | 'small_sample_size'
  | 'missing_edge_case'
  | 'outdated_method'
  | 'cross_domain_gap'
  | 'limited_scope'
  | 'reproducibility_issue'
  | 'ethical_concern'
  | 'scalability_limitation';

export interface ComparisonResult {
  paperIds: string[];
  methodologyComparison: ComparisonRow[];
  datasetComparison: ComparisonRow[];
  resultsComparison: ComparisonRow[];
  conflicts: ConflictItem[];
  similarities: string[];
}

export interface ComparisonRow {
  aspect: string;
  values: Record<string, string>;
}

export interface ConflictItem {
  aspect: string;
  paperA: string;
  paperB: string;
  valueA: string;
  valueB: string;
}

export interface ResearchIdea {
  id: string;
  title: string;
  description: string;
  methodology: string;
  expectedContribution: string;
  difficulty: 'low' | 'medium' | 'high';
  relatedGaps: string[];
  noveltyScore: number;
  feasibilityScore: number;
}

export interface AnalysisState {
  papers: ExtractedPaper[];
  gaps: ResearchGap[];
  comparison: ComparisonResult | null;
  ideas: ResearchIdea[];
  isAnalyzing: boolean;
  isExtracting: boolean;
  currentStep: string;
  progress: number;
  selectedField: string;
  githubToken: string;
}

export interface ExportFormat {
  type: 'markdown' | 'json' | 'gist';
  content: string;
  filename: string;
}

export const GAP_TYPE_LABELS: Record<GapType, string> = {
  missing_dataset: 'Missing Dataset Coverage',
  methodology_gap: 'Methodology Gap',
  conflicting_results: 'Conflicting Results',
  no_real_world_validation: 'No Real-World Validation',
  small_sample_size: 'Small Sample Size',
  missing_edge_case: 'Missing Edge-Case Testing',
  outdated_method: 'Outdated Methods',
  cross_domain_gap: 'Cross-Domain Application Gap',
  limited_scope: 'Limited Scope',
  reproducibility_issue: 'Reproducibility Issue',
  ethical_concern: 'Ethical Concern',
  scalability_limitation: 'Scalability Limitation',
};

export const GAP_TYPE_COLORS: Record<GapType, string> = {
  missing_dataset: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  methodology_gap: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  conflicting_results: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  no_real_world_validation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  small_sample_size: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  missing_edge_case: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  outdated_method: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cross_domain_gap: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  limited_scope: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  reproducibility_issue: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  ethical_concern: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  scalability_limitation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export const RESEARCH_FIELDS = [
  'Artificial Intelligence',
  'Computer Science',
  'Machine Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Robotics',
  'Data Science',
  'Cybersecurity',
  'Software Engineering',
  'Bioinformatics',
  'Physics',
  'Mathematics',
  'Neuroscience',
  'Medicine',
  'Environmental Science',
  'Social Sciences',
  'Other',
];
