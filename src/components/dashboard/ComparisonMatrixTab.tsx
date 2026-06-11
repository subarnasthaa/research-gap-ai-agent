'use client';

import { useResearchStore } from '@/store/research-store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Table2,
} from 'lucide-react';

function ComparisonTable({
  title,
  rows,
  paperTitles,
}: {
  title: string;
  rows: { aspect: string; values: Record<string, string> }[];
  paperTitles: string[];
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No comparison data available for {title.toLowerCase()}.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Table2 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] font-semibold">Aspect</TableHead>
              {paperTitles.map((title, idx) => (
                <TableHead key={idx} className="font-semibold min-w-[150px]">
                  <span className="line-clamp-2">{title}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                <TableCell className="font-medium text-sm">
                  {row.aspect}
                </TableCell>
                {paperTitles.map((_, colIdx) => {
                  const paperId =
                    row.values && Object.keys(row.values)[colIdx];
                  const value = paperId ? row.values[paperId] : '';
                  return (
                    <TableCell key={colIdx} className="text-sm">
                      {value || (
                        <span className="text-muted-foreground italic">N/A</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function ComparisonMatrixTab() {
  const { papers, comparison } = useResearchStore();

  // Build paper title lookup
  const paperTitleMap: Record<string, string> = {};
  papers.forEach((p) => {
    paperTitleMap[p.id] = p.title || 'Untitled';
  });

  // Derive paper titles in the same order as comparison.paperIds
  const paperTitles: string[] = comparison
    ? comparison.paperIds.map(
        (id) => paperTitleMap[id] || id
      )
    : [];

  // Empty state
  if (!comparison) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <GitCompare className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Comparison Data
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Run a full analysis to generate comparison data across your uploaded
          papers. The comparison matrix will show methodology, dataset, and
          results differences side by side.
        </p>
      </div>
    );
  }

  const hasMethodology =
    comparison.methodologyComparison && comparison.methodologyComparison.length > 0;
  const hasDataset =
    comparison.datasetComparison && comparison.datasetComparison.length > 0;
  const hasResults =
    comparison.resultsComparison && comparison.resultsComparison.length > 0;
  const hasConflicts =
    comparison.conflicts && comparison.conflicts.length > 0;
  const hasSimilarities =
    comparison.similarities && comparison.similarities.length > 0;

  // Render comparison table rows where columns follow paperIds order
  const renderComparisonRows = (
    rows: { aspect: string; values: Record<string, string> }[]
  ) => {
    return rows.map((row, rowIdx) => {
      const valuesInOrder = comparison.paperIds.map((pid) => ({
        paperId: pid,
        value: row.values?.[pid] || '',
      }));
      return { ...row, valuesInOrder };
    });
  };

  return (
    <div className="space-y-6 p-1">
      {/* Methodology Comparison Table */}
      {hasMethodology && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-4 w-4" />
              Methodology Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] font-semibold">
                    Aspect
                  </TableHead>
                  {paperTitles.map((title, idx) => (
                    <TableHead
                      key={idx}
                      className="font-semibold min-w-[150px]"
                    >
                      <span className="line-clamp-2">{title}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderComparisonRows(comparison.methodologyComparison).map(
                  (row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      <TableCell className="font-medium text-sm">
                        {row.aspect}
                      </TableCell>
                      {row.valuesInOrder.map((v, colIdx) => (
                        <TableCell key={colIdx} className="text-sm">
                          {v.value || (
                            <span className="text-muted-foreground italic">
                              N/A
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dataset Comparison Table */}
      {hasDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-4 w-4" />
              Dataset Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] font-semibold">
                    Aspect
                  </TableHead>
                  {paperTitles.map((title, idx) => (
                    <TableHead
                      key={idx}
                      className="font-semibold min-w-[150px]"
                    >
                      <span className="line-clamp-2">{title}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderComparisonRows(comparison.datasetComparison).map(
                  (row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      <TableCell className="font-medium text-sm">
                        {row.aspect}
                      </TableCell>
                      {row.valuesInOrder.map((v, colIdx) => (
                        <TableCell key={colIdx} className="text-sm">
                          {v.value || (
                            <span className="text-muted-foreground italic">
                              N/A
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Results Comparison Table */}
      {hasResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-4 w-4" />
              Results Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] font-semibold">
                    Aspect
                  </TableHead>
                  {paperTitles.map((title, idx) => (
                    <TableHead
                      key={idx}
                      className="font-semibold min-w-[150px]"
                    >
                      <span className="line-clamp-2">{title}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderComparisonRows(comparison.resultsComparison).map(
                  (row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      <TableCell className="font-medium text-sm">
                        {row.aspect}
                      </TableCell>
                      {row.valuesInOrder.map((v, colIdx) => (
                        <TableCell key={colIdx} className="text-sm">
                          {v.value || (
                            <span className="text-muted-foreground italic">
                              N/A
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No tables at all */}
      {!hasMethodology && !hasDataset && !hasResults && (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No comparison tables available yet. Run analysis to generate
          methodology, dataset, and results comparisons.
        </div>
      )}

      {/* Conflicts Section */}
      {hasConflicts && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Detected Conflicts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comparison.conflicts.map((conflict, idx) => (
                <Alert
                  key={idx}
                  className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-amber-800 dark:text-amber-300">
                        {conflict.aspect}
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-amber-900 dark:text-amber-200">
                        <span className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-amber-400 text-amber-700 dark:text-amber-300 dark:border-amber-600 text-xs"
                          >
                            {paperTitleMap[conflict.paperA] || conflict.paperA}
                          </Badge>
                          <span className="font-medium">{conflict.valueA}</span>
                        </span>
                        <span className="text-amber-500 font-bold">vs</span>
                        <span className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-red-400 text-red-700 dark:text-red-300 dark:border-red-600 text-xs"
                          >
                            {paperTitleMap[conflict.paperB] || conflict.paperB}
                          </Badge>
                          <span className="font-medium">{conflict.valueB}</span>
                        </span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Similarities Section */}
      {hasSimilarities && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Common Themes &amp; Similarities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {comparison.similarities.map((similarity, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-sm py-1.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                    {similarity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
