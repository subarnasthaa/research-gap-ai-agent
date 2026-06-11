'use client';

import { useState, useMemo } from 'react';
import { useResearchStore } from '@/store/research-store';
import { GAP_TYPE_LABELS, GAP_TYPE_COLORS } from '@/lib/types';
import type { GapType } from '@/lib/types';
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Search,
  Lightbulb,
  AlertCircle,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';

const ALL_GAP_TYPES: GapType[] = [
  'missing_dataset',
  'methodology_gap',
  'conflicting_results',
  'no_real_world_validation',
  'small_sample_size',
  'missing_edge_case',
  'outdated_method',
  'cross_domain_gap',
  'limited_scope',
  'reproducibility_issue',
  'ethical_concern',
  'scalability_limitation',
];

type SortOption = 'severity_desc' | 'novelty_desc' | 'gap_type';

function getSeverityColor(value: number): string {
  if (value < 4) return 'bg-emerald-500';
  if (value <= 7) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getSeverityTextColor(value: number): string {
  if (value < 4) return 'text-emerald-600 dark:text-emerald-400';
  if (value <= 7) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getNoveltyColor(value: number): string {
  if (value < 40) return 'bg-emerald-500';
  if (value <= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getNoveltyTextColor(value: number): string {
  if (value < 40) return 'text-emerald-600 dark:text-emerald-400';
  if (value <= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export default function GapFinderTab() {
  const { gaps } = useResearchStore();

  const [filterType, setFilterType] = useState<string>('all');
  const [minSeverity, setMinSeverity] = useState<number>(1);
  const [sortBy, setSortBy] = useState<SortOption>('severity_desc');
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  const toggleGap = (id: string) => {
    setExpandedGaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredGaps = useMemo(() => {
    let result = gaps.filter((g) => {
      if (filterType !== 'all' && g.gapType !== filterType) return false;
      if (g.severityScore < minSeverity) return false;
      return true;
    });

    switch (sortBy) {
      case 'severity_desc':
        result.sort((a, b) => b.severityScore - a.severityScore);
        break;
      case 'novelty_desc':
        result.sort((a, b) => b.noveltyScore - a.noveltyScore);
        break;
      case 'gap_type':
        result.sort((a, b) => a.gapType.localeCompare(b.gapType));
        break;
    }

    return result;
  }, [gaps, filterType, minSeverity, sortBy]);

  const summaryStats = useMemo(() => {
    if (gaps.length === 0) {
      return {
        total: 0,
        avgSeverity: 0,
        avgNovelty: 0,
        typeDistribution: {} as Record<string, number>,
      };
    }
    const avgSeverity =
      gaps.reduce((sum, g) => sum + g.severityScore, 0) / gaps.length;
    const avgNovelty =
      gaps.reduce((sum, g) => sum + g.noveltyScore, 0) / gaps.length;
    const typeDistribution: Record<string, number> = {};
    gaps.forEach((g) => {
      typeDistribution[g.gapType] = (typeDistribution[g.gapType] || 0) + 1;
    });
    return {
      total: gaps.length,
      avgSeverity: Math.round(avgSeverity * 10) / 10,
      avgNovelty: Math.round(avgNovelty * 10) / 10,
      typeDistribution,
    };
  }, [gaps]);

  // Empty state
  if (gaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Gaps Detected Yet</h3>
        <p className="text-muted-foreground max-w-md">
          Upload research papers and run an analysis to detect research gaps.
          The gap finder will identify opportunities for new research across your
          uploaded papers.
        </p>
        <Button variant="outline" className="mt-4" disabled>
          <Search className="h-4 w-4 mr-2" />
          Run Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Gaps</span>
            </div>
            <p className="text-2xl font-bold mt-1">{summaryStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Severity
              </span>
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${getSeverityTextColor(summaryStats.avgSeverity)}`}
            >
              {summaryStats.avgSeverity}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Novelty
              </span>
            </div>
            <p
              className={`text-2xl font-bold mt-1 ${getNoveltyTextColor(summaryStats.avgNovelty)}`}
            >
              {summaryStats.avgNovelty}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Gap Types
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(summaryStats.typeDistribution).map(
                ([type, count]) => (
                  <Badge
                    key={type}
                    variant="secondary"
                    className={`text-xs ${GAP_TYPE_COLORS[type as GapType] || ''}`}
                  >
                    {GAP_TYPE_LABELS[type as GapType]?.split(' ').slice(0, 2).join(' ')}{' '}
                    {count}
                  </Badge>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Gap Type
          </label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ALL_GAP_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {GAP_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 min-w-[200px]">
          <label className="text-sm font-medium text-muted-foreground">
            Min Severity: {minSeverity}
          </label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[minSeverity]}
            onValueChange={(v) => setMinSeverity(v[0])}
            className="w-[200px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Sort By
          </label>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity_desc">Severity (High → Low)</SelectItem>
              <SelectItem value="novelty_desc">Novelty (High → Low)</SelectItem>
              <SelectItem value="gap_type">Gap Type (A → Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground sm:ml-auto">
          Showing {filteredGaps.length} of {gaps.length} gaps
        </div>
      </div>

      <Separator />

      {/* Gap Cards */}
      <div className="space-y-4">
        {filteredGaps.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No gaps match the current filters. Try adjusting your criteria.
            </p>
          </div>
        ) : (
          filteredGaps.map((gap) => {
            const isExpanded = expandedGaps.has(gap.id);
            return (
              <Card key={gap.id} className="overflow-hidden">
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleGap(gap.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`${GAP_TYPE_COLORS[gap.gapType]}`}
                            >
                              {GAP_TYPE_LABELS[gap.gapType]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ID: {gap.id.slice(0, 8)}
                            </span>
                          </div>
                          <CardTitle className="text-base sm:text-lg font-bold leading-tight">
                            {gap.description}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Severity mini indicator */}
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground block">
                              Severity
                            </span>
                            <span
                              className={`text-lg font-bold ${getSeverityTextColor(gap.severityScore)}`}
                            >
                              {gap.severityScore}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground block">
                              Novelty
                            </span>
                            <span
                              className={`text-lg font-bold ${getNoveltyTextColor(gap.noveltyScore)}`}
                            >
                              {gap.noveltyScore}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                      {/* Score Bars */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Severity Score
                            </span>
                            <span
                              className={`text-sm font-bold ${getSeverityTextColor(gap.severityScore)}`}
                            >
                              {gap.severityScore}/10
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getSeverityColor(gap.severityScore)}`}
                              style={{
                                width: `${(gap.severityScore / 10) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Novelty Score
                            </span>
                            <span
                              className={`text-sm font-bold ${getNoveltyTextColor(gap.noveltyScore)}`}
                            >
                              {gap.noveltyScore}/100
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getNoveltyColor(gap.noveltyScore)}`}
                              style={{ width: `${gap.noveltyScore}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div>
                        <h4 className="text-sm font-semibold mb-1">
                          Explanation
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {gap.explanation}
                        </p>
                      </div>

                      {/* Why it is a gap */}
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Why It Is a Gap
                          </h4>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300/80 leading-relaxed">
                          {gap.whyItIsAGap}
                        </p>
                      </div>

                      {/* Affected Papers */}
                      {gap.affectedPaperTitles &&
                        gap.affectedPaperTitles.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              Affected Papers
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {gap.affectedPaperTitles.map((title, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Supporting Evidence */}
                      {gap.supportingEvidence &&
                        gap.supportingEvidence.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              Supporting Evidence
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {gap.supportingEvidence.map((evidence, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-md bg-muted/50 border-l-2 border-muted-foreground/20 p-3"
                                >
                                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                                    &ldquo;{evidence}&rdquo;
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
