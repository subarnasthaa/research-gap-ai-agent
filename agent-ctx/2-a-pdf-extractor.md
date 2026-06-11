# Task 2-a: PDF Extraction Utility

**Status**: Completed
**File**: `/home/z/my-project/src/lib/pdf-extractor.ts`

## Summary
Created the PDF extraction utility module with all required exports:

- `extractPaperFromPDF(file)` — Async PDF → ExtractedPaper using pdfjs-dist
- `extractPaperFromText(title, fullText)` — Text → ExtractedPaper using same parsing
- `extractKeywords(text)` — TF-IDF-like keyword extraction with stop word removal + bigrams
- `detectTopics(text, keywords)` — Co-occurrence-based topic clustering

Section parsing covers: abstract, methodology, results, limitations, conclusion with multiple header pattern variants per section. Includes title extraction heuristics and research focus generation.

No `'use client'` directive — it's a utility library. Worker source set to `pdfjs-dist/build/pdf.worker.min.mjs`.
