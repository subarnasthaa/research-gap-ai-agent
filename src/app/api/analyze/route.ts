import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const GAP_EXTRACTION_SYSTEM_PROMPT = `You are a Research Gap Extraction Agent.

Your job is NOT to write explanations for humans.

Your ONLY task is to analyze multiple research papers and output a STRICT structured JSON that will be used by another AI agent (Idea Generator).

---

CRITICAL RULES:
- Output ONLY valid JSON
- No explanations
- No markdown
- No extra text
- Must be machine-readable
- Must be complete and structured

---

REQUIRED OUTPUT FORMAT:

Return exactly this structure:

{
  "paper_cluster": [
    {
      "paper_id": "string",
      "title": "string",
      "main_topic": "string",
      "method_summary": "string"
    }
  ],

  "identified_gaps": [
    {
      "gap_id": "string",
      "description": "string",
      "type": "comparison_gap | dataset_gap | methodology_gap | theoretical_gap | application_gap",
      "severity": number (0-10),
      "evidence_papers": ["paper_id"]
    }
  ],

  "research_context": {
    "field": "string",
    "subfield": "string",
    "trend_level": "low | medium | high | very_high"
  },

  "gap_summary": "string (1-3 lines only)",

  "keywords": ["string"],

  "priority_gaps_for_next_agent": ["gap_id"]
}

---

WHAT YOU MUST EXTRACT:

From the uploaded papers:

1. Group papers into a cluster
2. Extract core methodology of each paper
3. Identify ALL research gaps:
   - missing comparisons
   - missing datasets
   - weak assumptions
   - outdated methods
   - lack of real-world testing
   - contradictions between papers

4. Rank each gap by severity (0-10)

5. Identify which gaps are most suitable for new research

---

PURPOSE:

This output will be used directly by another AI agent to generate:
- research ideas
- hypotheses
- experiments
- PhD topics

So the output must be precise, structured, and complete.

---

DO NOT OUTPUT:
- explanations
- paragraphs
- summaries for humans
- markdown
- tables

ONLY JSON.`;

const IDEA_GENERATION_SYSTEM_PROMPT = `You are a Research Idea Generation Agent.

Your job is NOT to write explanations for humans.

Your ONLY task is to receive structured gap analysis JSON and output STRICT structured JSON containing novel research ideas.

---

CRITICAL RULES:
- Output ONLY valid JSON
- No explanations
- No markdown
- No extra text
- Must be machine-readable
- Must be complete and structured

---

REQUIRED OUTPUT FORMAT:

{
  "research_ideas": [
    {
      "idea_id": "string",
      "title": "string",
      "addresses_gaps": ["gap_id"],
      "hypothesis": "string",
      "proposed_methodology": "string",
      "expected_contribution": "string",
      "difficulty": "low | medium | high",
      "novelty_score": number (0-100),
      "feasibility_score": number (0-100),
      "suggested_experiments": ["string"],
      "potential_datasets": ["string"]
    }
  ],
  "cross_pollination_ideas": [
    {
      "idea_id": "string",
      "title": "string",
      "source_paper": "paper_id",
      "target_domain": "string",
      "method_transfer": "string",
      "novelty_score": number (0-100)
    }
  ],
  "phd_thesis_topics": [
    {
      "topic_id": "string",
      "title": "string",
      "core_question": "string",
      "addresses_gaps": ["gap_id"],
      "estimated_duration": "string",
      "novelty_score": number (0-100)
    }
  ]
}

---

WHAT YOU MUST GENERATE:

1. For each priority gap, generate at least one research idea
2. Generate cross-pollination ideas (apply methods from one paper to another domain)
3. Generate 3-5 PhD thesis topics that could address multiple gaps

---

DO NOT OUTPUT:
- explanations
- paragraphs
- summaries for humans
- markdown
- tables

ONLY JSON.`;

