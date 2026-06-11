import { generateId } from './utils-uuid';
import type { ExtractedPaper } from './types';

// ─── Stop Words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or',
  'if', 'while', 'this', 'that', 'these', 'those', 'it', 'its', 'we',
  'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'whose',
  'also', 'about', 'up', 'our', 'your', 'his', 'her',
]);

// ─── Section Header Patterns ──────────────────────────────────────────────────

const SECTION_PATTERNS = {
  abstract: /^(?:abstract|summary of|a b s t r a c t)\s*$/i,
  methodology: /^(?:methodology|methods?|approach|experimental\s+setup|materials?\s+and\s+methods?|research\s+methodology|research\s+design|study\s+design|experimental\s+design|procedure|procedures)\s*$/i,
  results: /^(?:results?|findings?|experiments?|experimental\s+results?|evaluation|evaluation\s+results?|analysis|empirical\s+results?)\s*$/i,
  limitations: /^(?:limitations?|future\s+work|discussion|future\s+directions?|threats?\s+to\s+validity|scope\s+and\s+limitations?|constraints?)\s*$/i,
  conclusion: /^(?:conclusions?|concluding\s+remarks?|summary|final\s+remarks?|closing\s+remarks?|wrap[- ]?up|conclusions?\s+and\s+future\s+work)\s*$/i,
} as const;

type SectionKey = keyof typeof SECTION_PATTERNS;

// Common section headers that indicate a new section (used to know when a section ends)
const ANY_SECTION_PATTERN = /^(?:abstract|summary\s+of|introduction|background|related\s+work|literature\s+review|preliminaries|methodology|methods?|approach|experimental\s+setup|materials?\s+and\s+methods?|research\s+methodology|research\s+design|study\s+design|experimental\s+design|procedure|procedures|results?|findings?|experiments?|experimental\s+results?|evaluation|evaluation\s+results?|analysis|empirical\s+results?|limitations?|future\s+work|discussion|future\s+directions?|threats?\s+to\s+validity|scope\s+and\s+limitations?|constraints?|conclusions?|concluding\s+remarks?|summary|final\s+remarks?|closing\s+remarks?|wrap[- ]?up|conclusions?\s+and\s+future\s+work|acknowledgments?|references?|bibliography|appendix|appendices)\s*$/i;

// ─── Dynamic PDF.js loader (client-only) ──────────────────────────────────────

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib;
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction is only available in the browser');
  }
  pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  return pdfjsLib;
}

// ─── Text Extraction from PDF ─────────────────────────────────────────────────

