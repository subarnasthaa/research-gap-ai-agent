import { generateId } from './utils-uuid';
import type { ExtractedPaper, ResearchGap, GapType } from './types';

// ─── Limitation Phrase Patterns ─────────────────────────────────────────────
// Each pattern maps to a preferred GapType and a base severity weight (1-10).
const LIMITATION_PATTERNS: Array<{
  pattern: RegExp;
  gapType: GapType;
  baseSeverity: number;
  noveltyHint: number; // 0-100 base novelty for this category
  label: string;
}> = [
  {
    pattern: /this study is limited\s+to\b/i,
    gapType: 'limited_scope',
    baseSeverity: 7,
    noveltyHint: 55,
    label: 'Study scope limitation',
  },
  {
    pattern: /limited\s+to\s+(?:a\s+)?(?:single|one|only|small|specific)\b/i,
    gapType: 'limited_scope',
    baseSeverity: 7,
    noveltyHint: 50,
    label: 'Limited scope',
  },
  {
    pattern: /small\s+sample/i,
    gapType: 'small_sample_size',
    baseSeverity: 8,
    noveltyHint: 45,
    label: 'Small sample size',
  },
  {
    pattern: /limited\s+data/i,
    gapType: 'small_sample_size',
    baseSeverity: 7,
    noveltyHint: 50,
    label: 'Limited data',
  },
  {
    pattern: /lack\s+of\b/i,
    gapType: 'missing_dataset',
    baseSeverity: 7,
    noveltyHint: 60,
    label: 'Lack of resource',
  },
  {
    pattern: /insufficient\s+(?:data|samples|evidence|coverage)/i,
    gapType: 'small_sample_size',
    baseSeverity: 7,
    noveltyHint: 50,
    label: 'Insufficient data',
  },
  {
    pattern: /not\s+(?:addressed|investigated|explored|evaluated|assessed|considered|examined|studied)\b/i,
    gapType: 'missing_edge_case',
    baseSeverity: 7,
    noveltyHint: 65,
    label: 'Unaddressed aspect',
  },
  {
    pattern: /was\s+not\s+assessed/i,
    gapType: 'missing_edge_case',
    baseSeverity: 6,
    noveltyHint: 60,
    label: 'Not assessed',
  },
  {
    pattern: /we\s+did\s+not\b/i,
    gapType: 'limited_scope',
    baseSeverity: 6,
    noveltyHint: 55,
    label: 'Self-acknowledged omission',
  },
  {
    pattern: /beyond\s+the\s+scope/i,
    gapType: 'limited_scope',
    baseSeverity: 5,
    noveltyHint: 50,
    label: 'Beyond scope',
  },
  {
    pattern: /remains?\s+unclear/i,
    gapType: 'missing_edge_case',
    baseSeverity: 7,
    noveltyHint: 70,
    label: 'Unclear aspect',
  },
  {
    pattern: /further\s+investigation/i,
    gapType: 'missing_edge_case',
    baseSeverity: 6,
    noveltyHint: 60,
    label: 'Needs further investigation',
  },
  {
    pattern: /future\s+(?:work|research|studies|investigations)/i,
    gapType: 'missing_edge_case',
    baseSeverity: 5,
    noveltyHint: 55,
    label: 'Future work suggested',
  },
  {
    pattern: /needs?\s+to\s+be\s+investigated/i,
    gapType: 'missing_edge_case',
    baseSeverity: 7,
    noveltyHint: 65,
    label: 'Needs investigation',
  },
  {
    pattern: /however,?\s+(?:our|the|this)\s+(?:study|analysis|approach|method|work)/i,
    gapType: 'limited_scope',
    baseSeverity: 6,
    noveltyHint: 55,
    label: 'Self-identified caveat',
  },
  {
    pattern: /however\b/i,
    gapType: 'limited_scope',
    baseSeverity: 4,
    noveltyHint: 40,
    label: 'Contrasting limitation',
  },
];

// ─── Helper Utilities ────────────────────────────────────────────────────────

/** Extract the sentence containing the match from text. */
function extractSentence(text: string, matchIndex: number, matchLength: number): string {
  // Walk backwards to find start of sentence
  let start = matchIndex;
  while (start > 0 && text[start - 1] !== '.' && text[start - 1] !== '!' && text[start - 1] !== '?') {
    start--;
  }
  // Walk forward to find end of sentence
  let end = matchIndex + matchLength;
  while (end < text.length && text[end] !== '.' && text[end] !== '!' && text[end] !== '?') {
    end++;
  }
  if (end < text.length) end++; // include the terminal punctuation
  return text.slice(start, end).trim();
}

/** Compute a rough keyword-overlap Jaccard similarity between two string arrays. */
function keywordSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map((k) => k.toLowerCase()));
  const setB = new Set(b.map((k) => k.toLowerCase()));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  Array.from(setA).forEach((k) => {
    if (setB.has(k)) intersection++;
  });
  const union = new Set(Array.from(setA).concat(Array.from(setB))).size;
  return union === 0 ? 0 : intersection / union;
}

/** Extract potential domain/topic words from a paper's metadata. */
function extractDomainSignals(paper: ExtractedPaper): string[] {
  const tokens: string[] = [];
  const sources = [paper.researchFocus, paper.abstract, paper.methodology, paper.conclusion];
  for (const src of sources) {
    if (!src) continue;
    // Grab capitalized multi-word phrases and individual keywords
    const matches = src.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (matches) tokens.push(...matches);
  }
  tokens.push(...paper.keywords, ...paper.topics);
  // Deduplicate and lowercase
  return Array.from(new Set(tokens.map((t) => t.toLowerCase())));
}

