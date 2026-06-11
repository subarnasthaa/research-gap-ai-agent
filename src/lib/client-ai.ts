/**
 * Client-side AI analysis helper.
 * Works in two modes:
 * 1. With backend (Next.js API routes) — full AI via z-ai-web-dev-sdk
 * 2. Without backend (GitHub Pages) — uses free AI APIs directly from browser
 */

import type { ResearchGap, ResearchIdea, ExtractedPaper } from './types';
import { generateId } from './utils-uuid';

// ─── Detect if running on GitHub Pages ──────────────────────────────────────

function isGitHubPages(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('github.io') ||
    window.location.pathname.startsWith('/research-gap-ai-agent');
}

// ─── Agent Prompts ───────────────────────────────────────────────────────────

const GAP_AGENT_PROMPT = `You are a Research Gap Extraction Agent. Output ONLY valid JSON. No explanations, no markdown, no extra text.

Return exactly this structure:
{
  "paper_cluster": [{"paper_id":"string","title":"string","main_topic":"string","method_summary":"string"}],
  "identified_gaps": [{"gap_id":"string","description":"string","type":"comparison_gap|dataset_gap|methodology_gap|theoretical_gap|application_gap","severity":0,"evidence_papers":["paper_id"]}],
  "research_context": {"field":"string","subfield":"string","trend_level":"low|medium|high|very_high"},
  "gap_summary":"string",
  "keywords":["string"],
  "priority_gaps_for_next_agent":["gap_id"]
}

Identify ALL research gaps: missing comparisons, missing datasets, weak assumptions, outdated methods, lack of real-world testing, contradictions. ONLY JSON.`;

const IDEA_AGENT_PROMPT = `You are a Research Idea Generation Agent. Output ONLY valid JSON. No explanations, no markdown, no extra text.

Return exactly this structure:
{
  "research_ideas": [{"idea_id":"string","title":"string","addresses_gaps":["gap_id"],"hypothesis":"string","proposed_methodology":"string","expected_contribution":"string","difficulty":"low|medium|high","novelty_score":0,"feasibility_score":0,"suggested_experiments":["string"],"potential_datasets":["string"]}],
  "cross_pollination_ideas": [{"idea_id":"string","title":"string","source_paper":"paper_id","target_domain":"string","method_transfer":"string","novelty_score":0}],
  "phd_thesis_topics": [{"topic_id":"string","title":"string","core_question":"string","addresses_gaps":["gap_id"],"estimated_duration":"string","novelty_score":0}]
}

ONLY JSON.`;

const SUMMARIZE_AGENT_PROMPT = `You are a Paper Summarization Agent. Output ONLY valid JSON. No explanations, no markdown.

Return: {"key_contributions":["string"],"research_focus":"string","strengths":["string"],"weaknesses":["string"],"methodology_type":"string","datasets_used":["string"],"claimed_results":"string"}`;

// ─── API Call Functions ──────────────────────────────────────────────────────

async function callBackendAPI(type: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  if (isGitHubPages()) return null; // Skip backend on GitHub Pages

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json;
    }
  } catch {
    // Backend not available
  }
  return null;
}

async function callFreeAI(prompt: string, userMessage: string): Promise<string | null> {
  // Try multiple free AI APIs as fallbacks

  // 1. Try HuggingFace Inference API (free tier)
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: `<s>[INST] ${prompt}\n\n${userMessage} [/INST]`,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.3,
            return_full_text: false,
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text;
      }
    }

    // If model is loading, wait and retry
    if (response.status === 503) {
      const data = await response.json();
      const waitTime = data.estimated_time || 20;
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime * 1000, 30000)));

      const retryResponse = await fetch(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: `<s>[INST] ${prompt}\n\n${userMessage} [/INST]`,
            parameters: {
              max_new_tokens: 2048,
              temperature: 0.3,
              return_full_text: false,
            },
          }),
        }
      );

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (Array.isArray(retryData) && retryData[0]?.generated_text) {
          return retryData[0].generated_text;
        }
      }
    }
  } catch {
    // HuggingFace API not available
  }

  // 2. Try alternative model on HuggingFace
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/flan-t5-large',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: `${prompt}\n\n${userMessage}`,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.3,
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text;
      }
    }
  } catch {
    // Alternative model not available
  }

  return null;
}

