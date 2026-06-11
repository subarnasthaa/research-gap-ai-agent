import type { ExtractedPaper, ComparisonResult, ComparisonRow, ConflictItem } from '@/lib/types';

// ─── Keyword dictionaries ────────────────────────────────────────────────────

const METHODOLOGY_KEYWORDS: Record<string, string[]> = {
  'Transformer': ['transformer', 'self-attention', 'multi-head attention', 'attention mechanism', 'encoder-decoder'],
  'CNN': ['cnn', 'convolutional neural network', 'convolutional', 'convnet', 'resnet', 'vgg', 'inception'],
  'RNN': ['rnn', 'recurrent neural network', 'recurrent'],
  'LSTM': ['lstm', 'long short-term memory', 'gru', 'gated recurrent unit'],
  'GAN': ['gan', 'generative adversarial network', 'adversarial training', 'discriminator', 'generator network'],
  'VAE': ['vae', 'variational autoencoder', 'autoencoder', 'variational inference'],
  'Random Forest': ['random forest', 'random decision forest', 'ensemble of trees'],
  'SVM': ['svm', 'support vector machine', 'support vector'],
  'Neural Network': ['neural network', 'deep neural', 'feedforward', 'mlp', 'multilayer perceptron'],
  'Deep Learning': ['deep learning', 'deep neural network', 'deep model', 'end-to-end learning'],
  'Reinforcement Learning': ['reinforcement learning', 'rl agent', 'policy gradient', 'q-learning', 'reward function', 'actor-critic', 'ppo', 'dqn'],
  'Supervised Learning': ['supervised learning', 'supervised approach', 'supervised method', 'labeled data', 'labeled dataset'],
  'Unsupervised Learning': ['unsupervised learning', 'unsupervised approach', 'clustering', 'k-means', 'hierarchical clustering', 'unsupervised method'],
  'Semi-Supervised Learning': ['semi-supervised', 'semi-supervised learning', 'weakly supervised', 'self-training', 'pseudo-labeling'],
  'Transfer Learning': ['transfer learning', 'pretrained model', 'pre-trained model', 'domain adaptation', 'knowledge transfer'],
  'Fine-Tuning': ['fine-tuning', 'fine-tuned', 'finetuning', 'adapter', 'lora', 'parameter-efficient'],
  'Pre-Training': ['pre-training', 'pretrained', 'pre-trained', 'self-supervised pretraining', 'self-supervised learning'],
  'Ensemble Methods': ['ensemble', 'bagging', 'boosting', 'stacking', 'xgboost', 'adaboost', 'gradient boosting'],
  'Graph Neural Network': ['graph neural network', 'gnn', 'gcn', 'graph convolutional', 'message passing', 'graph attention'],
  'Bayesian Methods': ['bayesian', 'bayesian inference', 'bayesian optimization', 'gaussian process', 'mcmc', 'variational bayes'],
  'Evolutionary Algorithm': ['evolutionary', 'genetic algorithm', 'evolution strategy', 'cma-es', 'neuroevolution'],
  'Attention Mechanism': ['attention mechanism', 'attention layer', 'cross-attention', 'self-attention', 'sparse attention'],
  'Contrastive Learning': ['contrastive learning', 'simclr', 'moco', 'contrastive loss', 'triplet loss'],
  'Diffusion Model': ['diffusion model', 'ddpm', 'score-based', 'denoising diffusion', 'stable diffusion'],
  'Meta-Learning': ['meta-learning', 'few-shot', 'maml', 'learn to learn', 'meta-train'],
  'Federated Learning': ['federated learning', 'federated', 'distributed learning', 'privacy-preserving'],
};