/** Detect dataset mentions in text. */
function extractDatasetMentions(text: string): string[] {
  // Common dataset patterns
  const patterns = [
    /\b([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)\s+dataset\b/gi,
    /\bon\s+(?:the\s+)?([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)\b/g,
    /\b(?:dataset|benchmark|corpus)\s*(?:of|:)?\s*([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)\b/gi,
    /\b([A-Z]{2,}(?:-[A-Za-z0-9]+)*)\b/g, // Acronyms like GLUE, SQuAD, MNIST
  ];

  const knownDatasets = new Set([
    'MNIST', 'CIFAR-10', 'CIFAR-100', 'ImageNet', 'COCO', 'Pascal', 'VOC',
    'SQuAD', 'GLUE', 'SuperGLUE', 'SNLI', 'MNLI', 'QQP', 'QNL', 'RTE',
    'SST', 'SST-2', 'CoLA', 'STS-B', 'MRPC', 'WNLI',
    'PTB', 'WikiText', 'Penn', 'Treebank', 'LAMBADA',
    'LibriSpeech', 'VoxCeleb', 'TIMIT',
    'UCI', 'KDD', 'Adult', 'Census',
    'MIMIC', 'PhysioNet', 'UKBiobank',
    'NYU', 'MIT', 'Stanford',
    'GOV.UK', 'EuroParl', 'WMT',
    'OpenWebText', 'CommonCrawl', 'ThePile',
    'LAION', 'ADE20K', 'Cityscapes', 'KITTI',
    'CelebA', 'LFW', 'CASIA',
    'CUSTOM',
  ]);

  const mentions = new Set<string>();
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const candidate = match[1];
      if (candidate && candidate.length >= 2 && candidate.length <= 30) {
        mentions.add(candidate);
      }
    }
  }

  // Also check known datasets by name
  Array.from(knownDatasets).forEach((ds) => {
    if (text.toLowerCase().includes(ds.toLowerCase())) {
      mentions.add(ds);
    }
  });

  return Array.from(mentions);
}

/** Detect methodology-related terms. */
function extractMethodologyTerms(text: string): string[] {
  const methodPatterns = [
    /\b(?:CNN|RNN|LSTM|GRU|Transformer|BERT|GPT|GAN|VAE|Autoencoder|ResNet|VGG|EfficientNet|ViT|DeiT|Swin|YOLO|SSD|Faster\s+R-CNN|Mask\s+R-CNN|U-Net|BART|T5|RoBERTa|XLNet|ALBERT|DistilBERT|ELECTRA|DeBERTa)\b/gi,
    /\b(?:random\s+forest|decision\s+tree|SVM|support\s+vector|k-nearest|KNN|logistic\s+regression|linear\s+regression|gradient\s+boosting|XGBoost|AdaBoost|naive\s+bayes|bayesian|ensemble)\b/gi,
    /\b(?:reinforcement\s+learning|Q-learning|policy\s+gradient|actor-critic|PPO|DQN|A3C|SAC|TD3|DDPG)\b/gi,
    /\b(?:transfer\s+learning|fine-?tun|pre-?train|domain\s+adapt|multi-?task|meta-?learning|few-?shot|zero-?shot|self-?supervised|semi-?supervised|unsupervised|supervised)\b/gi,
    /\b(?:cross-?validation|k-?fold|bootstrap|ablation|hyperparameter|grid\s+search|random\s+search|bayesian\s+optimization)\b/gi,
    /\b(?:qualitative|quantitative|mixed\s+method|survey|interview|case\s+study|experiment|simulation|longitudinal|cross-?sectional)\b/gi,
  ];

  const terms = new Set<string>();
  for (const pattern of methodPatterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      terms.add(match[0].toLowerCase().replace(/\s+/g, ' '));
    }
  }

  return Array.from(terms);
}

/** Detect size indicators in text. */
function detectSizeIndicators(text: string): { isSmall: boolean; details: string } {
  const smallPatterns = [
    { pattern: /\b(\d+)\s*(?:participants?|subjects?|patients?|samples?|instances?|examples?|records?|data\s*points?)\b/gi, threshold: 100 },
    { pattern: /small\s+sample/i, isSmall: true },
    { pattern: /limited\s+(?:data|dataset|sample)/i, isSmall: true },
    { pattern: /underpowered/i, isSmall: true },
  ];

  for (const sp of smallPatterns) {
    if ('isSmall' in sp && sp.isSmall) {
      const match = text.match(sp.pattern);
      if (match) return { isSmall: true, details: match[0] };
    }
    if ('threshold' in sp) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(sp.pattern.source, sp.pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (num < sp.threshold) {
          return { isSmall: true, details: `Sample size of ${num} may be insufficient` };
        }
      }
    }
  }

  return { isSmall: false, details: '' };
}

/** Detect whether a paper uses real-world data. */
function usesRealWorldData(paper: ExtractedPaper): boolean {
  const realWorldSignals = [
    /\breal[- ]?world\b/i,
    /\bproduction\b/i,
    /\bdeploy(ed|ment)\b/i,
    /\bindustry\b/i,
    /\bclinical\b/i,
    /\bonline\s+(?:evaluation|testing|experiment)\b/i,
    /\blive\b/i,
    /\bfield\s+study\b/i,
  ];

  const syntheticSignals = [
    /\bsynthetic\b/i,
    /\bsimulated?\b/i,
    /\bartificial\b/i,
    /\bmock\b/i,
    /\btoy\s+(?:dataset|example|problem)\b/i,
  ];

  const text = `${paper.abstract} ${paper.methodology} ${paper.results} ${paper.limitations} ${paper.conclusion}`;

  let realScore = 0;
  let synthScore = 0;

  for (const p of realWorldSignals) {
    if (p.test(text)) realScore++;
  }
  for (const p of syntheticSignals) {
    if (p.test(text)) synthScore++;
  }

  return realScore > synthScore;
}

