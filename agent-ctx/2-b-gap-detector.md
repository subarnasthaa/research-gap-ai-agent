# Task 2-b: Research Gap Detection Engine

## Agent: gap-detector-implementer
## Date: 2024-03-05
## Status: COMPLETED

## Summary
Created the core Research Gap Detection Engine at `/home/z/my-project/src/lib/gap-detector.ts`. This is the central feature of the system — a comprehensive rule-based + AI hybrid system that detects 12 types of research gaps across uploaded papers.

## Files Created
- `/home/z/my-project/src/lib/gap-detector.ts` — ~1460 lines

## Exported Functions

### 1. `detectGaps(papers: ExtractedPaper[]): ResearchGap[]`
- Main entry point that runs all 5 sub-detectors
- Combines results, deduplicates overlapping gaps, re-scores using `scoreGap()`, and sorts by severity (highest first)

### 2. `detectLimitations(papers: ExtractedPaper[]): ResearchGap[]`
- Scans paper text for 15+ limitation-indicating phrase patterns (however, this study is limited, future work, not addressed, limited to, remains unclear, further investigation, beyond the scope, we did not, was not assessed, small sample, limited data, lack of, insufficient, not evaluated, not explored, future research, needs to be investigated)
- Each pattern maps to a preferred GapType and base severity/novelty scores
- Also performs structural checks: small sample size detection, real-world validation check, scalability concern detection, reproducibility concern detection, ethical concern detection
- For each detected limitation, creates a ResearchGap with all required fields including supportingEvidence (the actual sentences)

### 3. `detectMethodologyGaps(papers: ExtractedPaper[]): ResearchGap[]`
- Compares methodologies across papers using extracted methodology terms
- Detects divergent methodologies for related problems (same topic, different methods)
- Detects missing methodological components (ablation study, baseline comparison, cross-validation, statistical significance testing, hyperparameter analysis)
- Detects outdated methods (vanilla RNN, SVM, logistic regression, VGG, AlexNet)

### 4. `detectDatasetGaps(papers: ExtractedPaper[]): ResearchGap[]`
- Detects when related papers use different datasets (making comparison impossible)
- Detects when no paper validates on real-world data
- Detects single-domain evaluation
- Detects outdated benchmark usage (MNIST, PTB, SST-1)
- Detects very limited dataset coverage across the corpus

### 5. `detectConflicts(papers: ExtractedPaper[]): ResearchGap[]`
- Finds contradictory claims between papers using result sentiment analysis (positive vs negative signals)
- Detects opposing results on the same topic
- Detects different methods yielding positive results on similar problems without head-to-head comparison

### 6. `detectCrossDomainGaps(papers: ExtractedPaper[]): ResearchGap[]`
- Identifies methods from one domain that could be applied to another
- Detects same methodology applied across different domains (opportunity for comparative study)
- Detects methods mentioned but not applied in papers

### 7. `scoreGap(gap: Partial<ResearchGap>, papers: ExtractedPaper[]): { severityScore: number; noveltyScore: number }`
- Severity scoring based on: number of affected papers, gap type criticality weights, supporting evidence strength, how common the gap type is across papers
- Novelty scoring based on: gap type novelty weights, description specificity, whether papers partially address the gap, cross-paper vs single-paper gap bonus

## Helper Utilities
- `extractSentence()` — Extracts the sentence containing a match from text
- `keywordSimilarity()` — Jaccard similarity between keyword sets
- `extractDomainSignals()` — Extracts domain/topic words from paper metadata
- `extractDatasetMentions()` — Detects dataset names using patterns + known dataset list
- `extractMethodologyTerms()` — Detects methodology terms using 6 pattern categories
- `detectSizeIndicators()` — Detects small sample sizes
- `usesRealWorldData()` — Determines if paper uses real-world data
- `hasScalabilityConcern()` — Detects scalability issues
- `hasReproducibilityConcern()` — Detects reproducibility issues
- `hasEthicalConcern()` — Detects ethical considerations
- `deduplicateGaps()` — Merges gaps with same type and overlapping affected papers
- `shouldMergeGaps()` — Determines if two gaps should be merged (50%+ paper overlap or 40%+ word overlap)

## Technical Notes
- Uses `randomUUID()` from 'crypto' for generating IDs
- All Set iterations use `Array.from()` + `forEach()` for ES2017 compatibility
- TypeScript strict mode compatible
- ESLint clean
- No 'use client' directive (server-side module)