const DATASET_KEYWORDS: Record<string, string[]> = {
  'ImageNet': ['imagenet'],
  'CIFAR-10': ['cifar-10', 'cifar10'],
  'CIFAR-100': ['cifar-100', 'cifar100'],
  'MNIST': ['mnist'],
  'SQuAD': ['squad', 'stanford question answering'],
  'GLUE': ['glue', 'general language understanding'],
  'SuperGLUE': ['superglue'],
  'COCO': ['coco', 'common objects in context'],
  'Pascal VOC': ['pascal voc', 'voc'],
  'ADE20K': ['ade20k', 'ade-20k'],
  'Cityscapes': ['cityscapes'],
  'UCI Repository': ['uci', 'uci machine learning'],
  'WMT': ['wmt'],
  'Penn Treebank': ['penn treebank', 'ptb'],
  'WikiText': ['wikitext', 'wiki text'],
  'BookCorpus': ['bookcorpus', 'book corpus'],
  'Common Crawl': ['common crawl'],
  'The Pile': ['the pile'],
  'LAION': ['laion'],
  'MMLU': ['mmlu', 'massive multitask language understanding'],
  'HumanEval': ['humaneval', 'human eval'],
  'GSM8K': ['gsm8k'],
  'BoolQ': ['boolq'],
  'RTE': ['rte', 'recognizing textual entailment'],
  'SST-2': ['sst-2', 'sst2', 'stanford sentiment treebank'],
  'QQP': ['qqp', 'quora question pairs'],
  'MNLI': ['mnli', 'multi-genre nli'],
  'SNLI': ['snli', 'stanford natural language inference'],
  'TREC': ['trec'],
  'AG News': ['ag news'],
  'Yelp Reviews': ['yelp'],
  'Amazon Reviews': ['amazon reviews'],
  'PubMed': ['pubmed'],
  'arXiv': ['arxiv'],
  'Kitti': ['kitti'],
  'NuScenes': ['nuscenes'],
  'LibriSpeech': ['librispeech'],
  'LJSpeech': ['ljspeech'],
  'EuroParl': ['europarl'],
  'Custom/Proprietary Dataset': ['proprietary dataset', 'custom dataset', 'internal dataset', 'private dataset', 'our dataset'],
};

