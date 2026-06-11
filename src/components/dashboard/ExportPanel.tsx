'use client';

import { useState } from 'react';
import { useResearchStore } from '@/store/research-store';
import { GAP_TYPE_LABELS } from '@/lib/types';
import type { GapType } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Download,
  FileJson,
  FileText,
  Github,
  Printer,
  Share2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

function generateMarkdownReport(
  papers: ReturnType<typeof useResearchStore.getState>['papers'],
  gaps: ReturnType<typeof useResearchStore.getState>['gaps'],
  comparison: ReturnType<typeof useResearchStore.getState>['comparison'],
  ideas: ReturnType<typeof useResearchStore.getState>['ideas']
): string {
  const lines: string[] = [];

  lines.push('# Research Gap Analysis Report');
  lines.push('');
  lines.push(`> Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Papers Analyzed
  lines.push('## Papers Analyzed');
  lines.push('');
  if (papers.length === 0) {
    lines.push('*No papers analyzed yet.*');
  } else {
    papers.forEach((paper, i) => {
      lines.push(`### ${i + 1}. ${paper.title}`);
      lines.push('');
      lines.push(`**Source:** ${paper.fileName} (${paper.source})`);
      lines.push('');
      if (paper.abstract) {
        lines.push('**Abstract:**');
        lines.push('');
        lines.push(paper.abstract);
        lines.push('');
      }
      if (paper.keywords.length > 0) {
        lines.push(`**Keywords:** ${paper.keywords.join(', ')}`);
        lines.push('');
      }
      if (paper.researchFocus) {
        lines.push(`**Research Focus:** ${paper.researchFocus}`);
        lines.push('');
      }
    });
  }
  lines.push('---');
  lines.push('');

  // Research Gaps
  lines.push('## Research Gaps');
  lines.push('');
  if (gaps.length === 0) {
    lines.push('*No research gaps identified yet.*');
  } else {
    lines.push('| # | Type | Severity | Novelty | Description |');
    lines.push('|---|------|----------|---------|-------------|');
    gaps.forEach((gap, i) => {
      const typeLabel = GAP_TYPE_LABELS[gap.gapType as GapType] || gap.gapType;
      const desc = gap.description.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 120);
      lines.push(`| ${i + 1} | ${typeLabel} | ${gap.severityScore}/10 | ${gap.noveltyScore}/100 | ${desc} |`);
    });
    lines.push('');
    lines.push('### Gap Details');
    lines.push('');
    gaps.forEach((gap, i) => {
      const typeLabel = GAP_TYPE_LABELS[gap.gapType as GapType] || gap.gapType;
      lines.push(`#### Gap ${i + 1}: ${typeLabel}`);
      lines.push('');
      lines.push(`- **Description:** ${gap.description}`);
      lines.push(`- **Why it is a gap:** ${gap.whyItIsAGap}`);
      lines.push(`- **Severity:** ${gap.severityScore}/10`);
      lines.push(`- **Novelty Potential:** ${gap.noveltyScore}/100`);
      if (gap.affectedPaperTitles.length > 0) {
        lines.push(`- **Affected Papers:** ${gap.affectedPaperTitles.join(', ')}`);
      }
      if (gap.supportingEvidence.length > 0) {
        lines.push('- **Supporting Evidence:**');
        gap.supportingEvidence.forEach((ev) => {
          lines.push(`  - ${ev}`);
        });
      }
      lines.push('');
    });
  }
  lines.push('---');
  lines.push('');

  // Comparison Matrix
  lines.push('## Comparison Matrix');
  lines.push('');
  if (!comparison) {
    lines.push('*No comparison data available yet.*');
  } else {
    if (comparison.methodologyComparison.length > 0) {
      lines.push('### Methodology Comparison');
      lines.push('');
      const paperCols = comparison.paperIds;
      lines.push(`| Aspect | ${paperCols.join(' | ')} |`);
      lines.push(`|--------|${paperCols.map(() => '---').join('|')}|`);
      comparison.methodologyComparison.forEach((row) => {
        const vals = paperCols.map((id) => row.values[id] || 'N/A').join(' | ');
        lines.push(`| ${row.aspect} | ${vals} |`);
      });
      lines.push('');
    }

    if (comparison.datasetComparison.length > 0) {
      lines.push('### Dataset Comparison');
      lines.push('');
      const paperCols = comparison.paperIds;
      lines.push(`| Aspect | ${paperCols.join(' | ')} |`);
      lines.push(`|--------|${paperCols.map(() => '---').join('|')}|`);
      comparison.datasetComparison.forEach((row) => {
        const vals = paperCols.map((id) => row.values[id] || 'N/A').join(' | ');
        lines.push(`| ${row.aspect} | ${vals} |`);
      });
      lines.push('');
    }

    if (comparison.resultsComparison.length > 0) {
      lines.push('### Results Comparison');
      lines.push('');
      const paperCols = comparison.paperIds;
      lines.push(`| Aspect | ${paperCols.join(' | ')} |`);
      lines.push(`|--------|${paperCols.map(() => '---').join('|')}|`);
      comparison.resultsComparison.forEach((row) => {
        const vals = paperCols.map((id) => row.values[id] || 'N/A').join(' | ');
        lines.push(`| ${row.aspect} | ${vals} |`);
      });
      lines.push('');
    }

    if (comparison.conflicts.length > 0) {
      lines.push('### Conflicts Detected');
      lines.push('');
      comparison.conflicts.forEach((conflict, i) => {
        lines.push(`${i + 1}. **${conflict.aspect}**: Paper A reports "${conflict.valueA}" while Paper B reports "${conflict.valueB}"`);
      });
      lines.push('');
    }

    if (comparison.similarities.length > 0) {
      lines.push('### Similarities');
      lines.push('');
      comparison.similarities.forEach((sim, i) => {
        lines.push(`${i + 1}. ${sim}`);
      });
      lines.push('');
    }
  }
  lines.push('---');
  lines.push('');

  // Research Ideas
  lines.push('## Research Ideas');
  lines.push('');
  if (ideas.length === 0) {
    lines.push('*No research ideas generated yet.*');
  } else {
    ideas.forEach((idea, i) => {
      lines.push(`### Idea ${i + 1}: ${idea.title}`);
      lines.push('');
      lines.push(`**Description:** ${idea.description}`);
      lines.push('');
      lines.push(`**Methodology:** ${idea.methodology}`);
      lines.push('');
      lines.push(`**Expected Contribution:** ${idea.expectedContribution}`);
      lines.push('');
      lines.push(`- **Difficulty:** ${idea.difficulty}`);
      lines.push(`- **Novelty Score:** ${idea.noveltyScore}/100`);
      lines.push(`- **Feasibility Score:** ${idea.feasibilityScore}/100`);
      if (idea.relatedGaps.length > 0) {
        lines.push(`- **Related Gaps:** ${idea.relatedGaps.length} gap(s)`);
      }
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('');
  lines.push('*Report generated by Research Gap AI Agent*');

  return lines.join('\n');
}

export default function ExportPanel() {
  const { papers, gaps, comparison, ideas, githubToken, setGithubToken } = useResearchStore();
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [isCreatingGist, setIsCreatingGist] = useState(false);
  const [gistError, setGistError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [gistDialogOpen, setGistDialogOpen] = useState(false);

  const hasData = papers.length > 0 || gaps.length > 0 || ideas.length > 0;

  const handleExportMarkdown = () => {
    const markdown = generateMarkdownReport(papers, gaps, comparison, ideas);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research-gap-analysis.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      papers,
      gaps,
      comparison,
      ideas,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToGist = async (token: string) => {
    setIsCreatingGist(true);
    setGistError(null);
    setGistUrl(null);

    try {
      const markdown = generateMarkdownReport(papers, gaps, comparison, ideas);
      const jsonData = {
        exportedAt: new Date().toISOString(),
        papers,
        gaps,
        comparison,
        ideas,
      };
      const json = JSON.stringify(jsonData, null, 2);

      // Call GitHub Gist API directly from browser (supports CORS)
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Research-Gap-AI-Agent',
        },
        body: JSON.stringify({
          description: 'Research Gap Analysis Report',
          public: false,
          files: {
            'research-gap-analysis.md': { content: markdown },
            'analysis-data.json': { content: json },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create Gist' }));
        throw new Error(errorData.message || `GitHub API error: ${response.status}`);
      }

      const result = await response.json();
      setGistUrl(result.html_url || result.url);
      setGistDialogOpen(false);
    } catch (err) {
      setGistError(err instanceof Error ? err.message : 'Failed to create Gist');
    } finally {
      setIsCreatingGist(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = async () => {
    if (gistUrl) {
      try {
        await navigator.clipboard.writeText(gistUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch {
        // Fallback: select text
        setCopiedUrl(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Data to Export</h3>
              <p className="text-muted-foreground max-w-md">
                Upload papers and run the analysis to generate exportable reports.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Export buttons grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export as Markdown */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2"
                  onClick={handleExportMarkdown}
                >
                  <FileText className="h-6 w-6" />
                  <span className="font-medium">Export as Markdown</span>
                  <span className="text-xs text-muted-foreground">Download a formatted .md report</span>
                </Button>

                {/* Export as JSON */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2"
                  onClick={handleExportJSON}
                >
                  <FileJson className="h-6 w-6" />
                  <span className="font-medium">Export as JSON</span>
                  <span className="text-xs text-muted-foreground">Download full analysis as .json</span>
                </Button>

                {/* Save to GitHub Gist */}
                <Dialog open={gistDialogOpen} onOpenChange={setGistDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto py-4 px-4 flex flex-col items-center gap-2"
                      onClick={() => {
                        setGistError(null);
                        setGistUrl(null);
                      }}
                    >
                      <Github className="h-6 w-6" />
                      <span className="font-medium">Save to GitHub Gist</span>
                      <span className="text-xs text-muted-foreground">Share via a GitHub Gist</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save to GitHub Gist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="github-token">GitHub Personal Access Token</Label>
                        <Input
                          id="github-token"
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxx"
                          value={tokenInput || githubToken}
                          onChange={(e) => {
                            setTokenInput(e.target.value);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Requires the &quot;gist&quot; scope. Your token is only sent to the GitHub API.
                        </p>
                      </div>
                      {gistError && (
                        <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
                          {gistError}
                        </div>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => {
                          const token = tokenInput || githubToken;
                          if (token) {
                            setGithubToken(token);
                            handleSaveToGist(token);
                          }
                        }}
                        disabled={isCreatingGist || !tokenInput && !githubToken}
                      >
                        {isCreatingGist ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Creating Gist...
                          </>
                        ) : (
                          <>
                            <Share2 className="h-4 w-4 mr-2" />
                            Create Secret Gist
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Print Report */}
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="h-6 w-6" />
                  <span className="font-medium">Print Report</span>
                  <span className="text-xs text-muted-foreground">Open browser print dialog</span>
                </Button>
              </div>

              {/* Gist URL display */}
              {gistUrl && (
                <>
                  <Separator />
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-sm">Gist Created Successfully</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={gistUrl}
                        readOnly
                        className="text-sm font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyUrl}
                        title="Copy URL"
                      >
                        {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <a href={gistUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" title="Open in new tab">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary">
              <FileText className="h-3 w-3 mr-1" />
              {papers.length} Paper{papers.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary">
              {gaps.length} Gap{gaps.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary">
              {ideas.length} Idea{ideas.length !== 1 ? 's' : ''}
            </Badge>
            {comparison && (
              <Badge variant="secondary">
                Comparison Matrix
              </Badge>
            )}
          </div>
          {hasData && (
            <p className="text-sm text-muted-foreground mt-3">
              The Markdown export includes a comprehensive academic report with all papers, gaps, comparison matrices, and research ideas.
              The JSON export contains the full raw data for programmatic use.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