/**
 * Extracts full text from a PDF file using pdfjs-dist.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const lib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n\n');
}

// ─── Section Parsing ──────────────────────────────────────────────────────────

function parseSections(fullText: string): Record<SectionKey, string> {
  const result: Record<SectionKey, string> = {
    abstract: '',
    methodology: '',
    results: '',
    limitations: '',
    conclusion: '',
  };

  const lines = fullText.split(/\n/);

  interface SectionBoundary {
    key: SectionKey;
    startLine: number;
  }

  const boundaries: SectionBoundary[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        boundaries.push({ key: key as SectionKey, startLine: i });
        break;
      }
    }
  }

  boundaries.sort((a, b) => a.startLine - b.startLine);

  for (let idx = 0; idx < boundaries.length; idx++) {
    const current = boundaries[idx];
    const nextLine = idx + 1 < boundaries.length
      ? boundaries[idx + 1].startLine
      : lines.length;

    const sectionLines = lines.slice(current.startLine + 1, nextLine);
    const sectionText = sectionLines
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    result[current.key] = sectionText;
  }

  if (!result.abstract) {
    const abstractMatch = fullText.match(
      /abstract[:\s]*\n?([\s\S]*?)(?=\n\s*(?:introduction|keywords?|1\s*\.|1\s+introduction|i\.\s|introduction\s*[\n\r]))/i
    );
    if (abstractMatch) {
      result.abstract = abstractMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  return result;
}

function extractTitle(fullText: string): string {
  const lines = fullText.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length === 0) return 'Untitled Paper';

  const skipPatterns = /^(?:\d+|page\s+\d+|vol\.?\s+\d+|doi:|arxiv:|proceedings|journal|conference|IEEE|ACM|Springer|Nature|Science)/i;

  for (const line of lines) {
    if (line.length < 5) continue;
    if (skipPatterns.test(line)) continue;
    if (ANY_SECTION_PATTERN.test(line)) continue;

    if (line.length <= 300) {
      return line;
    }
  }

  return lines[0] || 'Untitled Paper';
}

// ─── Keyword Extraction (TF-IDF-like) ─────────────────────────────────────────

export function extractKeywords(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ');

  const words = normalized.split(' ').filter((w) => w.length > 0);

  const freq: Record<string, number> = {};
  for (const word of words) {
    if (word.length < 3) continue;
    if (STOP_WORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;

    freq[word] = (freq[word] || 0) + 1;
  }

  const bigramFreq: Record<string, number> = {};
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (w1.length < 3 || w2.length < 3) continue;
    if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
    if (/^\d+$/.test(w1) || /^\d+$/.test(w2)) continue;

    const bigram = `${w1} ${w2}`;
    bigramFreq[bigram] = (bigramFreq[bigram] || 0) + 1;
  }

  const combined: Record<string, number> = { ...freq };
  for (const [bigram, count] of Object.entries(bigramFreq)) {
    if (count >= 2) {
      combined[bigram] = count * 2;
    }
  }

  const sorted = Object.entries(combined)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  return sorted;
}

// ─── Topic Detection ──────────────────────────────────────────────────────────

export function detectTopics(text: string, keywords: string[]): string[] {
  if (keywords.length === 0) return [];

  const sentences = text
    .split(/[.!?]\s+/)
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length > 10);

  const coOccurrence: Record<string, Record<string, number>> = {};
  const topKeywords = keywords.slice(0, 15);

  for (const kw1 of topKeywords) {
    coOccurrence[kw1] = {};
    for (const kw2 of topKeywords) {
      if (kw1 === kw2) continue;
      coOccurrence[kw1][kw2] = 0;
    }
  }

  for (const sentence of sentences) {
    const present = topKeywords.filter((kw) => sentence.includes(kw.toLowerCase()));
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        if (coOccurrence[present[i]] && coOccurrence[present[i]][present[j]] !== undefined) {
          coOccurrence[present[i]][present[j]]++;
          coOccurrence[present[j]][present[i]]++;
        }
      }
    }
  }

  const visited = new Set<string>();
  const topics: string[] = [];

  for (const kw of topKeywords) {
    if (visited.has(kw)) continue;
    visited.add(kw);

    const cluster = [kw];
    if (coOccurrence[kw]) {
      const related = Object.entries(coOccurrence[kw])
        .filter(([other, count]) => count > 0 && !visited.has(other))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

      for (const [relatedKw] of related) {
        visited.add(relatedKw);
        cluster.push(relatedKw);
      }
    }

    if (cluster.length === 1) {
      topics.push(cluster[0]);
    } else {
      const topicName = cluster
        .slice(0, 2)
        .map((w) => w.split(' ').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' '))
        .join(' & ');
      topics.push(topicName);
    }

    if (topics.length >= 8) break;
  }

  return topics;
}

function generateResearchFocus(paper: {
  title: string;
  abstract: string;
  methodology: string;
  results: string;
  keywords: string[];
  topics: string[];
}): string {
  const parts: string[] = [];

  if (paper.abstract) {
    const sentences = paper.abstract.split(/[.!?]\s+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 0) {
      parts.push(sentences[0] + (sentences.length > 1 ? '. ' + sentences[1] : '.'));
    }
  } else {
    parts.push(`Research on "${paper.title}".`);
  }

  if (paper.topics.length > 0) {
    parts.push(`Key topics: ${paper.topics.slice(0, 4).join(', ')}.`);
  }

  if (paper.methodology) {
    const methodSentences = paper.methodology.split(/[.!?]\s+/).filter((s) => s.trim().length > 0);
    if (methodSentences.length > 0) {
      parts.push(`Methodology: ${methodSentences[0].trim()}.`);
    }
  }

  return parts.join(' ').trim();
}

// ─── Main Export: Extract Paper from PDF ──────────────────────────────────────

export async function extractPaperFromPDF(file: File): Promise<ExtractedPaper> {
  try {
    const fullText = await extractTextFromPDF(file);
    const sections = parseSections(fullText);
    const title = extractTitle(fullText);
    const keywords = extractKeywords(fullText);
    const topics = detectTopics(fullText, keywords);
    const researchFocus = generateResearchFocus({
      title,
      abstract: sections.abstract,
      methodology: sections.methodology,
      results: sections.results,
      keywords,
      topics,
    });

    return {
      id: generateId(),
      fileName: file.name,
      title,
      abstract: sections.abstract,
      methodology: sections.methodology,
      results: sections.results,
      limitations: sections.limitations,
      conclusion: sections.conclusion,
      fullText,
      keywords,
      topics,
      researchFocus,
      uploadedAt: Date.now(),
      source: 'pdf',
    };
  } catch (error) {
    throw new Error(
      `Failed to extract paper from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ─── Main Export: Extract Paper from Text ─────────────────────────────────────

export function extractPaperFromText(title: string, fullText: string): ExtractedPaper {
  try {
    const sections = parseSections(fullText);
    const keywords = extractKeywords(fullText);
    const topics = detectTopics(fullText, keywords);
    const researchFocus = generateResearchFocus({
      title,
      abstract: sections.abstract,
      methodology: sections.methodology,
      results: sections.results,
      keywords,
      topics,
    });

    return {
      id: generateId(),
      fileName: '',
      title,
      abstract: sections.abstract,
      methodology: sections.methodology,
      results: sections.results,
      limitations: sections.limitations,
      conclusion: sections.conclusion,
      fullText,
      keywords,
      topics,
      researchFocus,
      uploadedAt: Date.now(),
      source: 'link',
    };
  } catch (error) {
    throw new Error(
      `Failed to extract paper from text: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