const METRIC_PATTERNS: {
  name: string;
  patterns: RegExp[];
}[] = [
  { name: 'Accuracy', patterns: [/\baccuracy\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)\s*%/gi, /\bacc\s*[:=]?\s*(\d+\.?\d*)\s*%/gi, /(\d+\.?\d*)\s*%\s*accuracy/gi] },
  { name: 'F1 Score', patterns: [/\bf1\s*(?:score)?\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\bf1\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'Precision', patterns: [/\bprecision\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'Recall', patterns: [/\brecall\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'AUC', patterns: [/\bauc(?:-?roc)?\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\barea under (?:the )?(?:roc )?curve\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'BLEU', patterns: [/\bbleu(?:-\d+)?\s*(?:score)?\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'ROUGE-L', patterns: [/\brouge-l?\s*(?:score)?\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'Perplexity', patterns: [/\bperplexity\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'Top-1 Accuracy', patterns: [/\btop-?1\s*accuracy\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'Top-5 Accuracy', patterns: [/\btop-?5\s*accuracy\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'Mean Average Precision', patterns: [/\bmap\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\bmean average precision\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'IoU', patterns: [/\biou\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\bintersection over union\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'RMSE', patterns: [/\brmse\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\broot mean squared? error\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'MAE', patterns: [/\bmae\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\bmean absolute error\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'AUC-PR', patterns: [/\bauc-pr?\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\barea under (?:the )?precision[- ]recall\s*[:=]?\s*(\d+\.?\d*)/gi] },
  { name: 'Exact Match', patterns: [/\bexact match\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi, /\bem\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)\s*%/gi] },
  { name: 'BERTScore', patterns: [/\bbertscore?\s*(?:of)?\s*[:=]?\s*(\d+\.?\d*)/gi] },
];

const SIZE_PATTERNS: RegExp[] = [
  /(\d[\d,]*\d|\d+)\s*(?:samples?|instances?|examples?|records?|data points?|documents?|images?|sequences?|pairs?|entries?|observations?|patients?|subjects?|participants?)/gi,
  /dataset\s*(?:of|with|containing)?\s*(?:approximately\s*|about\s*|around\s*)?(\d[\d,]*\d|\d+)\s/gi,
  /n\s*=\s*(\d[\d,]*\d|\d+)/gi,
  /(\d[\d,]*\d|\d+)\s*(?:k|K|M|m|B|b)\b/g,
];

const DOMAIN_PATTERNS: { name: string; patterns: RegExp[] }[] = [
  { name: 'Natural Language Processing', patterns: [/\bnlp\b/gi, /\bnatural language/gi, /\btext (?:classification|generation|understanding)/gi] },
  { name: 'Computer Vision', patterns: [/\bcomputer vision\b/gi, /\bimage (?:classification|segmentation|detection|recognition)/gi, /\bobject detection\b/gi] },
  { name: 'Speech Processing', patterns: [/\bspeech (?:recognition|synthesis)\b/gi, /\basr\b/gi, /\btts\b/gi] },
  { name: 'Healthcare/Medical', patterns: [/\bmedical\b/gi, /\bclinical\b/gi, /\bhealthcare\b/gi, /\bdiagnosis\b/gi, /\bradiology\b/gi] },
  { name: 'Finance', patterns: [/\bfinanc(?:e|ial)\b/gi, /\bstock market\b/gi, /\btrading\b/gi] },
  { name: 'Recommender Systems', patterns: [/\brecommend(?:er|ation)\b/gi, /\bcollaborative filtering\b/gi] },
  { name: 'Robotics', patterns: [/\brobot(?:ics)?\b/gi, /\bmanipulation\b/gi, /\bnavigation\b/gi] },
  { name: 'Autonomous Driving', patterns: [/\bautonomous (?:driving|vehicle)\b/gi, /\bself-driving\b/gi] },
  { name: 'Cybersecurity', patterns: [/\bcyber(?:security|attack)?\b/gi, /\bintrusion detection\b/gi, /\bmalware\b/gi] },
  { name: 'Social Media/Networks', patterns: [/\bsocial (?:media|network)\b/gi, /\btwitter\b/gi, /\breddit\b/gi] },
  { name: 'Education', patterns: [/\beducation(?:al)?\b/gi, /\bstudent\b/gi, /\blearning analytics\b/gi] },
  { name: 'Climate/Environment', patterns: [/\bclimate\b/gi, /\bweather\b/gi, /\benvironment(?:al)?\b/gi, /\bsustainability\b/gi] },
];

// ─── Helper functions ────────────────────────────────────────────────────────

function extractMatches(text: string, keywords: Record<string, string[]>): string[] {
  const lowerText = text.toLowerCase();
  const matches: string[] = [];

  for (const [name, patterns] of Object.entries(keywords)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        if (!matches.includes(name)) {
          matches.push(name);
        }
        break;
      }
    }
  }

  return matches;
}

function extractMetricValues(text: string): Record<string, string> {
  const metrics: Record<string, string> = {};

  for (const { name, patterns } of METRIC_PATTERNS) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (!metrics[name]) {
          metrics[name] = match[1];
        }
      }
    }
  }

  return metrics;
}

function extractDatasetSize(text: string): string {
  const lowerText = text.toLowerCase();

  for (const pattern of SIZE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const match = regex.exec(lowerText);
    if (match) {
      return match[1].replace(/,/g, '');
    }
  }

  return 'Not specified';
}

function extractDatasetDomain(text: string): string[] {
  const domains: string[] = [];

  for (const { name, patterns } of DOMAIN_PATTERNS) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      if (regex.test(text)) {
        if (!domains.includes(name)) {
          domains.push(name);
        }
        break;
      }
    }
  }

  return domains;
}

function extractDatasetType(text: string): string {
  const lowerText = text.toLowerCase();

  if (/\bimage\b/gi.test(lowerText) || /\bvisual\b/gi.test(lowerText)) return 'Image';
  if (/\btext\b/gi.test(lowerText) || /\bcorpus\b/gi.test(lowerText)) return 'Text';
  if (/\baudio\b/gi.test(lowerText) || /\bspeech\b/gi.test(lowerText)) return 'Audio';
  if (/\bvideo\b/gi.test(lowerText)) return 'Video';
  if (/\btabular\b/gi.test(lowerText) || /\btable\b/gi.test(lowerText)) return 'Tabular';
  if (/\btime[- ]?series\b/gi.test(lowerText)) return 'Time Series';
  if (/\bgraph\b/gi.test(lowerText) || /\bnetwork data\b/gi.test(lowerText)) return 'Graph';
  if (/\b3d\b/gi.test(lowerText) || /\bpoint cloud\b/gi.test(lowerText)) return '3D/Point Cloud';
  if (/\bmulti[- ]?modal\b/gi.test(lowerText)) return 'Multimodal';

  return 'Not specified';
}

function normalizeNumber(value: string): number | null {
  const cleaned = value.replace(/[,%]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ─── Main comparison function ────────────────────────────────────────────────

export function comparePapers(papers: ExtractedPaper[]): ComparisonResult {
  if (papers.length === 0) {
    return {
      paperIds: [],
      methodologyComparison: [],
      datasetComparison: [],
      resultsComparison: [],
      conflicts: [],
      similarities: [],
    };
  }

  const paperIds = papers.map((p) => p.id);

  // ── 1. Methodology Comparison ───────────────────────────────────────────

  const methodologyAspects: string[] = [
    'Model Architecture',
    'Learning Paradigm',
    'Training Strategy',
    'Optimization Approach',
    'Regularization',
    'Feature Engineering',
    'Evaluation Protocol',
  ];

  const methodologyComparison: ComparisonRow[] = [];

  // Model Architecture
  const archRow: ComparisonRow = { aspect: 'Model Architecture', values: {} };
  for (const paper of papers) {
    const methods = extractMatches(
      `${paper.methodology} ${paper.abstract}`,
      METHODOLOGY_KEYWORDS
    );
    const archMethods = methods.filter((m) =>
      ['Transformer', 'CNN', 'RNN', 'LSTM', 'GAN', 'VAE', 'Random Forest', 'SVM',
       'Neural Network', 'Graph Neural Network', 'Diffusion Model'].includes(m)
    );
    archRow.values[paper.id] = archMethods.length > 0 ? archMethods.join(', ') : 'Not specified';
  }
  methodologyComparison.push(archRow);

  // Learning Paradigm
  const paradigmRow: ComparisonRow = { aspect: 'Learning Paradigm', values: {} };
  for (const paper of papers) {
    const methods = extractMatches(
      `${paper.methodology} ${paper.abstract}`,
      METHODOLOGY_KEYWORDS
    );
    const paradigmMethods = methods.filter((m) =>
      ['Supervised Learning', 'Unsupervised Learning', 'Semi-Supervised Learning',
       'Reinforcement Learning', 'Self-Supervised', 'Meta-Learning', 'Federated Learning'].includes(m)
    );
    paradigmRow.values[paper.id] = paradigmMethods.length > 0 ? paradigmMethods.join(', ') : 'Not specified';
  }
  methodologyComparison.push(paradigmRow);

  // Training Strategy
  const trainingRow: ComparisonRow = { aspect: 'Training Strategy', values: {} };
  for (const paper of papers) {
    const methods = extractMatches(
      `${paper.methodology} ${paper.abstract}`,
      METHODOLOGY_KEYWORDS
    );
    const trainingMethods = methods.filter((m) =>
      ['Transfer Learning', 'Fine-Tuning', 'Pre-Training', 'Contrastive Learning'].includes(m)
    );
    trainingRow.values[paper.id] = trainingMethods.length > 0 ? trainingMethods.join(', ') : 'Not specified';
  }
  methodologyComparison.push(trainingRow);

  // Optimization Approach
  const optimizationRow: ComparisonRow = { aspect: 'Optimization Approach', values: {} };
  for (const paper of papers) {
    const text = `${paper.methodology} ${paper.results}`.toLowerCase();
    const optimizers: string[] = [];
    if (/\badam\b/gi.test(text)) optimizers.push('Adam');
    if (/\bsgd\b/gi.test(text) || /\bstochastic gradient descent\b/gi.test(text)) optimizers.push('SGD');
    if (/\badamw\b/gi.test(text)) optimizers.push('AdamW');
    if (/\brmsprop\b/gi.test(text)) optimizers.push('RMSProp');
    if (/\blamb\b/gi.test(text)) optimizers.push('LAMB');
    if (/\blion\b/gi.test(text)) optimizers.push('Lion');
    if (/\bgradient descent\b/gi.test(text) && !optimizers.length) optimizers.push('Gradient Descent');
    optimizationRow.values[paper.id] = optimizers.length > 0 ? optimizers.join(', ') : 'Not specified';
  }
  methodologyComparison.push(optimizationRow);

  // Ensemble / Attention / Bayesian
  const additionalRow: ComparisonRow = { aspect: 'Advanced Techniques', values: {} };
  for (const paper of papers) {
    const methods = extractMatches(
      `${paper.methodology} ${paper.abstract}`,
      METHODOLOGY_KEYWORDS
    );
    const advancedMethods = methods.filter((m) =>
      ['Ensemble Methods', 'Attention Mechanism', 'Bayesian Methods',
       'Evolutionary Algorithm', 'Deep Learning'].includes(m)
    );
    additionalRow.values[paper.id] = advancedMethods.length > 0 ? advancedMethods.join(', ') : 'None identified';
  }
  methodologyComparison.push(additionalRow);

  // Regularization
  const regRow: ComparisonRow = { aspect: 'Regularization', values: {} };
  for (const paper of papers) {
    const text = `${paper.methodology}`.toLowerCase();
    const regMethods: string[] = [];
    if (/\bdropout\b/gi.test(text)) regMethods.push('Dropout');
    if (/\bweight decay\b/gi.test(text) || /\bl2\b/gi.test(text) || /\bridg/i.test(text)) regMethods.push('Weight Decay/L2');
    if (/\bdata augment/gi.test(text)) regMethods.push('Data Augmentation');
    if (/\bearly stop/gi.test(text)) regMethods.push('Early Stopping');
    if (/\bbatch norm/gi.test(text)) regMethods.push('Batch Normalization');
    if (/\blayer norm/gi.test(text)) regMethods.push('Layer Normalization');
    if (/\blabel smooth/gi.test(text)) regMethods.push('Label Smoothing');
    if (/\bmixup\b/gi.test(text)) regMethods.push('Mixup');
    if (/\bcutout\b/gi.test(text) || /\bcutmix\b/gi.test(text)) regMethods.push('Cutout/CutMix');
    regRow.values[paper.id] = regMethods.length > 0 ? regMethods.join(', ') : 'Not specified';
  }
  methodologyComparison.push(regRow);

  // ── 2. Dataset Comparison ───────────────────────────────────────────────

  const datasetComparison: ComparisonRow[] = [];

  // Dataset Names
  const datasetRow: ComparisonRow = { aspect: 'Datasets Used', values: {} };
  for (const paper of papers) {
    const datasets = extractMatches(
      `${paper.methodology} ${paper.results} ${paper.abstract}`,
      DATASET_KEYWORDS
    );
    datasetRow.values[paper.id] = datasets.length > 0 ? datasets.join(', ') : 'Not specified';
  }
  datasetComparison.push(datasetRow);

  // Dataset Size
  const sizeRow: ComparisonRow = { aspect: 'Dataset Size', values: {} };
  for (const paper of papers) {
    sizeRow.values[paper.id] = extractDatasetSize(
      `${paper.methodology} ${paper.results} ${paper.abstract}`
    );
  }
  datasetComparison.push(sizeRow);

  // Dataset Type
  const typeRow: ComparisonRow = { aspect: 'Data Type', values: {} };
  for (const paper of papers) {
    typeRow.values[paper.id] = extractDatasetType(
      `${paper.methodology} ${paper.abstract} ${paper.results}`
    );
  }
  datasetComparison.push(typeRow);

  // Dataset Domain
  const domainRow: ComparisonRow = { aspect: 'Application Domain', values: {} };
  for (const paper of papers) {
    const domains = extractDatasetDomain(
      `${paper.abstract} ${paper.methodology} ${paper.conclusion}`
    );
    domainRow.values[paper.id] = domains.length > 0 ? domains.join(', ') : 'Not specified';
  }
  datasetComparison.push(domainRow);

  // Data Split
  const splitRow: ComparisonRow = { aspect: 'Train/Test Split', values: {} };
  for (const paper of papers) {
    const text = `${paper.methodology} ${paper.results}`;
    const splitPatterns: RegExp[] = [
      /(\d+)\s*[:/]\s*(\d+)\s*[:/]\s*(\d+)/g,
      /(\d+\.?\d*)\s*%\s*[-/]\s*(\d+\.?\d*)\s*%\s*[-/]\s*(\d+\.?\d*)\s*%/g,
      /train(?:ing)?\s*(?::|set)?\s*(\d+\.?\d*)\s*%/gi,
    ];
    let splitInfo = 'Not specified';
    for (const pattern of splitPatterns) {
      const match = pattern.exec(text);
      if (match) {
        splitInfo = match[0].trim();
        break;
      }
    }
    splitRow.values[paper.id] = splitInfo;
  }
  datasetComparison.push(splitRow);

  // Cross-validation
  const cvRow: ComparisonRow = { aspect: 'Cross-Validation', values: {} };
  for (const paper of papers) {
    const text = `${paper.methodology} ${paper.results}`.toLowerCase();
    if (/\b10-fold\b/gi.test(text) || /\bten-fold\b/gi.test(text)) {
      cvRow.values[paper.id] = '10-fold Cross-Validation';
    } else if (/\b5-fold\b/gi.test(text) || /\bfive-fold\b/gi.test(text)) {
      cvRow.values[paper.id] = '5-fold Cross-Validation';
    } else if (/\bk-fold\b/gi.test(text)) {
      cvRow.values[paper.id] = 'K-fold Cross-Validation';
    } else if (/\bcross[\s-]?val/gi.test(text)) {
      cvRow.values[paper.id] = 'Cross-Validation (unspecified folds)';
    } else if (/\bholdout\b/gi.test(text)) {
      cvRow.values[paper.id] = 'Holdout Validation';
    } else {
      cvRow.values[paper.id] = 'Not specified';
    }
  }
  datasetComparison.push(cvRow);

  // ── 3. Results Comparison ───────────────────────────────────────────────

  const resultsComparison: ComparisonRow[] = [];
  const allMetricsByName: Record<string, Record<string, string>> = {};

  for (const paper of papers) {
    const metrics = extractMetricValues(
      `${paper.results} ${paper.abstract} ${paper.conclusion}`
    );
    for (const [metricName, metricValue] of Object.entries(metrics)) {
      if (!allMetricsByName[metricName]) {
        allMetricsByName[metricName] = {};
      }
      allMetricsByName[metricName][paper.id] = metricValue;
    }
  }

  for (const [metricName, paperValues] of Object.entries(allMetricsByName)) {
    // Fill in missing papers with "Not reported"
    const fullValues: Record<string, string> = {};
    for (const paperId of paperIds) {
      fullValues[paperId] = paperValues[paperId] || 'Not reported';
    }
    resultsComparison.push({ aspect: metricName, values: fullValues });
  }

  // If no metrics found, add a general row
  if (resultsComparison.length === 0) {
    const generalRow: ComparisonRow = { aspect: 'Reported Results', values: {} };
    for (const paper of papers) {
      const resultSnippet = paper.results
        ? paper.results.substring(0, 150) + (paper.results.length > 150 ? '...' : '')
        : 'Not reported';
      generalRow.values[paper.id] = resultSnippet;
    }
    resultsComparison.push(generalRow);
  }

  // ── 4. Conflict Detection ───────────────────────────────────────────────

  const conflicts: ConflictItem[] = [];

  // Detect conflicting results: same metric, similar task, significantly different values
  for (const [metricName, paperValues] of Object.entries(allMetricsByName)) {
    const paperIdsWithValues = Object.keys(paperValues);
    if (paperIdsWithValues.length < 2) continue;

    for (let i = 0; i < paperIdsWithValues.length; i++) {
      for (let j = i + 1; j < paperIdsWithValues.length; j++) {
        const idA = paperIdsWithValues[i];
        const idB = paperIdsWithValues[j];
        const valA = normalizeNumber(paperValues[idA]);
        const valB = normalizeNumber(paperValues[idB]);

        if (valA !== null && valB !== null) {
          const diff = Math.abs(valA - valB);
          const avg = (valA + valB) / 2;
          const relativeDiff = avg !== 0 ? (diff / avg) * 100 : 0;

          // If relative difference > 20%, flag as conflict
          if (relativeDiff > 20) {
            conflicts.push({
              aspect: metricName,
              paperA: idA,
              paperB: idB,
              valueA: paperValues[idA],
              valueB: paperValues[idB],
            });
          }
        }
      }
    }
  }

  // Detect conflicting methodology choices
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const paperA = papers[i];
      const paperB = papers[j];

      // Check if papers address similar topics but use fundamentally different approaches
      const commonTopics = paperA.topics.filter((t) => paperB.topics.includes(t));
      if (commonTopics.length > 0) {
        const methodsA = extractMatches(`${paperA.methodology} ${paperA.abstract}`, METHODOLOGY_KEYWORDS);
        const methodsB = extractMatches(`${paperB.methodology} ${paperB.abstract}`, METHODOLOGY_KEYWORDS);

        // Conflicting paradigms
        const paradigmA = methodsA.filter((m) =>
          ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning'].includes(m)
        );
        const paradigmB = methodsB.filter((m) =>
          ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning'].includes(m)
        );

        if (paradigmA.length > 0 && paradigmB.length > 0) {
          const hasOverlap = paradigmA.some((p) => paradigmB.includes(p));
          if (!hasOverlap) {
            conflicts.push({
              aspect: 'Learning Paradigm',
              paperA: paperA.id,
              paperB: paperB.id,
              valueA: paradigmA.join(', '),
              valueB: paradigmB.join(', '),
            });
          }
        }

        // Conflicting architectures for similar tasks
        const archA = methodsA.filter((m) =>
          ['Transformer', 'CNN', 'RNN', 'LSTM', 'GAN', 'VAE', 'SVM', 'Random Forest'].includes(m)
        );
        const archB = methodsB.filter((m) =>
          ['Transformer', 'CNN', 'RNN', 'LSTM', 'GAN', 'VAE', 'SVM', 'Random Forest'].includes(m)
        );

        if (archA.length > 0 && archB.length > 0) {
          const hasOverlap = archA.some((a) => archB.includes(a));
          if (!hasOverlap) {
            // Only flag as conflict if they both claim to solve the same problem
            const focusA = paperA.researchFocus.toLowerCase();
            const focusB = paperB.researchFocus.toLowerCase();
            const focusWordsA = focusA.split(/\s+/).filter((w) => w.length > 4);
            const focusOverlap = focusWordsA.some((w) => focusB.includes(w));
            if (focusOverlap) {
              conflicts.push({
                aspect: 'Model Architecture Choice',
                paperA: paperA.id,
                paperB: paperB.id,
                valueA: archA.join(', '),
                valueB: archB.join(', '),
              });
            }
          }
        }
      }
    }
  }

  // ── 5. Similarity Detection ─────────────────────────────────────────────

  const similarities: string[] = [];

  // Common methodologies
  const allMethodSets: Map<string, Set<string>> = new Map();
  for (const paper of papers) {
    const methods = extractMatches(
      `${paper.methodology} ${paper.abstract}`,
      METHODOLOGY_KEYWORDS
    );
    allMethodSets.set(paper.id, new Set(methods));
  }

  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const methodsA = allMethodSets.get(papers[i].id)!;
      const methodsB = allMethodSets.get(papers[j].id)!;
      const commonMethods = [...methodsA].filter((m) => methodsB.has(m));

      if (commonMethods.length > 0) {
        const titleA = papers[i].title.length > 60 ? papers[i].title.substring(0, 57) + '...' : papers[i].title;
        const titleB = papers[j].title.length > 60 ? papers[j].title.substring(0, 57) + '...' : papers[j].title;
        similarities.push(
          `"${titleA}" and "${titleB}" share common methodologies: ${commonMethods.join(', ')}`
        );
      }
    }
  }

  // Common datasets
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const datasetsA = extractMatches(
        `${papers[i].methodology} ${papers[i].results} ${papers[i].abstract}`,
        DATASET_KEYWORDS
      );
      const datasetsB = extractMatches(
        `${papers[j].methodology} ${papers[j].results} ${papers[j].abstract}`,
        DATASET_KEYWORDS
      );
      const commonDatasets = datasetsA.filter((d) => datasetsB.includes(d));

      if (commonDatasets.length > 0) {
        const titleA = papers[i].title.length > 60 ? papers[i].title.substring(0, 57) + '...' : papers[i].title;
        const titleB = papers[j].title.length > 60 ? papers[j].title.substring(0, 57) + '...' : papers[j].title;
        similarities.push(
          `"${titleA}" and "${titleB}" both evaluate on: ${commonDatasets.join(', ')}`
        );
      }
    }
  }

  // Common topics
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const commonTopics = papers[i].topics.filter((t) => papers[j].topics.includes(t));
      if (commonTopics.length > 0) {
        const titleA = papers[i].title.length > 60 ? papers[i].title.substring(0, 57) + '...' : papers[i].title;
        const titleB = papers[j].title.length > 60 ? papers[j].title.substring(0, 57) + '...' : papers[j].title;
        similarities.push(
          `"${titleA}" and "${titleB}" address overlapping topics: ${commonTopics.join(', ')}`
        );
      }
    }
  }

  // Common research focus
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      if (papers[i].researchFocus && papers[j].researchFocus) {
        const focusA = papers[i].researchFocus.toLowerCase().split(/\s+/);
        const focusB = papers[j].researchFocus.toLowerCase().split(/\s+/);
        const significantOverlap = focusA.filter(
          (w) => w.length > 4 && focusB.includes(w)
        );
        if (significantOverlap.length >= 2) {
          const titleA = papers[i].title.length > 60 ? papers[i].title.substring(0, 57) + '...' : papers[i].title;
          const titleB = papers[j].title.length > 60 ? papers[j].title.substring(0, 57) + '...' : papers[j].title;
          similarities.push(
            `"${titleA}" and "${titleB}" share a similar research focus area`
          );
        }
      }
    }
  }

  // Common keywords
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const commonKeywords = papers[i].keywords.filter((k) =>
        papers[j].keywords.map((kw) => kw.toLowerCase()).includes(k.toLowerCase())
      );
      if (commonKeywords.length >= 2) {
        const titleA = papers[i].title.length > 60 ? papers[i].title.substring(0, 57) + '...' : papers[i].title;
        const titleB = papers[j].title.length > 60 ? papers[j].title.substring(0, 57) + '...' : papers[j].title;
        similarities.push(
          `"${titleA}" and "${titleB}" share keywords: ${commonKeywords.join(', ')}`
        );
      }
    }
  }

  // De-duplicate similarities
  const uniqueSimilarities = [...new Set(similarities)];

  return {
    paperIds,
    methodologyComparison,
    datasetComparison,
    resultsComparison,
    conflicts,
    similarities: uniqueSimilarities,
  };
}