/** Detect if paper mentions scalability. */
function hasScalabilityConcern(paper: ExtractedPaper): boolean {
  const text = `${paper.abstract} ${paper.methodology} ${paper.limitations} ${paper.conclusion}`;
  const patterns = [
    /\bscalab/i,
    /\bcomputational\s+(?:cost|expense|overhead|burden)/i,
    /\btime\s+complexity/i,
    /\bspace\s+complexity/i,
    /\bO\(n[²³^]/i,
    /\bexponential/i,
    /\bdoes\s+not\s+scale/i,
    /\bcannot\s+scale/i,
    /\blarge[- ]scale\b/i,
    /\bbottleneck/i,
    /\bresource[- ]intensive/i,
  ];
  return patterns.some((p) => p.test(text));
}

/** Detect if paper mentions reproducibility. */
function hasReproducibilityConcern(paper: ExtractedPaper): boolean {
  const text = `${paper.abstract} ${paper.methodology} ${paper.limitations} ${paper.conclusion}`;
  const patterns = [
    /\breproducib/i,
    /\breproducib/i,
    /\breplicat/i,
    /\bcode\s+(?:is\s+)?(?:not\s+)?available/i,
    /\bopen[- ]?source/i,
    /\bimplementation\s+details\s+(?:not|are\s+missing)/i,
    /\bhyperparameter(?:s)?\s+(?:not|are\s+)?(?:specified|reported|disclosed)/i,
  ];
  return patterns.some((p) => p.test(text));
}

/** Detect if paper mentions ethical concerns. */
function hasEthicalConcern(paper: ExtractedPaper): boolean {
  const text = `${paper.abstract} ${paper.methodology} ${paper.limitations} ${paper.conclusion}`;
  const patterns = [
    /\bethic/i,
    /\bbias/i,
    /\bfairness/i,
    /\bprivacy/i,
    /\bconsent/i,
    /\bIRB\b/i,
    /\binstitutional\s+review/i,
    /\bhuman\s+subjects/i,
    /\banonymiz/i,
    /\bde-identif/i,
    /\bdiscriminat/i,
  ];
  return patterns.some((p) => p.test(text));
}

// ─── Core Detection Functions ────────────────────────────────────────────────

/**
 * Scans paper text for limitation-indicating phrases and creates ResearchGaps
 * for each detected limitation.
 */
export function detectLimitations(papers: ExtractedPaper[]): ResearchGap[] {
  const gaps: ResearchGap[] = [];
  const seenDescriptions = new Set<string>();

  for (const paper of papers) {
    const searchableText = [
      paper.abstract,
      paper.limitations,
      paper.conclusion,
      paper.methodology,
      paper.results,
    ]
      .filter(Boolean)
      .join('\n\n');

    for (const lp of LIMITATION_PATTERNS) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(lp.pattern.source, lp.pattern.flags);
      while ((match = regex.exec(searchableText)) !== null) {
        const sentence = extractSentence(searchableText, match.index, match[0].length);
        if (!sentence || sentence.length < 10) continue;

        // Deduplicate by description within this function
        const dedupeKey = `${lp.gapType}:${sentence.slice(0, 80)}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        const affectedPapers = [paper.id];
        const affectedPaperTitles = [paper.title];

        // Check if other papers mention the same limitation
        for (const other of papers) {
          if (other.id === paper.id) continue;
          const otherText = [other.abstract, other.limitations, other.conclusion, other.methodology, other.results]
            .filter(Boolean)
            .join('\n\n');
          const otherRegex = new RegExp(lp.pattern.source, lp.pattern.flags);
          if (otherRegex.test(otherText)) {
            affectedPapers.push(other.id);
            affectedPaperTitles.push(other.title);
          }
        }

        // Adjust severity: more affected papers = higher severity
        const severityAdjust = Math.min(affectedPapers.length - 1, 3);
        const severityScore = Math.min(10, lp.baseSeverity + severityAdjust);

        // Adjust novelty: if many papers share this limitation, novelty increases
        // because it represents a systemic gap
        const noveltyAdjust = Math.min(affectedPapers.length * 5, 20);
        const noveltyScore = Math.min(100, lp.noveltyHint + noveltyAdjust);

        gaps.push({
          id: generateId(),
          description: `${lp.label}: ${sentence.length > 120 ? sentence.slice(0, 117) + '...' : sentence}`,
          gapType: lp.gapType,
          affectedPapers,
          affectedPaperTitles,
          severityScore,
          noveltyScore,
          explanation: `The phrase "${match[0]}" indicates a recognized limitation in the research. This type of gap (${lp.label}) was identified across ${affectedPapers.length} paper(s) and suggests an area where further work is needed.`,
          whyItIsAGap: `The authors explicitly acknowledge this limitation, meaning the research does not fully address the problem space. Addressing this gap would strengthen the evidence base and potentially open new research directions.`,
          supportingEvidence: [sentence],
        });
      }
    }

    // ── Additional structural checks per paper ──

    // Small sample size detection
    const sizeCheck = detectSizeIndicators(searchableText);
    if (sizeCheck.isSmall) {
      const dedupeKey = `small_sample:${paper.id}`;
      if (!seenDescriptions.has(dedupeKey)) {
        seenDescriptions.add(dedupeKey);
        gaps.push({
          id: generateId(),
          description: `Potential small sample size in "${paper.title}"`,
          gapType: 'small_sample_size',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 7,
          noveltyScore: 45,
          explanation: `The study appears to use a limited sample size, which can affect statistical power and generalizability. ${sizeCheck.details}`,
          whyItIsAGap: 'Small sample sizes reduce the reliability and generalizability of findings. Larger or more diverse samples are needed to validate the results.',
          supportingEvidence: [sizeCheck.details],
        });
      }
    }

    // No real-world validation
    if (!usesRealWorldData(paper)) {
      const dedupeKey = `no_real_world:${paper.id}`;
      if (!seenDescriptions.has(dedupeKey)) {
        seenDescriptions.add(dedupeKey);
        gaps.push({
          id: generateId(),
          description: `No real-world validation found in "${paper.title}"`,
          gapType: 'no_real_world_validation',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 7,
          noveltyScore: 55,
          explanation: `The paper does not appear to validate its approach on real-world data or in practical deployment scenarios.`,
          whyItIsAGap: 'Without real-world validation, it is unclear whether the proposed approach would perform reliably outside controlled experimental settings. This limits practical applicability.',
          supportingEvidence: ['No mentions of real-world, production, clinical, or deployment-based evaluation were found in the paper.'],
        });
      }
    }

    // Scalability limitation
    if (hasScalabilityConcern(paper)) {
      const dedupeKey = `scalability:${paper.id}`;
      if (!seenDescriptions.has(dedupeKey)) {
        seenDescriptions.add(dedupeKey);
        gaps.push({
          id: generateId(),
          description: `Scalability concerns in "${paper.title}"`,
          gapType: 'scalability_limitation',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 7,
          noveltyScore: 60,
          explanation: 'The paper mentions or implies scalability limitations in its approach.',
          whyItIsAGap: 'Scalability limitations restrict the practical applicability of the method to larger, more complex, or real-world settings where data volume and computational demands are higher.',
          supportingEvidence: ['Scalability-related terms were detected in the paper text.'],
        });
      }
    }

    // Reproducibility concerns
    if (hasReproducibilityConcern(paper)) {
      const dedupeKey = `reproducibility:${paper.id}`;
      if (!seenDescriptions.has(dedupeKey)) {
        seenDescriptions.add(dedupeKey);
        gaps.push({
          id: generateId(),
          description: `Reproducibility concerns in "${paper.title}"`,
          gapType: 'reproducibility_issue',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 6,
          noveltyScore: 40,
          explanation: 'The paper has potential reproducibility issues, such as missing implementation details or unreleased code.',
          whyItIsAGap: 'Reproducibility is fundamental to scientific progress. Without it, results cannot be independently verified, and building upon the work becomes difficult.',
          supportingEvidence: ['Reproducibility-related terms were detected in the paper text.'],
        });
      }
    }

    // Ethical concerns
    if (hasEthicalConcern(paper)) {
      const dedupeKey = `ethical:${paper.id}`;
      if (!seenDescriptions.has(dedupeKey)) {
        seenDescriptions.add(dedupeKey);
        gaps.push({
          id: generateId(),
          description: `Ethical considerations in "${paper.title}"`,
          gapType: 'ethical_concern',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 8,
          noveltyScore: 50,
          explanation: 'The paper raises or involves ethical considerations that may not be fully addressed.',
          whyItIsAGap: 'Ethical gaps can undermine trust and applicability of research. Thorough ethical analysis and mitigation strategies are needed before deployment.',
          supportingEvidence: ['Ethics-related terms were detected in the paper text.'],
        });
      }
    }
  }

  return gaps;
}

/**
 * Compares methodologies across papers and detects gaps:
 * - Different approaches for the same problem
 * - Missing methodologies (e.g., no ablation, no baselines)
 * - Outdated methods still in use
 */
export function detectMethodologyGaps(papers: ExtractedPaper[]): ResearchGap[] {
  if (papers.length < 2) return [];

  const gaps: ResearchGap[] = [];
  const seenDescriptions = new Set<string>();

  // Collect all methodology terms per paper
  const paperMethods = papers.map((p) => ({
    paper: p,
    methods: extractMethodologyTerms(`${p.methodology} ${p.abstract} ${p.results} ${p.conclusion}`),
  }));

  // ── Detect different approaches for the same problem ──
  // Group papers by topic overlap
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const a = papers[i];
      const b = papers[j];

      // Check topic overlap
      const similarity = keywordSimilarity(
        [...a.keywords, ...a.topics, a.researchFocus].filter(Boolean),
        [...b.keywords, ...b.topics, b.researchFocus].filter(Boolean)
      );

      if (similarity < 0.2) continue; // Not related enough

      const methodsA = paperMethods[i].methods;
      const methodsB = paperMethods[j].methods;

      // Find methods unique to each paper
      const onlyInA = methodsA.filter((m) => !methodsB.includes(m));
      const onlyInB = methodsB.filter((m) => !methodsA.includes(m));

      if (onlyInA.length > 0 && onlyInB.length > 0 && similarity >= 0.3) {
        // Same topic, different methods => methodology gap
        const dedupeKey = `method_diff:${[a.id, b.id].sort().join(':')}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        gaps.push({
          id: generateId(),
          description: `Divergent methodologies for related problems: "${a.title}" vs "${b.title}"`,
          gapType: 'methodology_gap',
          affectedPapers: [a.id, b.id],
          affectedPaperTitles: [a.title, b.title],
          severityScore: 6,
          noveltyScore: 70,
          explanation: `Two papers addressing related topics use different methodological approaches. "${a.title}" uses ${onlyInA.slice(0, 3).join(', ')}, while "${b.title}" uses ${onlyInB.slice(0, 3).join(', ')}. This divergence suggests no consensus on the best methodology.`,
          whyItIsAGap: 'When different methodologies are applied to similar problems without direct comparison, it is unclear which approach is superior. A systematic comparison or combination of methods could yield better results.',
          supportingEvidence: [
            `"${a.title}" uses: ${onlyInA.slice(0, 5).join(', ')}`,
            `"${b.title}" uses: ${onlyInB.slice(0, 5).join(', ')}`,
          ],
        });
      }
    }
  }

  // ── Detect missing methodological components ──
  const allMethodTerms = new Set<string>();
  for (const pm of paperMethods) {
    pm.methods.forEach((m) => allMethodTerms.add(m));
  }

  // Check for common missing components
  const criticalMethodComponents = [
    {
      term: 'ablation',
      label: 'ablation study',
      gapType: 'methodology_gap' as GapType,
      severity: 6,
      novelty: 55,
      description: 'No ablation study found across the papers, making it hard to understand individual component contributions.',
    },
    {
      term: 'baseline',
      label: 'baseline comparison',
      gapType: 'methodology_gap' as GapType,
      severity: 7,
      novelty: 40,
      description: 'Missing baseline comparisons make it difficult to assess relative performance improvements.',
    },
    {
      term: 'cross-validation',
      label: 'cross-validation',
      gapType: 'reproducibility_issue' as GapType,
      severity: 5,
      novelty: 35,
      description: 'Lack of cross-validation raises concerns about result stability and generalizability.',
    },
    {
      term: 'statistical',
      label: 'statistical significance testing',
      gapType: 'methodology_gap' as GapType,
      severity: 6,
      novelty: 40,
      description: 'Absence of statistical significance testing makes it hard to determine if results are meaningful.',
    },
    {
      term: 'hyperparameter',
      label: 'hyperparameter analysis',
      gapType: 'reproducibility_issue' as GapType,
      severity: 5,
      novelty: 35,
      description: 'Missing hyperparameter analysis reduces reproducibility and understanding of model sensitivity.',
    },
  ];

  for (const component of criticalMethodComponents) {
    const papersWithComponent = paperMethods.filter((pm) =>
      pm.methods.some((m) => m.includes(component.term))
    );

    if (papersWithComponent.length === 0 && papers.length >= 2) {
      const dedupeKey = `missing_method:${component.term}`;
      if (seenDescriptions.has(dedupeKey)) continue;
      seenDescriptions.add(dedupeKey);

      gaps.push({
        id: generateId(),
        description: `Missing ${component.label} across all papers`,
        gapType: component.gapType,
        affectedPapers: papers.map((p) => p.id),
        affectedPaperTitles: papers.map((p) => p.title),
        severityScore: component.severity,
        noveltyScore: component.novelty,
        explanation: component.description,
        whyItIsAGap: `None of the analyzed papers include a ${component.label}. This is a methodological gap that affects the validity and interpretability of the results across the field.`,
        supportingEvidence: [
          `No mention of "${component.term}" was found in any of the ${papers.length} papers analyzed.`,
        ],
      });
    }
  }

  // ── Detect outdated methods ──
  const outdatedPatterns: Array<{ pattern: RegExp; label: string; newer: string }> = [
    { pattern: /\bRNN\b(?!.*LSTM)(?!.*GRU)/i, label: 'vanilla RNN', newer: 'LSTM, GRU, or Transformer' },
    { pattern: /\bSVM\b/i, label: 'SVM', newer: 'deep learning or ensemble methods' },
    { pattern: /\blogistic\s+regression\b(?!.*deep)(?!.*neural)/i, label: 'logistic regression', newer: 'neural network-based approaches' },
    { pattern: /\bVGG\b/i, label: 'VGG network', newer: 'ResNet, EfficientNet, or Vision Transformer' },
    { pattern: /\bAlexNet\b/i, label: 'AlexNet', newer: 'modern CNNs or Vision Transformers' },
  ];

  for (const paper of papers) {
    const methodText = `${paper.methodology} ${paper.abstract}`;
    for (const outdated of outdatedPatterns) {
      if (outdated.pattern.test(methodText)) {
        const dedupeKey = `outdated:${paper.id}:${outdated.label}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        gaps.push({
          id: generateId(),
          description: `Use of outdated method "${outdated.label}" in "${paper.title}"`,
          gapType: 'outdated_method',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 5,
          noveltyScore: 65,
          explanation: `The paper uses ${outdated.label}, which has been largely superseded by ${outdated.newer}. Using more modern approaches could yield improved performance.`,
          whyItIsAGap: `Outdated methods may not leverage recent advances, leaving potential performance gains on the table. Updating the methodology to ${outdated.newer} could significantly improve results.`,
          supportingEvidence: [`The paper uses ${outdated.label} while ${outdated.newer} are now standard.`],
        });
      }
    }
  }

  return gaps;
}

/**
 * Detects dataset-related gaps:
 * - Different datasets used for the same problem
 * - Limited datasets (small, single-domain, synthetic only)
 * - No real-world data testing
 * - Outdated benchmark datasets
 */
export function detectDatasetGaps(papers: ExtractedPaper[]): ResearchGap[] {
  if (papers.length < 1) return [];

  const gaps: ResearchGap[] = [];
  const seenDescriptions = new Set<string>();

  // Collect dataset mentions per paper
  const paperDatasets = papers.map((p) => ({
    paper: p,
    datasets: extractDatasetMentions(`${p.abstract} ${p.methodology} ${p.results} ${p.conclusion}`),
    usesRealWorld: usesRealWorldData(p),
    hasSmallSample: detectSizeIndicators(`${p.abstract} ${p.methodology} ${p.results}`).isSmall,
  }));

  // ── Detect when papers use different datasets for similar problems ──
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const a = paperDatasets[i];
      const b = paperDatasets[j];

      const similarity = keywordSimilarity(
        [...a.paper.keywords, ...a.paper.topics, a.paper.researchFocus].filter(Boolean),
        [...b.paper.keywords, ...b.paper.topics, b.paper.researchFocus].filter(Boolean)
      );

      if (similarity < 0.25) continue;

      const commonDatasets = a.datasets.filter((d) =>
        b.datasets.some((dd) => dd.toLowerCase() === d.toLowerCase())
      );
      const uniqueToA = a.datasets.filter(
        (d) => !b.datasets.some((dd) => dd.toLowerCase() === d.toLowerCase())
      );
      const uniqueToB = b.datasets.filter(
        (d) => !a.datasets.some((dd) => dd.toLowerCase() === d.toLowerCase())
      );

      // Related topics but no common datasets
      if (commonDatasets.length === 0 && uniqueToA.length > 0 && uniqueToB.length > 0) {
        const dedupeKey = `dataset_diff:${[a.paper.id, b.paper.id].sort().join(':')}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        gaps.push({
          id: generateId(),
          description: `Related papers use different datasets: "${a.paper.title}" vs "${b.paper.title}"`,
          gapType: 'missing_dataset',
          affectedPapers: [a.paper.id, b.paper.id],
          affectedPaperTitles: [a.paper.title, b.paper.title],
          severityScore: 6,
          noveltyScore: 65,
          explanation: `Two papers addressing related topics use entirely different datasets (${uniqueToA.slice(0, 3).join(', ')} vs ${uniqueToB.slice(0, 3).join(', ')}), making direct comparison impossible.`,
          whyItIsAGap: 'When related work uses different datasets, results are not directly comparable. A unified evaluation on common benchmarks would enable fair comparison and reveal true methodological advantages.',
          supportingEvidence: [
            `"${a.paper.title}" uses: ${uniqueToA.slice(0, 5).join(', ') || 'unspecified'}`,
            `"${b.paper.title}" uses: ${uniqueToB.slice(0, 5).join(', ') || 'unspecified'}`,
          ],
        });
      }
    }
  }

  // ── Detect papers that only use synthetic data ──
  const papersWithNoRealWorld = paperDatasets.filter((pd) => !pd.usesRealWorld);
  if (papersWithNoRealWorld.length === papers.length && papers.length >= 2) {
    const dedupeKey = 'no_real_world_all';
    if (!seenDescriptions.has(dedupeKey)) {
      seenDescriptions.add(dedupeKey);
      gaps.push({
        id: generateId(),
        description: 'No paper validates on real-world data',
        gapType: 'no_real_world_validation',
        affectedPapers: papers.map((p) => p.id),
        affectedPaperTitles: papers.map((p) => p.title),
        severityScore: 8,
        noveltyScore: 60,
        explanation: `None of the ${papers.length} analyzed papers include real-world validation. All evaluations appear to be conducted on controlled or synthetic settings.`,
        whyItIsAGap: 'Without real-world validation, it is uncertain whether proposed methods will perform reliably in practical applications. This is a critical gap for translating research into practice.',
        supportingEvidence: papers.map((p) => `"${p.title}" does not appear to use real-world data`),
      });
    }
  }

  // ── Detect limited/single-domain datasets ──
  const singleDomainPatterns = [
    /\bsingle[- ]domain\b/i,
    /\bonly\s+(?:tested|evaluated|assessed)\s+on\s+(?:one|a\s+single)\b/i,
    /\bspecific\s+domain\b/i,
    /\bsame\s+domain\b/i,
  ];

  for (const paper of papers) {
    const text = `${paper.abstract} ${paper.methodology} ${paper.limitations}`;
    for (const pattern of singleDomainPatterns) {
      if (pattern.test(text)) {
        const dedupeKey = `single_domain:${paper.id}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        gaps.push({
          id: generateId(),
          description: `Single-domain evaluation in "${paper.title}"`,
          gapType: 'limited_scope',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 6,
          noveltyScore: 55,
          explanation: 'The paper evaluates its approach only on a single domain, limiting the generalizability of its conclusions.',
          whyItIsAGap: 'Single-domain evaluation cannot demonstrate that the approach generalizes across different contexts. Cross-domain evaluation is needed to establish broader applicability.',
          supportingEvidence: [text.match(pattern)![0]],
        });
        break; // One gap per paper for this pattern
      }
    }
  }

  // ── Detect outdated benchmark usage ──
  const outdatedBenchmarks: Array<{ name: RegExp; newer: string }> = [
    { name: /\bMNIST\b/i, newer: 'Fashion-MNIST, CIFAR-10/100, or ImageNet' },
    { name: /\bPTB\b(?!.*WikiText)/i, newer: 'WikiText-103 or larger language modeling benchmarks' },
    { name: /\bSST(?:-1)?\b(?!.*SST-2)/i, newer: 'SST-2 or more comprehensive sentiment benchmarks' },
    { name: /\bVGG\b/i, newer: 'modern architectures and benchmarks' },
  ];

  for (const paper of papers) {
    const text = `${paper.abstract} ${paper.methodology} ${paper.results}`;
    for (const benchmark of outdatedBenchmarks) {
      if (benchmark.name.test(text)) {
        const dedupeKey = `outdated_bench:${paper.id}:${benchmark.name.source}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        gaps.push({
          id: generateId(),
          description: `Use of outdated benchmark in "${paper.title}"`,
          gapType: 'outdated_method',
          affectedPapers: [paper.id],
          affectedPaperTitles: [paper.title],
          severityScore: 4,
          noveltyScore: 50,
          explanation: `The paper uses an outdated benchmark dataset. More challenging and current benchmarks such as ${benchmark.newer} are now available and would better demonstrate the method's capabilities.`,
          whyItIsAGap: 'Outdated benchmarks may not reflect current challenges in the field, potentially inflating performance metrics and limiting the relevance of results.',
          supportingEvidence: [`Outdated benchmark detected; consider ${benchmark.newer}.`],
        });
      }
    }
  }

  // ── Detect missing dataset coverage across the corpus ──
  const allDatasetMentions = new Set<string>();
  for (const pd of paperDatasets) {
    pd.datasets.forEach((d) => allDatasetMentions.add(d.toLowerCase()));
  }

  // If very few datasets are mentioned across all papers, flag it
  if (allDatasetMentions.size <= 1 && papers.length >= 2) {
    const dedupeKey = 'few_datasets_corpus';
    if (!seenDescriptions.has(dedupeKey)) {
      seenDescriptions.add(dedupeKey);
      gaps.push({
        id: generateId(),
        description: 'Very limited dataset coverage across analyzed papers',
        gapType: 'missing_dataset',
        affectedPapers: papers.map((p) => p.id),
        affectedPaperTitles: papers.map((p) => p.title),
        severityScore: 7,
        noveltyScore: 55,
        explanation: `Across ${papers.length} papers, only ${allDatasetMentions.size} dataset(s) were identified. This severely limits the breadth of evaluation and makes it difficult to draw generalizable conclusions.`,
        whyItIsAGap: 'Limited dataset coverage means results may not generalize. Testing on a broader range of datasets is essential for robust conclusions.',
        supportingEvidence: [`Only ${allDatasetMentions.size} dataset(s) found across ${papers.length} papers.`],
      });
    }
  }

  return gaps;
}

