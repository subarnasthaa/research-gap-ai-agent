'use client';

import { useState } from 'react';
import { useResearchStore } from '@/store/research-store';
import UploadPanel from '@/components/dashboard/UploadPanel';
import PaperOverviewTab from '@/components/dashboard/PaperOverviewTab';
import ComparisonMatrixTab from '@/components/dashboard/ComparisonMatrixTab';
import GapFinderTab from '@/components/dashboard/GapFinderTab';
import ResearchIdeasTab from '@/components/dashboard/ResearchIdeasTab';
import VisualizationTab from '@/components/dashboard/VisualizationTab';
import ExportPanel from '@/components/dashboard/ExportPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  GitCompare,
  Search,
  Lightbulb,
  BarChart3,
  Download,
  Brain,
  Github,
} from 'lucide-react';

export default function Home() {
  const { papers, gaps, ideas, isAnalyzing, currentStep, progress } = useResearchStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const hasResults = gaps.length > 0 || ideas.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-muted rounded-md"
            >
              <Brain className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">Research Gap AI Agent</h1>
                <p className="text-[10px] text-muted-foreground leading-tight">PhD-Level Research Analysis</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>{currentStep}</span>
              </div>
            )}
            {papers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {papers.length} Paper{papers.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {gaps.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {gaps.length} Gap{gaps.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {ideas.length > 0 && (
              <Badge className="text-xs bg-emerald-600 hover:bg-emerald-700">
                {ideas.length} Idea{ideas.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-80 border-r bg-card transition-transform duration-200 ease-in-out lg:transition-none`}
          style={{ top: '56px' }}
        >
          <UploadPanel />
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            style={{ top: '56px' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Panel */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {papers.length === 0 ? (
              /* Welcome State */
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                  <Brain className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Research Gap AI</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Upload research papers (PDFs or arXiv/DOI links) and our AI will automatically
                  detect research gaps, compare methodologies, and generate novel PhD-level research ideas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
                  <div className="border rounded-lg p-4 text-left hover:bg-muted/50 transition-colors">
                    <FileText className="h-5 w-5 mb-2 text-primary" />
                    <h3 className="font-semibold text-sm">Upload PDFs</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Drag & drop or browse to upload research papers
                    </p>
                  </div>
                  <div className="border rounded-lg p-4 text-left hover:bg-muted/50 transition-colors">
                    <GitCompare className="h-5 w-5 mb-2 text-primary" />
                    <h3 className="font-semibold text-sm">Add Links</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste arXiv or DOI links to fetch papers
                    </p>
                  </div>
                  <div className="border rounded-lg p-4 text-left hover:bg-muted/50 transition-colors">
                    <Search className="h-5 w-5 mb-2 text-primary" />
                    <h3 className="font-semibold text-sm">Find Gaps</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Run analysis to discover research gaps and ideas
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Analysis Tabs */
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                  <TabsTrigger value="overview" className="flex-1 min-w-[100px] text-xs sm:text-sm">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="comparison" className="flex-1 min-w-[100px] text-xs sm:text-sm">
                    <GitCompare className="h-3.5 w-3.5 mr-1.5" />
                    Compare
                  </TabsTrigger>
                  <TabsTrigger value="gaps" className="flex-1 min-w-[100px] text-xs sm:text-sm relative">
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                    Gaps
                    {gaps.length > 0 && (
                      <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                        {gaps.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="ideas" className="flex-1 min-w-[100px] text-xs sm:text-sm">
                    <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                    Ideas
                  </TabsTrigger>
                  <TabsTrigger value="visualization" className="flex-1 min-w-[100px] text-xs sm:text-sm">
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Visualize
                  </TabsTrigger>
                  <TabsTrigger value="export" className="flex-1 min-w-[100px] text-xs sm:text-sm">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  <TabsContent value="overview">
                    <PaperOverviewTab />
                  </TabsContent>
                  <TabsContent value="comparison">
                    <ComparisonMatrixTab />
                  </TabsContent>
                  <TabsContent value="gaps">
                    <GapFinderTab />
                  </TabsContent>
                  <TabsContent value="ideas">
                    <ResearchIdeasTab />
                  </TabsContent>
                  <TabsContent value="visualization">
                    <VisualizationTab />
                  </TabsContent>
                  <TabsContent value="export">
                    <ExportPanel />
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card py-3 px-4 mt-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" />
            <span>Research Gap AI Agent</span>
            <span className="text-border">|</span>
            <span>Browser-based PhD Research Advisor</span>
          </div>
          <div className="flex items-center gap-3">
            <span>100% Free &amp; Open Source</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Github className="h-3 w-3" />
              GitHub Gist Storage
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
