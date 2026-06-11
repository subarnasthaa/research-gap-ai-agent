'use client';

import { useState, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GraduationCap,
  Lightbulb,
  FlaskConical,
  Target,
  TrendingUp,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type SortOption = 'novelty' | 'feasibility' | 'difficulty';

function getDifficultyColor(difficulty: 'low' | 'medium' | 'high'): string {
  switch (difficulty) {
    case 'low':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }
}

function getScoreCircleColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreCircleStroke(score: number): string {
  if (score >= 70) return 'stroke-emerald-500';
  if (score >= 40) return 'stroke-yellow-500';
  return 'stroke-red-500';
}

function getScoreRingBg(score: number): string {
  if (score >= 70) return 'stroke-emerald-200 dark:stroke-emerald-800';
  if (score >= 40) return 'stroke-yellow-200 dark:stroke-yellow-800';
  return 'stroke-red-200 dark:stroke-red-800';
}

function ScoreCircle({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="5"
            className={getScoreRingBg(score)}
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-500 ${getScoreCircleStroke(score)}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-sm font-bold ${getScoreCircleColor(score)}`}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
}

export default function ResearchIdeasTab() {
  const { ideas, gaps } = useResearchStore();

  const [sortBy, setSortBy] = useState<SortOption>('novelty');
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());

  const toggleIdea = (id: string) => {
    setExpandedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sortedIdeas = useMemo(() => {
    const result = [...ideas];
    switch (sortBy) {
      case 'novelty':
        result.sort((a, b) => b.noveltyScore - a.noveltyScore);
        break;
      case 'feasibility':
        result.sort((a, b) => b.feasibilityScore - a.feasibilityScore);
        break;
      case 'difficulty': {
        const difficultyOrder = { low: 0, medium: 1, high: 2 };
        result.sort(
          (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        );
        break;
      }
    }
    return result;
  }, [ideas, sortBy]);

  const summaryStats = useMemo(() => {
    if (ideas.length === 0) {
      return { total: 0, avgNovelty: 0, avgFeasibility: 0 };
    }
    const avgNovelty =
      ideas.reduce((sum, i) => sum + i.noveltyScore, 0) / ideas.length;
    const avgFeasibility =
      ideas.reduce((sum, i) => sum + i.feasibilityScore, 0) / ideas.length;
    return {
      total: ideas.length,
      avgNovelty: Math.round(avgNovelty * 10) / 10,
      avgFeasibility: Math.round(avgFeasibility * 10) / 10,
    };
  }, [ideas]);

  // Helper to find gap description by id
  const getGapById = (id: string) => gaps.find((g) => g.id === id);

  // Empty state
  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <GraduationCap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          No Research Ideas Generated
        </h3>
        <p className="text-muted-foreground max-w-md">
          Upload research papers and run an analysis to generate research ideas.
          The ideas generator will propose novel research directions based on
          detected gaps.
        </p>
        <Button variant="outline" className="mt-4" disabled>
          <Lightbulb className="h-4 w-4 mr-2" />
          Run Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Ideas</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summaryStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Novelty
              </span>
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${getScoreCircleColor(summaryStats.avgNovelty)}`}
            >
              {summaryStats.avgNovelty}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Feasibility
              </span>
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${getScoreCircleColor(summaryStats.avgFeasibility)}`}
            >
              {summaryStats.avgFeasibility}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Sort by:
          </span>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novelty">Novelty (High → Low)</SelectItem>
              <SelectItem value="feasibility">
                Feasibility (High → Low)
              </SelectItem>
              <SelectItem value="difficulty">
                Difficulty (Low → High)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {sortedIdeas.length} idea{sortedIdeas.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Separator />

      {/* Idea Cards */}
      <div className="space-y-4">
        {sortedIdeas.map((idea) => {
          const isExpanded = expandedIdeas.has(idea.id);
          const relatedGapObjects = idea.relatedGaps
            .map((gapId) => getGapById(gapId))
            .filter(Boolean);

          return (
            <Card key={idea.id} className="overflow-hidden">
              {/* Header - always visible */}
              <div
                className="cursor-pointer hover:bg-muted/50 transition-colors p-4 sm:p-6"
                onClick={() => toggleIdea(idea.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="text-base sm:text-lg font-bold leading-tight">
                        {idea.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getDifficultyColor(idea.difficulty)}>
                        {idea.difficulty.charAt(0).toUpperCase() +
                          idea.difficulty.slice(1)}{' '}
                        Difficulty
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <ScoreCircle score={idea.noveltyScore} label="Novelty" />
                    <ScoreCircle
                      score={idea.feasibilityScore}
                      label="Feasibility"
                    />
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 border-t pt-4">
                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {idea.description}
                    </p>
                  </div>

                  {/* Methodology */}
                  <div>
                    <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5" />
                      Suggested Methodology
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {idea.methodology}
                    </p>
                  </div>

                  {/* Expected Contribution */}
                  <div>
                    <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Expected Contribution
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {idea.expectedContribution}
                    </p>
                  </div>

                  {/* Related Gaps */}
                  {relatedGapObjects.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        Related Gaps
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {relatedGapObjects.map((gap) => (
                          <div
                            key={gap!.id}
                            className="rounded-md border bg-muted/30 p-3"
                          >
                            <p className="text-sm font-medium">
                              {gap!.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Severity: {gap!.severityScore}/10 &middot; Novelty:{' '}
                              {gap!.noveltyScore}/100
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Novelty Score
                        </span>
                        <span
                          className={`text-sm font-bold ${getScoreCircleColor(idea.noveltyScore)}`}
                        >
                          {idea.noveltyScore}/100
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            idea.noveltyScore >= 70
                              ? 'bg-emerald-500'
                              : idea.noveltyScore >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${idea.noveltyScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Feasibility Score
                        </span>
                        <span
                          className={`text-sm font-bold ${getScoreCircleColor(idea.feasibilityScore)}`}
                        >
                          {idea.feasibilityScore}/100
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            idea.feasibilityScore >= 70
                              ? 'bg-emerald-500'
                              : idea.feasibilityScore >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${idea.feasibilityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
