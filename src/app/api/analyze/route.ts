import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(req: NextRequest) {
  try {
    const { type, data, field } = await req.json();

    const zai = await ZAI.create();

    if (type === 'gaps') {
      const { papers } = data;
      const paperSummaries = papers.map((p: { title: string; abstract: string; methodology: string; results: string; limitations: string; conclusion: string; keywords: string[] }) => ({
        title: p.title,
        abstract: p.abstract?.substring(0, 500),
        methodology: p.methodology?.substring(0, 300),
        results: p.results?.substring(0, 300),
        limitations: p.limitations?.substring(0, 300),
        conclusion: p.conclusion?.substring(0, 300),
        keywords: p.keywords?.slice(0, 10),
      }));

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: `You are an expert research gap analyst with PhD-level expertise in ${field || 'Computer Science'}. Your task is to analyze research papers and identify significant research gaps. You must respond with valid JSON only, no additional text.`
          },
          {
            role: 'user',
            content: `Analyze these research papers and identify research gaps. For each gap provide: description (string), gapType (one of: missing_dataset, methodology_gap, conflicting_results, no_real_world_validation, small_sample_size, missing_edge_case, outdated_method, cross_domain_gap, limited_scope, reproducibility_issue, ethical_concern, scalability_limitation), severityScore (1-10), noveltyScore (0-100), explanation (string), whyItIsAGap (string), supportingEvidence (string[]).

Papers:
${JSON.stringify(paperSummaries, null, 2)}

Return a JSON object with a "gaps" array. Each gap must have all the fields listed above. Find at least 3 and up to 10 research gaps.`
          }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(response);
        return NextResponse.json({ success: true, gaps: parsed.gaps || [] });
      } catch {
        return NextResponse.json({ success: true, gaps: [], rawResponse: response });
      }
    }

    if (type === 'ideas') {
      const { papers, gaps } = data;
      const paperTitles = papers.map((p: { title: string; keywords: string[] }) => ({ title: p.title, keywords: p.keywords?.slice(0, 5) }));
      const gapSummaries = gaps.map((g: { description: string; gapType: string; severityScore: number; noveltyScore: number }) => ({
        description: g.description,
        gapType: g.gapType,
        severity: g.severityScore,
        novelty: g.noveltyScore,
      }));

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: `You are a world-class research advisor who generates novel, publishable research ideas at the PhD level. Your expertise is in ${field || 'Computer Science'}. You must respond with valid JSON only, no additional text.`
          },
          {
            role: 'user',
            content: `Based on these research gaps and papers, generate novel research ideas.

Gaps:
${JSON.stringify(gapSummaries, null, 2)}

Papers:
${JSON.stringify(paperTitles, null, 2)}

For each idea, provide: title (string), description (string), methodology (string), expectedContribution (string), difficulty ("low"|"medium"|"high"), noveltyScore (0-100), feasibilityScore (0-100).

Return a JSON object with an "ideas" array. Generate 5-8 research ideas.`
          }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(response);
        return NextResponse.json({ success: true, ideas: parsed.ideas || [] });
      } catch {
        return NextResponse.json({ success: true, ideas: [], rawResponse: response });
      }
    }

    if (type === 'summarize') {
      const { paper } = data;
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an expert academic paper summarizer. Provide clear, structured summaries. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: `Summarize this research paper. Provide: keyContributions (string[] - 3-5 bullet points), researchFocus (string - one sentence), strengths (string[] - 2-3 points), weaknesses (string[] - 2-3 points).

Title: ${paper.title}
Abstract: ${paper.abstract}
Methodology: ${paper.methodology?.substring(0, 500)}
Results: ${paper.results?.substring(0, 500)}

Return a JSON object with: keyContributions, researchFocus, strengths, weaknesses.`
          }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(response);
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
