'use client';

import { useState, useCallback, useRef } from 'react';
import { useResearchStore } from '@/store/research-store';
import { RESEARCH_FIELDS } from '@/lib/types';
import type { ResearchGap, ResearchIdea } from '@/lib/types';
import { generateId } from '@/lib/utils-uuid';

// Dynamic imports to avoid SSR issues with pdf.js and crypto
const loadPdfExtractor = () => import('@/lib/pdf-extractor');
const loadGapDetector = () => import('@/lib/gap-detector');
const loadComparisonEngine = () => import('@/lib/comparison-engine');
const loadIdeasGenerator = () => import('@/lib/ideas-generator');

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import {
  Brain,
  Upload,
  Link,
  Trash2,
  FileText,
  Loader2,
  ChevronDown,
  Key,
} from 'lucide-react';

// ─── Upload progress tracker per file ────────────────────────────────────────
interface FileUploadState {
  file: File;
  status: 'pending' | 'extracting' | 'done' | 'error';
  progress: number;
  error?: string;
}

export default function UploadPanel() {
  const store = useResearchStore();

  // Local state
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkFetching, setLinkFetching] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── PDF Upload Handling ─────────────────────────────────────────────────

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
      );

      if (pdfFiles.length === 0) return;

      const newStates: FileUploadState[] = pdfFiles.map((file) => ({
        file,
        status: 'pending' as const,
        progress: 0,
      }));

      setFileStates((prev) => [...prev, ...newStates]);
      store.setExtracting(true);

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const stateIdx = fileStates.length + i;

        setFileStates((prev) => {
          const next = [...prev];
          if (next[stateIdx]) {
            next[stateIdx] = { ...next[stateIdx], status: 'extracting', progress: 30 };
          }
          return next;
        });

        try {
          const { extractPaperFromPDF } = await loadPdfExtractor();
          const paper = await extractPaperFromPDF(file);

          setFileStates((prev) => {
            const next = [...prev];
            if (next[stateIdx]) {
              next[stateIdx] = { ...next[stateIdx], status: 'done', progress: 100 };
            }
            return next;
          });

          store.addPaper(paper);
        } catch (err) {
          setFileStates((prev) => {
            const next = [...prev];
            if (next[stateIdx]) {
              next[stateIdx] = {
                ...next[stateIdx],
                status: 'error',
                progress: 100,
                error: err instanceof Error ? err.message : 'Extraction failed',
              };
            }
            return next;
          });
        }
      }

      store.setExtracting(false);
    },
    [fileStates.length, store]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        // Reset input so the same file can be re-uploaded
        e.target.value = '';
      }
    },
    [processFiles]
  );

  const handleRemoveFile = useCallback(
    (idx: number) => {
      setFileStates((prev) => {
        const removed = prev[idx];
        if (removed) {
          // Also remove from store if it was successfully added
          const paper = store.papers.find((p) => p.fileName === removed.file.name);
          if (paper) {
            store.removePaper(paper.id);
          }
        }
        return prev.filter((_, i) => i !== idx);
      });
    },
    [store]
  );

  // ─── Link Fetch Handling ──────────────────────────────────────────────────

  const handleFetchLink = useCallback(async () => {
    const url = linkUrl.trim();
    if (!url) return;

    setLinkFetching(true);
    setLinkError('');

    try {
      const res = await fetch('/api/fetch-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch paper');
      }

      const { extractPaperFromText } = await loadPdfExtractor();
      const paper = extractPaperFromText(
        data.title || 'Fetched Paper',
        data.text || ''
      );

      // Attach source link
      paper.link = url;
      paper.fileName = url;

      store.addPaper(paper);
      setLinkUrl('');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to fetch paper from link');
    } finally {
      setLinkFetching(false);
    }
  }, [linkUrl, store]);

  // ─── Run Analysis Pipeline ────────────────────────────────────────────────

  const handleRunAnalysis = useCallback(async () => {
    const { papers, selectedField } = store;
    if (papers.length === 0) return;

    store.setAnalyzing(true);
    store.setProgress(0);
    store.setCurrentStep('Detecting research gaps...');

    try {
      // Step 1: Detect gaps (rule-based)
      store.setProgress(10);
      const { detectGaps } = await loadGapDetector();
      const gaps = detectGaps(papers);
      store.setProgress(25);
      store.setCurrentStep('Comparing papers...');

      // Step 2: Compare papers (rule-based)
      const { comparePapers } = await loadComparisonEngine();
      const comparison = comparePapers(papers);
      store.setProgress(40);
      store.setCurrentStep('Generating research ideas...');

      // Step 3: Generate ideas (rule-based)
      const { generateResearchIdeas } = await loadIdeasGenerator();
      const ideas = generateResearchIdeas(papers, gaps);
      store.setProgress(55);
      store.setCurrentStep('Enhancing gaps with AI...');

      // Step 4: AI-enhanced gaps
      let aiGaps: ResearchGap[] = [];
      try {
        const gapsRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'gaps',
            data: { papers },
            field: selectedField,
          }),
        });
        const gapsData = await gapsRes.json();
        if (gapsData.success && gapsData.gaps?.length > 0) {
          aiGaps = gapsData.gaps.map(
            (g: Record<string, unknown>, i: number) =>
              ({
                id: generateId(),
                description: g.description || '',
                gapType: g.gapType || 'limited_scope',
                affectedPapers: g.affectedPapers || papers.map((p) => p.id),
                affectedPaperTitles:
                  g.affectedPaperTitles || papers.map((p) => p.title),
                severityScore: g.severityScore || 5,
                noveltyScore: g.noveltyScore || 50,
                explanation: g.explanation || '',
                whyItIsAGap: g.whyItIsAGap || '',
                supportingEvidence: g.supportingEvidence || [],
              }) as ResearchGap
          );
        }
      } catch {
        // AI gap enhancement failed — continue with rule-based only
      }

      store.setProgress(75);
      store.setCurrentStep('Enhancing ideas with AI...');

      // Step 5: AI-enhanced ideas
      let aiIdeas: ResearchIdea[] = [];
      try {
        const mergedGaps = aiGaps.length > 0 ? aiGaps : gaps;
        const ideasRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ideas',
            data: { papers, gaps: mergedGaps },
            field: selectedField,
          }),
        });
        const ideasData = await ideasRes.json();
        if (ideasData.success && ideasData.ideas?.length > 0) {
          aiIdeas = ideasData.ideas.map(
            (idea: Record<string, unknown>) =>
              ({
                id: generateId(),
                title: idea.title || 'Untitled Idea',
                description: idea.description || '',
                methodology: idea.methodology || '',
                expectedContribution: idea.expectedContribution || '',
                difficulty: idea.difficulty || 'medium',
                relatedGaps: idea.relatedGaps || [],
                noveltyScore: idea.noveltyScore || 50,
                feasibilityScore: idea.feasibilityScore || 50,
              }) as ResearchIdea
          );
        }
      } catch {
        // AI idea enhancement failed — continue with rule-based only
      }

      store.setProgress(90);
      store.setCurrentStep('Finalizing results...');

      // Step 6: Merge results — AI results enhance/replace if available
      const finalGaps = aiGaps.length > 0 ? [...gaps, ...aiGaps] : gaps;
      const finalIdeas = aiIdeas.length > 0 ? [...ideas, ...aiIdeas] : ideas;

      store.setGaps(finalGaps);
      store.setComparison(comparison);
      store.setIdeas(finalIdeas);

      store.setProgress(100);
      store.setCurrentStep('Analysis complete!');
    } catch (err) {
      console.error('Analysis pipeline error:', err);
      store.setCurrentStep(
        `Error: ${err instanceof Error ? err.message : 'Analysis failed'}`
      );
    } finally {
      store.setAnalyzing(false);
    }
  }, [store]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-80 flex-col bg-card border-r overflow-y-auto">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-5 p-4">
          {/* ── Branding ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2.5 pt-1 pb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">
                Research Gap AI
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                PhD-Level Research Analysis
              </p>
            </div>
          </div>

          <Separator />

          {/* ── PDF Upload Area ─────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Upload Papers
            </Label>

            {/* Drag & drop zone */}
            <div
              className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                className={`h-7 w-7 ${
                  isDragOver ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <div>
                <p className="text-sm font-medium">
                  Drop PDF files here
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  or click to browse
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* File list with progress */}
            {fileStates.length > 0 && (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {fileStates.map((fs, idx) => (
                  <Card key={idx} className="p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-xs truncate flex-1" title={fs.file.name}>
                        {fs.file.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    {fs.status === 'extracting' && (
                      <Progress value={fs.progress} className="h-1" />
                    )}
                    {fs.status === 'done' && (
                      <Badge
                        variant="secondary"
                        className="w-fit text-[10px] h-4"
                      >
                        Extracted
                      </Badge>
                    )}
                    {fs.status === 'error' && (
                      <span className="text-[10px] text-destructive truncate">
                        {fs.error || 'Failed'}
                      </span>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Uploaded papers summary */}
            {store.papers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  {store.papers.length} paper{store.papers.length !== 1 ? 's' : ''} loaded
                </p>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {store.papers.map((paper) => (
                    <div
                      key={paper.id}
                      className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span
                        className="text-xs truncate flex-1"
                        title={paper.title}
                      >
                        {paper.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => store.removePaper(paper.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Link Input ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add by Link
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="arXiv / DOI link"
                  className="pl-8 h-8 text-xs"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setLinkError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFetchLink();
                  }}
                />
              </div>
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={linkFetching || !linkUrl.trim()}
                onClick={handleFetchLink}
              >
                {linkFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Fetch'
                )}
              </Button>
            </div>
            {linkError && (
              <p className="text-[11px] text-destructive">{linkError}</p>
            )}
          </div>

          <Separator />

          {/* ── Field Selector ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Research Field
            </Label>
            <Select
              value={store.selectedField}
              onValueChange={store.setSelectedField}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {RESEARCH_FIELDS.map((field) => (
                  <SelectItem key={field} value={field} className="text-xs">
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* ── GitHub Token Input ──────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              GitHub Token
              <span className="ml-1 font-normal normal-case">(optional)</span>
            </Label>
            <div className="relative">
              <Key className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Personal access token"
                className="pl-8 h-8 text-xs"
                value={store.githubToken}
                onChange={(e) => store.setGithubToken(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              For saving results as a GitHub Gist
            </p>
          </div>

          <Separator />

          {/* ── Run Analysis Button ─────────────────────────────────────── */}
          <div className="space-y-3">
            <Button
              className="w-full h-11 text-sm font-semibold"
              disabled={store.papers.length === 0 || store.isAnalyzing}
              onClick={handleRunAnalysis}
            >
              {store.isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>

            {store.papers.length === 0 && !store.isAnalyzing && (
              <p className="text-[11px] text-center text-muted-foreground">
                Upload at least one paper to begin analysis
              </p>
            )}
          </div>

          {/* ── Progress Indicator ──────────────────────────────────────── */}
          {store.isAnalyzing && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium">{store.currentStep}</span>
              </div>
              <Progress value={store.progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right">
                {store.progress}%
              </p>
            </div>
          )}

          {/* Post-analysis step display */}
          {!store.isAnalyzing && store.currentStep === 'Analysis complete!' && (
            <div className="rounded-lg border bg-emerald-500/10 p-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                ✓ Analysis complete!
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {store.gaps.length} gaps, {store.ideas.length} ideas found
              </p>
            </div>
          )}

          {/* Bottom padding for scroll */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  );
}