const SUMMARIZE_SYSTEM_PROMPT = `You are a Paper Summarization Agent. Output ONLY valid JSON. No explanations, no markdown, no extra text.

Return exactly this structure:

{
  "key_contributions": ["string"],
  "research_focus": "string (one sentence)",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "methodology_type": "string",
  "datasets_used": ["string"],
  "claimed_results": "string"
}`;

export async function POST(req: NextRequest) {
  try {
    const { type, data, field } = await req.json();

    const zai = await ZAI.create();

    if (type === 'gaps') {
      const { papers } = data;
      const paperSummaries = papers.map((p: { id?: string; title: string; abstract: string; methodology: string; results: string; limitations: string; conclusion: string; keywords: string[] }, index: number) => ({
        paper_id: p.id || `P${index + 1}`,
        title: p.title,
        abstract: p.abstract?.substring(0, 800),
        methodology: p.methodology?.substring(0, 500),
        results: p.results?.substring(0, 500),
        limitations: p.limitations?.substring(0, 500),
        conclusion: p.conclusion?.substring(0, 500),
        keywords: p.keywords?.slice(0, 10),
      }));

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: GAP_EXTRACTION_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Analyze these research papers in the field of "${field || 'Computer Science'}":

${JSON.stringify(paperSummaries, null, 2)}

Output the structured JSON now.`
          }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '';
      // Clean response: remove any markdown code fences
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({ success: true, agentOutput: parsed, gaps: mapGapsToUI(parsed) });
      } catch {
        return NextResponse.json({ success: true, agentOutput: null, gaps: [], rawResponse: response });
      }
    }

    if (type === 'ideas') {
      const { papers, gaps, agentOutput } = data;
      const paperSummaries = papers.map((p: { id?: string; title: string; keywords: string[] }, index: number) => ({
        paper_id: p.id || `P${index + 1}`,
        title: p.title,
        keywords: p.keywords?.slice(0, 5),
      }));

      // Use the raw agent output if available, otherwise use gaps
      const gapInput = agentOutput || gaps.map((g: { id?: string; description: string; gapType: string; severityScore: number }, index: number) => ({
        gap_id: g.id || `G${index + 1}`,
        description: g.description,
        type: g.gapType,
        severity: g.severityScore,
      }));

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: IDEA_GENERATION_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Research field: "${field || 'Computer Science'}"

GAP ANALYSIS INPUT:
${JSON.stringify(gapInput, null, 2)}

PAPERS:
${JSON.stringify(paperSummaries, null, 2)}

Output the structured JSON now.`
          }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '';
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({ success: true, agentOutput: parsed, ideas: mapIdeasToUI(parsed) });
      } catch {
        return NextResponse.json({ success: true, agentOutput: null, ideas: [], rawResponse: response });
      }
    }

    if (type === 'summarize') {
      const { paper } = data;
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: SUMMARIZE_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Summarize this research paper:

Title: ${paper.title}
Abstract: ${paper.abstract}
Methodology: ${paper.methodology?.substring(0, 800)}
Results: ${paper.results?.substring(0, 800)}
Limitations: ${paper.limitations?.substring(0, 500)}

Output the structured JSON now.`
          }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '';
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({ success: true, summary: parsed });
      } catch {
        return NextResponse.json({ success: true, summary: null, rawResponse: response });
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown analysis type' }, { status: 400 });
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ─── Mapping Functions: Agent JSON → UI Types ────────────────────────────────

import { generateId } from '@/lib/utils-uuid';

function mapGapsToUI(agentOutput: {
  identified_gaps?: Array<{
    gap_id?: string;
    description?: string;
    type?: string;
    severity?: number;
    evidence_papers?: string[];
  }>;
  paper_cluster?: Array<{ paper_id?: string; title?: string }>;
  gap_summary?: string;
  keywords?: string[];
  priority_gaps_for_next_agent?: string[];
}) {
  if (!agentOutput?.identified_gaps) return [];

  return agentOutput.identified_gaps.map((g) => ({
    id: g.gap_id || generateId(),
    description: g.description || '',
    gapType: mapGapType(g.type),
    affectedPapers: g.evidence_papers || [],
    affectedPaperTitles: (g.evidence_papers || []).map(
      (pid) => agentOutput.paper_cluster?.find((p) => p.paper_id === pid)?.title || pid
    ),
    severityScore: g.severity || 5,
    noveltyScore: Math.min(100, Math.max(0, Math.round((10 - (g.severity || 5)) * 10 + Math.random() * 20))),
    explanation: g.description || '',
    whyItIsAGap: `Identified as a ${g.type || 'research'} gap with severity ${(g.severity || 5)}/10`,
    supportingEvidence: [],
    isPriority: agentOutput.priority_gaps_for_next_agent?.includes(g.gap_id || ''),
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

function mapIdeasToUI(agentOutput: {
  research_ideas?: Array<{
    idea_id?: string;
    title?: string;
    addresses_gaps?: string[];
    hypothesis?: string;
    proposed_methodology?: string;
    expected_contribution?: string;
    difficulty?: string;
    novelty_score?: number;
    feasibility_score?: number;
    suggested_experiments?: string[];
    potential_datasets?: string[];
  }>;
  cross_pollination_ideas?: Array<{
    idea_id?: string;
    title?: string;
    source_paper?: string;
    target_domain?: string;
    method_transfer?: string;
    novelty_score?: number;
  }>;
  phd_thesis_topics?: Array<{
    topic_id?: string;
    title?: string;
    core_question?: string;
    addresses_gaps?: string[];
    estimated_duration?: string;
    novelty_score?: number;
  }>;
}) {
  const ideas: Array<{
    id: string;
    title: string;
    description: string;
    methodology: string;
    expectedContribution: string;
    difficulty: string;
    relatedGaps: string[];
    noveltyScore: number;
    feasibilityScore: number;
    isPhdTopic?: boolean;
    isCrossPollination?: boolean;
  }> = [];

  // Map research ideas
  if (agentOutput?.research_ideas) {
    for (const idea of agentOutput.research_ideas) {
      ideas.push({
        id: idea.idea_id || generateId(),
        title: idea.title || 'Untitled Idea',
        description: idea.hypothesis || '',
        methodology: idea.proposed_methodology || '',
        expectedContribution: idea.expected_contribution || '',
        difficulty: idea.difficulty || 'medium',
        relatedGaps: idea.addresses_gaps || [],
        noveltyScore: idea.novelty_score || 50,
        feasibilityScore: idea.feasibility_score || 50,
      });
    }
  }

  // Map cross-pollination ideas
  if (agentOutput?.cross_pollination_ideas) {
    for (const idea of agentOutput.cross_pollination_ideas) {
      ideas.push({
        id: idea.idea_id || generateId(),
        title: idea.title || 'Cross-Pollination Idea',
        description: `Transfer method from ${idea.source_paper || 'source paper'} to ${idea.target_domain || 'target domain'}: ${idea.method_transfer || ''}`,
        methodology: idea.method_transfer || '',
        expectedContribution: `Novel application of existing method in ${idea.target_domain || 'new domain'}`,
        difficulty: 'medium',
        relatedGaps: [],
        noveltyScore: idea.novelty_score || 60,
        feasibilityScore: 65,
        isCrossPollination: true,
      });
    }
  }

  // Map PhD thesis topics
  if (agentOutput?.phd_thesis_topics) {
    for (const topic of agentOutput.phd_thesis_topics) {
      ideas.push({
        id: topic.topic_id || generateId(),
        title: `🎓 PhD: ${topic.title || 'Untitled Topic'}`,
        description: topic.core_question || '',
        methodology: `Estimated duration: ${topic.estimated_duration || '3-4 years'}`,
        expectedContribution: topic.core_question || '',
        difficulty: 'high',
        relatedGaps: topic.addresses_gaps || [],
        noveltyScore: topic.novelty_score || 70,
        feasibilityScore: 45,
        isPhdTopic: true,
      });
    }
  }

  return ideas;
}
