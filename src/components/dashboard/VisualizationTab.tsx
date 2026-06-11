'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { useResearchStore } from '@/store/research-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart3, PieChart as PieChartIcon, ScatterChart as ScatterIcon } from 'lucide-react';
import type { GapType } from '@/lib/types';
import { GAP_TYPE_LABELS } from '@/lib/types';

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#0088fe',
  '#00c49f',
  '#ffbb28',
  '#ff8042',
  '#a4de6c',
  '#d0ed57',
  '#83a6ed',
  '#8dd1e1',
];

export default function VisualizationTab() {
  const { papers, gaps, comparison, ideas } = useResearchStore();

  const hasData = papers.length > 0 || gaps.length > 0 || ideas.length > 0;

  // --- Data preparation ---

  // 1. Gap Type Distribution (Pie Chart)
  const gapTypeCounts = gaps.reduce<Record<string, number>>((acc, gap) => {
    acc[gap.gapType] = (acc[gap.gapType] || 0) + 1;
    return acc;
  }, {});
  const gapTypeData = Object.entries(gapTypeCounts).map(([type, count], idx) => ({
    name: GAP_TYPE_LABELS[type as GapType] || type,
    value: count,
    color: COLORS[idx % COLORS.length],
  }));

  // 2. Severity vs Novelty (Scatter Chart)
  const severityNoveltyData = gaps.map((gap, idx) => ({
    x: gap.severityScore,
    y: gap.noveltyScore,
    z: 100,
    description: gap.description,
    gapType: GAP_TYPE_LABELS[gap.gapType] || gap.gapType,
    fill: COLORS[Object.keys(gapTypeCounts).indexOf(gap.gapType) % COLORS.length],
  }));

  // 3. Paper Similarity Heatmap (Bar Chart as proxy)
  const paperSimilarityData = papers.map((paper, i) => {
    const entry: Record<string, string | number> = { name: paper.title.length > 25 ? paper.title.slice(0, 25) + '...' : paper.title };
    if (comparison) {
      const overlapCount = comparison.similarities.filter((s) =>
        s.toLowerCase().includes(paper.title.toLowerCase().slice(0, 20)) ||
        s.toLowerCase().includes(paper.keywords?.[0]?.toLowerCase() || '')
      ).length;
      entry['Overlap Count'] = overlapCount;
    } else {
      // Compute keyword overlap with other papers
      let totalOverlap = 0;
      papers.forEach((other) => {
        if (other.id !== paper.id) {
          const overlap = paper.keywords.filter((kw) => other.keywords.includes(kw));
          totalOverlap += overlap.length;
        }
      });
      entry['Overlap Count'] = totalOverlap;
    }
    return entry;
  });

  // 4. Gap Severity Distribution (Bar Chart)
  const severityByType = gaps.reduce<Record<string, { total: number; count: number }>>((acc, gap) => {
    if (!acc[gap.gapType]) acc[gap.gapType] = { total: 0, count: 0 };
    acc[gap.gapType].total += gap.severityScore;
    acc[gap.gapType].count += 1;
    return acc;
  }, {});
  const severityDistData = Object.entries(severityByType).map(([type, { total, count }], idx) => ({
    name: GAP_TYPE_LABELS[type as GapType] || type,
    severity: Number((total / count).toFixed(1)),
    fill: COLORS[idx % COLORS.length],
  }));

  // 5. Research Idea Feasibility vs Novelty (Scatter Chart)
  const ideaScatterData = ideas.map((idea) => ({
    x: idea.feasibilityScore,
    y: idea.noveltyScore,
    z: 100,
    title: idea.title,
    difficulty: idea.difficulty,
  }));

  // Empty state
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Data to Visualize</h3>
        <p className="text-muted-foreground max-w-md">
          Upload papers and run the analysis to see visualizations of research gaps, severity distributions, and idea scores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Gap Type Distribution + Severity vs Novelty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gap Type Distribution (Pie Chart) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Gap Type Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {gapTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gapTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name.length > 18 ? name.slice(0, 18) + '...' : name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {gapTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No gap data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severity vs Novelty (Scatter Chart) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScatterIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Severity vs Novelty</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {severityNoveltyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Severity"
                    domain={[0, 10]}
                    label={{ value: 'Severity (1-10)', position: 'insideBottom', offset: -2 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Novelty"
                    domain={[0, 100]}
                    label={{ value: 'Novelty', angle: -90, position: 'insideLeft' }}
                  />
                  <ZAxis type="number" dataKey="z" range={[60, 200]} name="Size" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
                            <p className="font-medium">{data.gapType}</p>
                            <p className="text-muted-foreground">
                              Severity: {data.x} | Novelty: {data.y}
                            </p>
                            <p className="text-xs mt-1 max-w-[250px]">{data.description}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter data={severityNoveltyData} fill="#8884d8">
                    {severityNoveltyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No gap data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Paper Similarity + Gap Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paper Similarity Heatmap (Bar Chart as proxy) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Paper Keyword Overlap</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {paperSimilarityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paperSimilarityData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Overlap Count" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No paper data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gap Severity Distribution (Bar Chart) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Average Severity by Gap Type</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {severityDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityDistData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="severity" name="Avg Severity" radius={[4, 4, 0, 0]}>
                    {severityDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No gap data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Research Idea Feasibility vs Novelty */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScatterIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Research Idea: Feasibility vs Novelty</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {ideaScatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Feasibility"
                  domain={[0, 100]}
                  label={{ value: 'Feasibility Score', position: 'insideBottom', offset: -2 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Novelty"
                  domain={[0, 100]}
                  label={{ value: 'Novelty Score', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 200]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-medium">{data.title}</p>
                          <Badge variant="secondary" className="mt-1">{data.difficulty}</Badge>
                          <p className="text-muted-foreground mt-1">
                            Feasibility: {data.x} | Novelty: {data.y}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={ideaScatterData} fill="#ffc658">
                  {ideaScatterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.difficulty === 'low'
                          ? '#82ca9d'
                          : entry.difficulty === 'medium'
                          ? '#ffc658'
                          : '#ff7300'
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground text-sm">
              No research ideas available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{papers.length} Paper{papers.length !== 1 ? 's' : ''}</Badge>
        <Badge variant="secondary">{gaps.length} Gap{gaps.length !== 1 ? 's' : ''}</Badge>
        <Badge variant="secondary">{ideas.length} Idea{ideas.length !== 1 ? 's' : ''}</Badge>
        {comparison && <Badge variant="secondary">Comparison Ready</Badge>}
      </div>
    </div>
  );
}