/**
 * Finds contradictory claims between papers:
 * - Opposing results on the same topic
 * - Different conclusions about the same approach
 * - Conflicting findings
 */
export function detectConflicts(papers: ExtractedPaper[]): ResearchGap[] {
  if (papers.length < 2) return [];

  const gaps: ResearchGap[] = [];
  const seenDescriptions = new Set<string>();

  // Conflict-indicating patterns in results
  const conflictResultPatterns = [
    { pattern: /\b(outperform|superior|better\s+than|exceeds?)\b/i, positive: true },
    { pattern: /\b(underperform|inferior|worse\s+than|falls?\s+short)\b/i, positive: false },
    { pattern: /\b(significant(?:ly)?\s+improvement)\b/i, positive: true },
    { pattern: /\b(no\s+significant\s+(?:improvement|difference))\b/i, positive: false },
    { pattern: /\b(achieves?\s+(?:state-of-the-art|SOTA|best))\b/i, positive: true },
    { pattern: /\b(fails?\s+to|unable\s+to|does\s+not\s+(?:improve|outperform))\b/i, positive: false },
  ];

  // Build paper profiles with result sentiment and topics
  const paperProfiles = papers.map((p) => {
    const text = `${p.abstract} ${p.results} ${p.conclusion}`;
    const positiveSignals: string[] = [];
    const negativeSignals: string[] = [];

    for (const cp of conflictResultPatterns) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(cp.pattern.source, cp.pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        if (cp.positive) {
          positiveSignals.push(match[0]);
        } else {
          negativeSignals.push(match[0]);
        }
      }
    }

    return {
      paper: p,
      positiveSignals,
      negativeSignals,
      topics: [...p.keywords, ...p.topics, p.researchFocus].filter(Boolean).map((t) => t.toLowerCase()),
    };
  });

  // Compare pairs for conflicts
  for (let i = 0; i < paperProfiles.length; i++) {
    for (let j = i + 1; j < paperProfiles.length; j++) {
      const a = paperProfiles[i];
      const b = paperProfiles[j];

      // Check topic overlap
      const similarity = keywordSimilarity(
        a.topics,
        b.topics
      );

      if (similarity < 0.15) continue; // Not related enough

      // Check for conflicting sentiments
      const aHasPositive = a.positiveSignals.length > 0;
      const aHasNegative = a.negativeSignals.length > 0;
      const bHasPositive = b.positiveSignals.length > 0;
      const bHasNegative = b.negativeSignals.length > 0;

      // One paper is positive, other is negative about related topics
      if (
        ((aHasPositive && bHasNegative) || (aHasNegative && bHasPositive)) &&
        similarity >= 0.2
      ) {
        const dedupeKey = `conflict:${[a.paper.id, b.paper.id].sort().join(':')}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        const positivePaper = aHasPositive && bHasNegative ? a : b;
        const negativePaper = aHasPositive && bHasNegative ? b : a;

        gaps.push({
          id: generateId(),
          description: `Conflicting results between "${positivePaper.paper.title}" and "${negativePaper.paper.title}"`,
          gapType: 'conflicting_results',
          affectedPapers: [a.paper.id, b.paper.id],
          affectedPaperTitles: [a.paper.title, b.paper.title],
          severityScore: 8,
          noveltyScore: 75,
          explanation: `Two papers addressing related topics report conflicting results. "${positivePaper.paper.title}" reports positive findings (${positivePaper.positiveSignals.slice(0, 2).join(', ')}), while "${negativePaper.paper.title}" reports negative findings (${negativePaper.negativeSignals.slice(0, 2).join(', ')}).`,
          whyItIsAGap: 'Conflicting results between studies on similar topics indicate a gap in understanding. Resolving these conflicts through systematic comparison or larger-scale studies would advance the field.',
          supportingEvidence: [
            `"${positivePaper.paper.title}" reports: ${positivePaper.positiveSignals.slice(0, 3).join(', ')}`,
            `"${negativePaper.paper.title}" reports: ${negativePaper.negativeSignals.slice(0, 3).join(', ')}`,
          ],
        });
      }

      // Also check for explicit contradictions in methodology or approach
      const aMethodTerms = extractMethodologyTerms(`${a.paper.methodology} ${a.paper.abstract}`);
      const bMethodTerms = extractMethodologyTerms(`${b.paper.methodology} ${b.paper.abstract}`);

      // If same topic but completely different methods with different results
      if (similarity >= 0.3 && aHasPositive && bHasPositive) {
        const commonMethods = aMethodTerms.filter((m) => bMethodTerms.includes(m));
        const uniqueA = aMethodTerms.filter((m) => !bMethodTerms.includes(m));
        const uniqueB = bMethodTerms.filter((m) => !aMethodTerms.includes(m));

        if (commonMethods.length === 0 && uniqueA.length > 0 && uniqueB.length > 0) {
          const dedupeKey = `method_conflict:${[a.paper.id, b.paper.id].sort().join(':')}`;
          if (seenDescriptions.has(dedupeKey)) continue;
          seenDescriptions.add(dedupeKey);

          gaps.push({
            id: generateId(),
            description: `Different methods yield positive results on similar problems: "${a.paper.title}" vs "${b.paper.title}"`,
            gapType: 'conflicting_results',
            affectedPapers: [a.paper.id, b.paper.id],
            affectedPaperTitles: [a.paper.title, b.paper.title],
            severityScore: 6,
            noveltyScore: 70,
            explanation: `Both papers report positive results using entirely different methodological approaches on related problems. "${a.paper.title}" uses ${uniqueA.slice(0, 3).join(', ')}, while "${b.paper.title}" uses ${uniqueB.slice(0, 3).join(', ')}.`,
            whyItIsAGap: 'When different methods both claim success on similar problems without direct comparison, it is unclear which is truly better or whether the methods are complementary. A head-to-head comparison would resolve this uncertainty.',
            supportingEvidence: [
              `"${a.paper.title}" uses: ${uniqueA.slice(0, 5).join(', ')}`,
              `"${b.paper.title}" uses: ${uniqueB.slice(0, 5).join(', ')}`,
            ],
          });
        }
      }
    }
  }

  return gaps;
}

/**
 * Identifies methods that could be applied to other domains but haven't been:
 * - Techniques mentioned in one field that aren't used in another
 * - Cross-pollination opportunities
 */
export function detectCrossDomainGaps(papers: ExtractedPaper[]): ResearchGap[] {
  if (papers.length < 2) return [];

  const gaps: ResearchGap[] = [];
  const seenDescriptions = new Set<string>();

  // Build domain signals per paper
  const paperDomains = papers.map((p) => ({
    paper: p,
    domainSignals: extractDomainSignals(p),
    methods: extractMethodologyTerms(`${p.methodology} ${p.abstract} ${p.results}`),
    datasets: extractDatasetMentions(`${p.abstract} ${p.methodology} ${p.results}`),
  }));

  // Find papers with different domain signals but potentially transferable methods
  for (let i = 0; i < paperDomains.length; i++) {
    for (let j = i + 1; j < paperDomains.length; j++) {
      const a = paperDomains[i];
      const b = paperDomains[j];

      // Check if papers are in different domains
      const domainOverlap = keywordSimilarity(a.domainSignals, b.domainSignals);
      if (domainOverlap > 0.5) continue; // Too similar domain, skip

      // Check if methods from one could apply to the other
      const methodOverlap = keywordSimilarity(a.methods, b.methods);

      // If different domains and different methods, potential cross-domain gap
      if (domainOverlap < 0.3 && methodOverlap < 0.3) {
        // Check if the research focus of one could benefit from methods of the other
        const aFocusTerms = a.paper.researchFocus.toLowerCase().split(/\s+/);
        const bFocusTerms = b.paper.researchFocus.toLowerCase().split(/\s+/);

        // Look for potential applicability keywords
        const applicabilityPatterns = [
          /\bclassif(y|ication)\b/i,
          /\bdetect(ion|ing)\b/i,
          /\bpredict(ion|ing)\b/i,
          /\bgenerat(ion|ing)\b/i,
          /\boptimiz(ation|ing)\b/i,
          /\bsegment(ation|ing)\b/i,
          /\brecogni(tion|ze)\b/i,
          /\bmodel(ing|ed)\b/i,
          /\banaly[sz](is|ing|e)\b/i,
          /\bprocess(ing|ed)\b/i,
        ];

        const aHasApplicability = applicabilityPatterns.some((p) => p.test(a.paper.researchFocus) || p.test(a.paper.abstract));
        const bHasApplicability = applicabilityPatterns.some((p) => p.test(b.paper.researchFocus) || p.test(b.paper.abstract));

        if (aHasApplicability || bHasApplicability) {
          const dedupeKey = `cross_domain:${[a.paper.id, b.paper.id].sort().join(':')}`;
          if (seenDescriptions.has(dedupeKey)) continue;
          seenDescriptions.add(dedupeKey);

          gaps.push({
            id: generateId(),
            description: `Cross-domain application opportunity: methods from "${a.paper.title}" could potentially be applied to the domain of "${b.paper.title}" (or vice versa)`,
            gapType: 'cross_domain_gap',
            affectedPapers: [a.paper.id, b.paper.id],
            affectedPaperTitles: [a.paper.title, b.paper.title],
            severityScore: 5,
            noveltyScore: 85,
            explanation: `"${a.paper.title}" uses ${a.methods.slice(0, 3).join(', ')} in its domain, while "${b.paper.title}" uses ${b.methods.slice(0, 3).join(', ')} in a different domain. These methods could potentially be cross-applied to yield new insights.`,
            whyItIsAGap: 'Cross-domain transfer of methods is a powerful but underexplored research strategy. Applying successful techniques from one domain to another can yield breakthroughs and fresh perspectives.',
            supportingEvidence: [
              `"${a.paper.title}" domain signals: ${a.domainSignals.slice(0, 5).join(', ') || 'general'}`,
              `"${b.paper.title}" domain signals: ${b.domainSignals.slice(0, 5).join(', ') || 'general'}`,
              `Method gap: ${a.methods.slice(0, 3).join(', ')} ↔ ${b.methods.slice(0, 3).join(', ')}`,
            ],
          });
        }
      }

      // If different domains but same methods, potential for comparative study
      if (domainOverlap < 0.3 && methodOverlap > 0.5 && a.methods.length > 0) {
        const dedupeKey = `cross_domain_same_method:${[a.paper.id, b.paper.id].sort().join(':')}`;
        if (seenDescriptions.has(dedupeKey)) continue;
        seenDescriptions.add(dedupeKey);

        gaps.push({
          id: generateId(),
          description: `Same methodology applied across different domains: "${a.paper.title}" and "${b.paper.title}"`,
          gapType: 'cross_domain_gap',
          affectedPapers: [a.paper.id, b.paper.id],
          affectedPaperTitles: [a.paper.title, b.paper.title],
          severityScore: 4,
          noveltyScore: 75,
          explanation: `Both papers use similar methods (${a.methods.slice(0, 3).join(', ')}) but in different domains. This creates an opportunity for a systematic cross-domain comparison or transfer learning study.`,
          whyItIsAGap: 'When the same methodology is independently applied in different domains without cross-domain comparison, we miss the opportunity to understand how domain characteristics affect method performance and to develop domain-adaptive approaches.',
          supportingEvidence: [
            `Common methods: ${a.methods.slice(0, 5).join(', ')}`,
            `Different domain signals suggest different application areas.`,
          ],
        });
      }
    }
  }

  // ── Detect techniques mentioned but not applied ──
  // Look for methods mentioned in future work or limitations that could be cross-applied
  for (const paper of papers) {
    const futureWorkText = `${paper.limitations} ${paper.conclusion}`;
    const mentionedButNotUsed: string[] = [];

    const potentialMethods = extractMethodologyTerms(futureWorkText);
    const usedMethods = extractMethodologyTerms(`${paper.methodology} ${paper.abstract}`);

    for (const method of potentialMethods) {
      if (!usedMethods.includes(method)) {
        mentionedButNotUsed.push(method);
      }
    }

    if (mentionedButNotUsed.length > 0) {
      const dedupeKey = `mentioned_not_used:${paper.id}`;
      if (seenDescriptions.has(dedupeKey)) continue;
      seenDescriptions.add(dedupeKey);

      gaps.push({
        id: generateId(),
        description: `Methods mentioned but not applied in "${paper.title}"`,
        gapType: 'cross_domain_gap',
        affectedPapers: [paper.id],
        affectedPaperTitles: [paper.title],
        severityScore: 4,
        noveltyScore: 65,
        explanation: `The paper mentions ${mentionedButNotUsed.slice(0, 3).join(', ')} but does not apply them. These methods could potentially improve the results or extend the scope of the study.`,
        whyItIsAGap: 'When methods are mentioned as potential alternatives or extensions but not actually implemented, it represents an unexplored opportunity. Implementing and comparing these methods could yield valuable insights.',
        supportingEvidence: [`Mentioned but not used: ${mentionedButNotUsed.slice(0, 5).join(', ')}`],
      });
    }
  }

  return gaps;
}

/**
 * Calculates severity and novelty scores for a gap.
 * Severity: Based on number of affected papers, gap type criticality, and evidence strength.
 * Novelty: Based on uniqueness, whether papers partially address it, and gap type.
 */
export function scoreGap(
  gap: Partial<ResearchGap>,
  papers: ExtractedPaper[]
): { severityScore: number; noveltyScore: number } {
  // ── Severity Scoring ──
  let severityScore = gap.severityScore ?? 5;

  // Factor 1: Number of affected papers (more papers = more systemic = higher severity)
  const affectedCount = gap.affectedPapers?.length ?? 0;
  if (affectedCount >= 4) {
    severityScore = Math.min(10, severityScore + 2);
  } else if (affectedCount >= 3) {
    severityScore = Math.min(10, severityScore + 1.5);
  } else if (affectedCount >= 2) {
    severityScore = Math.min(10, severityScore + 1);
  }

  // Factor 2: Gap type criticality weights
  const gapTypeCriticality: Record<GapType, number> = {
    conflicting_results: 1.5,
    ethical_concern: 1.4,
    no_real_world_validation: 1.3,
    reproducibility_issue: 1.2,
    small_sample_size: 1.1,
    methodology_gap: 1.1,
    missing_dataset: 1.0,
    limited_scope: 0.9,
    missing_edge_case: 0.9,
    outdated_method: 0.8,
    cross_domain_gap: 0.7,
    scalability_limitation: 1.0,
  };

  if (gap.gapType) {
    severityScore = Math.min(10, severityScore * gapTypeCriticality[gap.gapType]);
  }

  // Factor 3: Supporting evidence strength
  const evidenceCount = gap.supportingEvidence?.length ?? 0;
  if (evidenceCount >= 3) {
    severityScore = Math.min(10, severityScore + 0.5);
  } else if (evidenceCount >= 2) {
    severityScore = Math.min(10, severityScore + 0.3);
  }

  // Factor 4: How common this gap type is across papers (more common = more severe)
  if (gap.gapType && papers.length > 0) {
    const sameTypeCount = papers.filter((p) => {
      const text = `${p.abstract} ${p.limitations} ${p.conclusion}`.toLowerCase();
      const typeKeywords: Record<GapType, string[]> = {
        missing_dataset: ['dataset', 'data', 'benchmark'],
        methodology_gap: ['method', 'approach', 'technique'],
        conflicting_results: ['conflict', 'contradict', 'oppose'],
        no_real_world_validation: ['real-world', 'deployment', 'practical'],
        small_sample_size: ['sample', 'size', 'small'],
        missing_edge_case: ['edge case', 'corner case', 'boundary'],
        outdated_method: ['outdated', 'legacy', 'old'],
        cross_domain_gap: ['domain', 'field', 'area'],
        limited_scope: ['scope', 'limited', 'narrow'],
        reproducibility_issue: ['reproducib', 'replicat', 'code'],
        ethical_concern: ['ethic', 'bias', 'fairness'],
        scalability_limitation: ['scalab', 'scale', 'large'],
      };
      const keywords = typeKeywords[gap.gapType] ?? [];
      return keywords.some((kw) => text.includes(kw));
    }).length;

    if (sameTypeCount >= 3) {
      severityScore = Math.min(10, severityScore + 0.5);
    }
  }

  // ── Novelty Scoring ──
  let noveltyScore = gap.noveltyScore ?? 50;

  // Factor 1: Gap type novelty weights
  const gapTypeNovelty: Record<GapType, number> = {
    cross_domain_gap: 1.3,
    conflicting_results: 1.2,
    missing_edge_case: 1.15,
    methodology_gap: 1.1,
    no_real_world_validation: 1.05,
    missing_dataset: 1.0,
    limited_scope: 0.9,
    scalability_limitation: 0.95,
    small_sample_size: 0.85,
    reproducibility_issue: 0.8,
    outdated_method: 0.85,
    ethical_concern: 1.1,
  };

  if (gap.gapType) {
    noveltyScore = Math.min(100, noveltyScore * gapTypeNovelty[gap.gapType]);
  }

  // Factor 2: Uniqueness - if few gaps of this type exist, higher novelty
  // (This is context-dependent; we approximate by checking how specific the description is)
  const descriptionLength = gap.description?.length ?? 0;
  if (descriptionLength > 100) {
    // More specific descriptions suggest more targeted, novel gaps
    noveltyScore = Math.min(100, noveltyScore + 5);
  }

  // Factor 3: Check if existing papers partially address this gap
  // If papers mention related future work, they partially acknowledge but don't solve it
  if (gap.affectedPapers && gap.affectedPapers.length > 0) {
    let partialAddressCount = 0;
    for (const paperId of gap.affectedPapers) {
      const paper = papers.find((p) => p.id === paperId);
      if (paper) {
        const futureWorkText = `${paper.limitations} ${paper.conclusion}`.toLowerCase();
        if (futureWorkText.includes('future work') || futureWorkText.includes('future research')) {
          partialAddressCount++;
        }
      }
    }
    // If papers acknowledge but don't solve, novelty is moderate (not brand new, but unaddressed)
    if (partialAddressCount > 0 && partialAddressCount < gap.affectedPapers.length) {
      noveltyScore = Math.min(100, noveltyScore + 5);
    } else if (partialAddressCount === gap.affectedPapers.length) {
      // All papers acknowledge it - still novel but less surprising
      noveltyScore = Math.min(100, noveltyScore - 5);
    }
  }

  // Factor 4: Cross-paper gaps are more novel than single-paper gaps
  if (affectedCount >= 3) {
    noveltyScore = Math.min(100, noveltyScore + 10);
  } else if (affectedCount >= 2) {
    noveltyScore = Math.min(100, noveltyScore + 5);
  }

  return {
    severityScore: Math.round(Math.max(1, Math.min(10, severityScore)) * 10) / 10,
    noveltyScore: Math.round(Math.max(0, Math.min(100, noveltyScore))),
  };
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Main entry point that runs all gap detection rules.
 * Combines results from all detectors, deduplicates, re-scores, and sorts by severity.
 */
export function detectGaps(papers: ExtractedPaper[]): ResearchGap[] {
  if (papers.length === 0) return [];

  // Run all detectors
  const limitationGaps = detectLimitations(papers);
  const methodologyGaps = detectMethodologyGaps(papers);
  const datasetGaps = detectDatasetGaps(papers);
  const conflictGaps = detectConflicts(papers);
  const crossDomainGaps = detectCrossDomainGaps(papers);

  // Combine all gaps
  const allGaps: ResearchGap[] = [
    ...limitationGaps,
    ...methodologyGaps,
    ...datasetGaps,
    ...conflictGaps,
    ...crossDomainGaps,
  ];

  // Deduplicate: merge gaps with the same gapType and overlapping affected papers
  const mergedGaps = deduplicateGaps(allGaps);

  // Re-score all gaps using the scoring function
  const scoredGaps = mergedGaps.map((gap) => {
    const scores = scoreGap(gap, papers);
    return {
      ...gap,
      severityScore: scores.severityScore,
      noveltyScore: scores.noveltyScore,
    };
  });

  // Sort by severity score (highest first), then by novelty score as tiebreaker
  scoredGaps.sort((a, b) => {
    if (b.severityScore !== a.severityScore) {
      return b.severityScore - a.severityScore;
    }
    return b.noveltyScore - a.noveltyScore;
  });

  return scoredGaps;
}

/**
 * Deduplicate and merge gaps that describe the same or very similar issues.
 * Merges gaps of the same type with overlapping affected papers.
 */
function deduplicateGaps(gaps: ResearchGap[]): ResearchGap[] {
  const merged: ResearchGap[] = [];
  const used = new Set<number>();

  for (let i = 0; i < gaps.length; i++) {
    if (used.has(i)) continue;

    const current = { ...gaps[i] };
    let wasMerged = false;

    for (let j = i + 1; j < gaps.length; j++) {
      if (used.has(j)) continue;

      const other = gaps[j];

      // Check if gaps should be merged
      if (shouldMergeGaps(current, other)) {
        // Merge: combine affected papers and supporting evidence
        const combinedPapers = new Set(current.affectedPapers.concat(other.affectedPapers));
        const combinedTitles = new Set(current.affectedPaperTitles.concat(other.affectedPaperTitles));
        const combinedEvidence = current.supportingEvidence.concat(other.supportingEvidence);

        current.affectedPapers = Array.from(combinedPapers);
        current.affectedPaperTitles = Array.from(combinedTitles);
        current.supportingEvidence = combinedEvidence;

        // Take the higher severity and novelty
        current.severityScore = Math.max(current.severityScore, other.severityScore);
        current.noveltyScore = Math.max(current.noveltyScore, other.noveltyScore);

        // Merge explanations if they're different enough
        if (current.explanation !== other.explanation) {
          current.explanation = `${current.explanation} Additionally, ${other.explanation.charAt(0).toLowerCase()}${other.explanation.slice(1)}`;
        }

        used.add(j);
        wasMerged = true;
      }
    }

    // Assign new ID if merged
    if (wasMerged) {
      current.id = generateId();
    }

    merged.push(current);
    used.add(i);
  }

  return merged;
}

/**
 * Determine if two gaps should be merged.
 * Merge if: same gap type AND significant overlap in affected papers OR very similar descriptions.
 */
function shouldMergeGaps(a: ResearchGap, b: ResearchGap): boolean {
  // Must be same gap type
  if (a.gapType !== b.gapType) return false;

  // Check affected paper overlap
  const aSet = new Set(a.affectedPapers);
  const bSet = new Set(b.affectedPapers);
  let overlap = 0;
  Array.from(aSet).forEach((id) => {
    if (bSet.has(id)) overlap++;
  });
  const minSize = Math.min(aSet.size, bSet.size);
  if (minSize > 0 && overlap / minSize >= 0.5) return true;

  // Check description similarity (simple word overlap)
  const aWords = new Set(a.description.toLowerCase().split(/\s+/));
  const bWords = new Set(b.description.toLowerCase().split(/\s+/));
  let wordOverlap = 0;
  Array.from(aWords).forEach((w) => {
    if (w.length > 3 && bWords.has(w)) wordOverlap++;
  });
  const minWords = Math.min(aWords.size, bWords.size);
  if (minWords > 3 && wordOverlap / minWords >= 0.4) return true;

  return false;
}