function parseJSON(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function analyzeGaps(
  papers: ExtractedPaper[],
  field: string
): Promise<{ gaps: ResearchGap[]; agentOutput: Record<string, unknown> | null }> {
  // Try backend first (local dev with z-ai-web-dev-sdk)
  const backend = await callBackendAPI('gaps', { data: { papers }, field });
  if (backend && backend.gaps?.length) {
    return { gaps: backend.gaps as ResearchGap[], agentOutput: (backend.agentOutput as Record<string, unknown>) || null };
  }

  // Fallback: Try free AI APIs (works on GitHub Pages)
  const paperSummaries = papers.map((p, i) => ({
    paper_id: p.id || `P${i + 1}`,
    title: p.title,
    abstract: p.abstract?.substring(0, 500),
    methodology: p.methodology?.substring(0, 300),
    limitations: p.limitations?.substring(0, 300),
  }));

  const aiResponse = await callFreeAI(
    GAP_AGENT_PROMPT,
    `Analyze these research papers in "${field}":\n${JSON.stringify(paperSummaries, null, 2)}\n\nOutput the structured JSON now.`
  );

  const parsed = parseJSON(aiResponse);
  if (parsed?.identified_gaps) {
    const gaps = mapAgentGapsToUI(parsed, papers);
    return { gaps, agentOutput: parsed };
  }

  // Final fallback: rule-based only (no AI)
  return { gaps: [], agentOutput: null };
}

export async function analyzeIdeas(
  papers: ExtractedPaper[],
  gaps: ResearchGap[],
  field: string,
  agentOutput: Record<string, unknown> | null
): Promise<ResearchIdea[]> {
  // Try backend first
  const backend = await callBackendAPI('ideas', { data: { papers, gaps, agentOutput }, field });
  if (backend && backend.ideas?.length) {
    return backend.ideas as ResearchIdea[];
  }

  // Fallback: Try free AI APIs
  const gapInput = agentOutput || gaps.map((g, i) => ({
    gap_id: g.id || `G${i + 1}`,
    description: g.description,
    type: g.gapType,
    severity: g.severityScore,
  }));

  const paperSummaries = papers.map((p, i) => ({
    paper_id: p.id || `P${i + 1}`,
    title: p.title,
    keywords: p.keywords?.slice(0, 5),
  }));

  const aiResponse = await callFreeAI(
    IDEA_AGENT_PROMPT,
    `Field: "${field}"\nGAP ANALYSIS:\n${JSON.stringify(gapInput, null, 2)}\nPAPERS:\n${JSON.stringify(paperSummaries, null, 2)}\n\nOutput the structured JSON now.`
  );

  const parsed = parseJSON(aiResponse);
  if (parsed?.research_ideas) {
    return mapAgentIdeasToUI(parsed);
  }

  return [];
}

export async function summarizePaper(
  paper: ExtractedPaper
): Promise<Record<string, unknown> | null> {
  // Try backend first
  const backend = await callBackendAPI('summarize', { data: { paper } });
  if (backend?.summary) return backend.summary as Record<string, unknown>;

  // Fallback: Try free AI APIs
  const aiResponse = await callFreeAI(
    SUMMARIZE_AGENT_PROMPT,
    `Summarize: Title: ${paper.title}\nAbstract: ${paper.abstract}\nMethodology: ${paper.methodology?.substring(0, 500)}\n\nOutput JSON now.`
  );

  return parseJSON(aiResponse);
}

// ─── Mapping Functions ───────────────────────────────────────────────────────

function mapAgentGapsToUI(
  agentOutput: Record<string, unknown>,
  _papers: ExtractedPaper[]
): ResearchGap[] {
  const identifiedGaps = (agentOutput.identified_gaps || []) as Array<{
    gap_id?: string; description?: string; type?: string;
    severity?: number; evidence_papers?: string[];
  }>;
  const paperCluster = (agentOutput.paper_cluster || []) as Array<{
    paper_id?: string; title?: string;
  }>;

  return identifiedGaps.map((g) => ({
    id: g.gap_id || generateId(),
    description: g.description || '',
    gapType: mapGapType(g.type),
    affectedPapers: g.evidence_papers || [],
    affectedPaperTitles: (g.evidence_papers || []).map(
      (pid) => paperCluster.find((p) => p.paper_id === pid)?.title || pid
    ),
    severityScore: g.severity || 5,
    noveltyScore: Math.min(100, Math.max(0, Math.round((10 - (g.severity || 5)) * 10 + Math.random() * 20))),
    explanation: g.description || '',
    whyItIsAGap: `Identified as a ${g.type || 'research'} gap with severity ${(g.severity || 5)}/10`,
    supportingEvidence: [],
    isPriority: ((agentOutput.priority_gaps_for_next_agent || []) as string[]).includes(g.gap_id || ''),
  }));
}

function mapGapType(agentType?: string): string {
  const typeMap: Record<string, string> = {
    comparison_gap: 'conflicting_results',
    dataset_gap: 'missing_dataset',
    methodology_gap: 'methodology_gap',
    theoretical_gap: 'limited_scope',
    application_gap: 'cross_domain_gap',
  };
  return typeMap[agentType || ''] || 'limited_scope';
}

function mapAgentIdeasToUI(agentOutput: Record<string, unknown>): ResearchIdea[] {
  const ideas: ResearchIdea[] = [];

  const researchIdeas = (agentOutput.research_ideas || []) as Array<{
    idea_id?: string; title?: string; addresses_gaps?: string[];
    hypothesis?: string; proposed_methodology?: string; expected_contribution?: string;
    difficulty?: string; novelty_score?: number; feasibility_score?: number;
  }>;
  const crossPollination = (agentOutput.cross_pollination_ideas || []) as Array<{
    idea_id?: string; title?: string; source_paper?: string;
    target_domain?: string; method_transfer?: string; novelty_score?: number;
  }>;
  const phdTopics = (agentOutput.phd_thesis_topics || []) as Array<{
    topic_id?: string; title?: string; core_question?: string;
    addresses_gaps?: string[]; estimated_duration?: string; novelty_score?: number;
  }>;

  for (const idea of researchIdeas) {
    ideas.push({
      id: idea.idea_id || generateId(),
      title: idea.title || 'Untitled Idea',
      description: idea.hypothesis || '',
      methodology: idea.proposed_methodology || '',
      expectedContribution: idea.expected_contribution || '',
      difficulty: (idea.difficulty as 'low' | 'medium' | 'high') || 'medium',
      relatedGaps: idea.addresses_gaps || [],
      noveltyScore: idea.novelty_score || 50,
      feasibilityScore: idea.feasibility_score || 50,
    });
  }

  for (const idea of crossPollination) {
    ideas.push({
      id: idea.idea_id || generateId(),
      title: idea.title || 'Cross-Pollination Idea',
      description: `Transfer from ${idea.source_paper || 'source'} to ${idea.target_domain || 'target'}: ${idea.method_transfer || ''}`,
      methodology: idea.method_transfer || '',
      expectedContribution: `Novel application in ${idea.target_domain || 'new domain'}`,
      difficulty: 'medium',
      relatedGaps: [],
      noveltyScore: idea.novelty_score || 60,
      feasibilityScore: 65,
    });
  }

  for (const topic of phdTopics) {
    ideas.push({
      id: topic.topic_id || generateId(),
      title: `🎓 PhD: ${topic.title || 'Untitled Topic'}`,
      description: topic.core_question || '',
      methodology: `Duration: ${topic.estimated_duration || '3-4 years'}`,
      expectedContribution: topic.core_question || '',
      difficulty: 'high',
      relatedGaps: topic.addresses_gaps || [],
      noveltyScore: topic.novelty_score || 70,
      feasibilityScore: 45,
    });
  }

  return ideas;
}
