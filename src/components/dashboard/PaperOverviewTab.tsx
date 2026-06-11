'use client';

import { useState } from 'react';
import { useResearchStore } from '@/store/research-store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Link,
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface AiSummary {
  keyContributions?: string[];
  researchFocus?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export default function PaperOverviewTab() {
  const { papers } = useResearchStore();
  const [expandedAbstracts, setExpandedAbstracts] = useState<
    Record<string, boolean>
  >({});
  const [aiSummaries, setAiSummaries] = useState<
    Record<string, AiSummary | null>
  >({});
  const [summarizingIds, setSummarizingIds] = useState<Set<string>>(new Set());

  const toggleAbstract = (paperId: string) => {
    setExpandedAbstracts((prev) => ({
      ...prev,
      [paperId]: !prev[paperId],
    }));
  };

  const handleSummarize = async (paperId: string) => {
    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return;

    setSummarizingIds((prev) => new Set(prev).add(paperId));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summarize',
          data: { paper },
        }),
      });

      const json = await res.json();
      if (json.success && json.summary) {
        setAiSummaries((prev) => ({
          ...prev,
          [paperId]: json.summary,
        }));
      } else {
        setAiSummaries((prev) => ({
          ...prev,
          [paperId]: null,
        }));
      }
    } catch (error) {
      console.error('Summarization failed:', error);
      setAiSummaries((prev) => ({
        ...prev,
        [paperId]: null,
      }));
    } finally {
      setSummarizingIds((prev) => {
        const next = new Set(prev);
        next.delete(paperId);
        return next;
      });
    }
  };

  // Empty state
  if (!papers || papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Papers Yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Upload PDFs or add paper links to get started. Your papers will appear
          here with detailed overviews and AI-powered summaries.
        </p>
      </div>
    );
  }

  const truncate = (text: string, maxLen: number) => {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  };

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
        {papers.map((paper) => {
          const isExpanded = expandedAbstracts[paper.id] ?? false;
          const aiSummary = aiSummaries[paper.id];
          const isSummarizing = summarizingIds.has(paper.id);
          const abstractNeedsCollapse =
            paper.abstract && paper.abstract.length > 200;

          // Determine key contributions to display
          const keyContributions: string[] =
            aiSummary?.keyContributions && aiSummary.keyContributions.length > 0
              ? aiSummary.keyContributions
              : paper.keywords?.slice(0, 5) ?? [];

          return (
            <Card key={paper.id} className="flex flex-col h-full">
              {/* Header */}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-bold leading-tight line-clamp-2">
                    {paper.title || 'Untitled Paper'}
                  </CardTitle>
                  <Badge
                    variant={paper.source === 'pdf' ? 'default' : 'secondary'}
                    className="shrink-0 flex items-center gap-1"
                  >
                    {paper.source === 'pdf' ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <Link className="h-3 w-3" />
                    )}
                    {paper.source === 'pdf' ? 'PDF' : 'Link'}
                  </Badge>
                </div>
                {paper.researchFocus && (
                  <CardDescription className="text-xs mt-1">
                    {paper.researchFocus}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex flex-col gap-4 flex-1">
                {/* Abstract - Collapsible */}
                {paper.abstract && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Abstract
                    </p>
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleAbstract(paper.id)}
                    >
                      <p className="text-sm text-foreground leading-relaxed">
                        {isExpanded
                          ? paper.abstract
                          : truncate(paper.abstract, 200)}
                      </p>
                      {abstractNeedsCollapse && (
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/80"
                          >
                            {isExpanded ? (
                              <>
                                Show less
                                <ChevronUp className="ml-1 h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Show more
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </Collapsible>
                  </div>
                )}

                {/* Key Contributions */}
                {(keyContributions.length > 0 || aiSummary) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Key Contributions
                    </p>
                    <ul className="space-y-1">
                      {keyContributions.map((contribution, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-foreground flex items-start gap-1.5"
                        >
                          <span className="text-primary mt-1 shrink-0">&#8226;</span>
                          <span>{contribution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Summary Results */}
                {aiSummary && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {aiSummary.researchFocus && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Research Focus
                          </p>
                          <p className="text-sm text-foreground">
                            {aiSummary.researchFocus}
                          </p>
                        </div>
                      )}
                      {aiSummary.strengths &&
                        aiSummary.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                              Strengths
                            </p>
                            <ul className="space-y-0.5">
                              {aiSummary.strengths.map((s, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-foreground flex items-start gap-1.5"
                                >
                                  <span className="text-emerald-500 mt-0.5 shrink-0">
                                    +
                                  </span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {aiSummary.weaknesses &&
                        aiSummary.weaknesses.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1">
                              Weaknesses
                            </p>
                            <ul className="space-y-0.5">
                              {aiSummary.weaknesses.map((w, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm text-foreground flex items-start gap-1.5"
                                >
                                  <span className="text-orange-500 mt-0.5 shrink-0">
                                    -
                                  </span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </>
                )}

                {/* Methodology */}
                {paper.methodology && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Methodology
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {truncate(paper.methodology, 150)}
                    </p>
                  </div>
                )}

                {/* Results */}
                {paper.results && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Results
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {truncate(paper.results, 150)}
                    </p>
                  </div>
                )}

                {/* Limitations - highlighted in amber/orange */}
                {paper.limitations && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                      Limitations
                    </p>
                    <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                      {truncate(paper.limitations, 200)}
                    </p>
                  </div>
                )}

                {/* Keywords */}
                {paper.keywords && paper.keywords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {paper.keywords.map((keyword, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {paper.topics && paper.topics.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Topics
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {paper.topics.map((topic, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summarize with AI button */}
                <div className="mt-auto pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleSummarize(paper.id)}
                    disabled={isSummarizing}
                  >
                    {isSummarizing ? (
                      <>
                        <Brain className="h-4 w-4 animate-pulse" />
                        Summarizing...
                      </>
                    ) : aiSummary ? (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Re-summarize with AI
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Summarize with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
