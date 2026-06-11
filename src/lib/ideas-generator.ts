import { generateId } from './utils-uuid';
import type { ExtractedPaper, ResearchGap, ResearchIdea } from '@/lib/types';
import { GAP_TYPE_LABELS } from '@/lib/types';

// ─── Gap-type → idea templates ──────────────────────────────────────────────

interface IdeaTemplate {
  titlePattern: string;
  descriptionPattern: string;
  methodologyPattern: string;
  contributionPattern: string;
  difficulty: 'low' | 'medium' | 'high';
  baseNovelty: number;
  baseFeasibility: number;
}

const GAP_IDEA_TEMPLATES: Record<string, IdeaTemplate[]> = {
  missing_dataset: [
    {
      titlePattern: 'Constructing a Comprehensive Benchmark Dataset for {domain}',
      descriptionPattern: 'Develop a large-scale, diverse, and well-annotated dataset that addresses the current gaps in {domain}. The dataset should cover underrepresented scenarios, edge cases, and demographic groups that existing datasets overlook, enabling more robust evaluation of {focus} methods.',
      methodologyPattern: 'Design a data collection and annotation pipeline following best practices in dataset creation: (1) define comprehensive coverage criteria through literature survey and expert consultation; (2) implement scalable data collection from diverse sources; (3) develop quality assurance protocols with multi-annotator agreement; (4) establish benchmark tasks and baselines; (5) conduct bias and fairness audits.',
      contributionPattern: 'A new publicly available benchmark dataset that fills critical coverage gaps, along with baseline results that reveal the limitations of current methods and motivate future research.',
      difficulty: 'medium',
      baseNovelty: 55,
      baseFeasibility: 70,
    },
    {
      titlePattern: 'Cross-Domain Dataset Synthesis and Augmentation for {domain}',
      descriptionPattern: 'Propose systematic data synthesis and augmentation strategies to address dataset scarcity in {domain}. Leverage generative models and domain adaptation techniques to create realistic synthetic data that complements existing datasets, particularly for rare and underrepresented scenarios.',
      methodologyPattern: '(1) Analyze distribution gaps in existing datasets; (2) train conditional generative models for realistic data synthesis; (3) apply domain adaptation to transfer knowledge from resource-rich domains; (4) validate synthetic data quality through downstream task performance; (5) establish guidelines for responsible use of synthetic data.',
      contributionPattern: 'A principled framework for generating high-quality synthetic training and evaluation data, reducing dependency on costly manual data collection while maintaining benchmark validity.',
      difficulty: 'high',
      baseNovelty: 72,
      baseFeasibility: 50,
    },
    {
      titlePattern: 'Meta-Analysis of Dataset Biases and Their Impact on {domain} Research',
      descriptionPattern: 'Conduct a systematic meta-analysis of biases present in commonly used datasets for {domain}, quantifying how these biases affect reported results and leading to potentially misleading conclusions about method effectiveness.',
      methodologyPattern: '(1) Catalog and categorize biases across major datasets; (2) design controlled experiments measuring bias impact on model performance; (3) develop bias-aware evaluation protocols; (4) propose de-biasing strategies and re-evaluate methods; (5) create a living repository tracking dataset biases.',
      contributionPattern: 'A comprehensive bias taxonomy and quantified impact analysis that enables the community to make more informed dataset choices and interpret results with appropriate caveats.',
      difficulty: 'medium',
      baseNovelty: 60,
      baseFeasibility: 65,
    },
    {
      titlePattern: 'Low-Resource Dataset Construction via Active Learning for {domain}',
      descriptionPattern: 'Design an active learning framework that maximizes the informational value of limited annotation budgets for {domain}, intelligently selecting the most informative samples for labeling to create effective datasets with minimal resources.',
      methodologyPattern: '(1) Develop acquisition functions tailored to {domain} characteristics; (2) implement active learning loops with model-in-the-loop annotation; (3) compare data efficiency against random sampling baselines; (4) validate on multiple downstream tasks; (5) release annotation-efficient benchmark subsets.',
      contributionPattern: 'An annotation-efficient dataset creation methodology that achieves competitive performance with a fraction of the labeling cost, making high-quality dataset creation accessible to resource-constrained research groups.',
      difficulty: 'medium',
      baseNovelty: 65,
      baseFeasibility: 60,
    },
  ],

  methodology_gap: [
    {
      titlePattern: 'A Novel {domain} Framework Bridging Methodological Gaps in {focus}',
      descriptionPattern: 'Develop a new methodological framework for {domain} that addresses identified gaps in current approaches. The framework should integrate complementary techniques to overcome limitations of individual methods and provide a more robust and generalizable solution for {focus}.',
      methodologyPattern: '(1) Conduct systematic analysis of methodological limitations in current approaches; (2) design a hybrid framework that combines strengths of complementary methods; (3) develop theoretical justification for the proposed integration; (4) implement and validate on standard benchmarks; (5) perform ablation studies to understand component contributions.',
      contributionPattern: 'A principled methodological framework that demonstrably overcomes limitations of existing approaches, supported by theoretical analysis and empirical validation across multiple benchmarks.',
      difficulty: 'high',
      baseNovelty: 78,
      baseFeasibility: 45,
    },
    {
      titlePattern: 'Systematic Method Comparison and Best Practices for {domain}',
      descriptionPattern: 'Conduct the first comprehensive, controlled comparison of all major methodological approaches for {domain}, identifying conditions under which each method excels and fails, leading to evidence-based best practice recommendations.',
      methodologyPattern: '(1) Implement all major methods under a unified codebase with consistent hyperparameter tuning; (2) evaluate across diverse datasets and conditions; (3) analyze failure modes and success factors; (4) develop method selection guidelines; (5) release reproducible benchmarking toolkit.',
      contributionPattern: 'The first rigorous, reproducible method comparison that provides actionable guidance for practitioners and reveals previously unknown strengths and weaknesses of existing approaches.',
      difficulty: 'medium',
      baseNovelty: 50,
      baseFeasibility: 70,
    },
    {
      titlePattern: 'Adaptive Methodology Selection for {domain} via Meta-Learning',
      descriptionPattern: 'Develop a meta-learning system that automatically selects and configures the best methodology for a given {domain} task, eliminating the need for manual method selection and hyperparameter tuning.',
      methodologyPattern: '(1) Define a task representation space for {domain}; (2) collect performance metadata across methods and tasks; (3) train a meta-learner to predict optimal methods given task characteristics; (4) validate on held-out tasks; (5) analyze when and why the meta-learner succeeds or fails.',
      contributionPattern: 'An automated methodology selection system that reduces the expertise barrier for {domain} research and often discovers non-obvious method-task pairings that outperform common defaults.',
      difficulty: 'high',
      baseNovelty: 82,
      baseFeasibility: 40,
    },
  ],

  conflicting_results: [
    {
      titlePattern: 'Resolving Conflicting Empirical Findings in {domain}: A Rigorous Reproducibility Study',
      descriptionPattern: 'Conduct controlled reproduction experiments to resolve contradictions in reported results for {domain}. Identify whether conflicts stem from implementation differences, evaluation inconsistencies, or genuine methodological factors, and establish standardized evaluation protocols.',
      methodologyPattern: '(1) Reproduce all conflicting results from scratch using shared code and data; (2) systematically vary potential confounding factors (implementation, hardware, random seeds, evaluation protocol); (3) conduct sensitivity analysis to identify critical factors; (4) propose standardized evaluation and reporting guidelines; (5) create a community benchmark with fixed evaluation protocols.',
      contributionPattern: 'Definitive resolution of key contradictions in the literature, along with evaluation standards that prevent similar conflicts from arising in future work.',
      difficulty: 'medium',
      baseNovelty: 55,
      baseFeasibility: 65,
    },
    {
      titlePattern: 'A Unified Theoretical Framework Explaining Divergent Results in {domain}',
      descriptionPattern: 'Develop a theoretical framework that can explain and predict when and why different methods produce conflicting results in {domain}. The framework should identify the conditions under which each approach is expected to outperform others.',
      methodologyPattern: '(1) Formalize the task and method assumptions mathematically; (2) derive conditions under which each method is provably optimal; (3) validate theoretical predictions empirically; (4) identify previously unknown regime boundaries; (5) develop practical guidelines based on the theory.',
      contributionPattern: 'A principled theoretical understanding that unifies seemingly contradictory empirical findings and provides predictive guidance for method selection.',
      difficulty: 'high',
      baseNovelty: 85,
      baseFeasibility: 35,
    },
    {
      titlePattern: 'Meta-Analytic Reconciliation of Conflicting Claims in {domain}',
      descriptionPattern: 'Perform a rigorous meta-analysis of all published results in {domain}, using statistical methods to reconcile conflicting findings and identify the true effect sizes and confidence intervals for key methodological comparisons.',
      methodologyPattern: '(1) Systematically collect all published experimental results; (2) apply meta-analytic methods (random-effects models, moderator analysis); (3) test for publication bias; (4) estimate true effect sizes with confidence intervals; (5) identify moderators that explain heterogeneity across studies.',
      contributionPattern: 'The first quantitative, statistically rigorous synthesis of the conflicting literature, providing reliable effect size estimates and identifying the key factors driving reported differences.',
      difficulty: 'medium',
      baseNovelty: 58,
      baseFeasibility: 68,
    },
  ],

  no_real_world_validation: [
    {
      titlePattern: 'From Benchmarks to Reality: Real-World Validation of {domain} Methods',
      descriptionPattern: 'Bridge the gap between benchmark performance and real-world deployment for {domain} by conducting extensive real-world validation studies. Identify failure modes that only appear in practice and develop robustness improvement strategies.',
      methodologyPattern: '(1) Deploy state-of-the-art methods in real-world settings; (2) collect and analyze failure cases; (3) identify distribution shifts and practical challenges; (4) develop robustness-enhancing techniques; (5) establish real-world evaluation protocols and benchmarks.',
      contributionPattern: 'The first comprehensive real-world validation study that reveals the practical limitations of current methods and provides a roadmap for improving deployment reliability.',
      difficulty: 'high',
      baseNovelty: 70,
      baseFeasibility: 45,
    },
    {
      titlePattern: 'Sim-to-Real Transfer Framework for {domain} with Robustness Guarantees',
      descriptionPattern: 'Develop a systematic sim-to-real transfer framework for {domain} that provides robustness guarantees when moving from controlled benchmarks to real-world deployment, addressing the critical gap in practical validation.',
      methodologyPattern: '(1) Characterize sim-to-real gaps through controlled experiments; (2) develop domain randomization and adaptation techniques; (3) establish formal robustness bounds; (4) validate transfer effectiveness across multiple real-world scenarios; (5) create a transfer benchmark with paired sim/real data.',
      contributionPattern: 'A principled transfer framework with provable robustness guarantees that significantly reduces the performance gap between benchmark and real-world deployment.',
      difficulty: 'high',
      baseNovelty: 78,
      baseFeasibility: 38,
    },
    {
      titlePattern: 'Continuous Monitoring and Adaptation System for {domain} in Production',
      descriptionPattern: 'Design a continuous monitoring and adaptation system for deployed {domain} models that detects performance degradation in real-world conditions and triggers automated model updates, closing the loop between research and practice.',
      methodologyPattern: '(1) Define drift detection metrics for {domain}; (2) develop online adaptation algorithms; (3) design human-in-the-loop feedback mechanisms; (4) implement A/B testing framework for model updates; (5) validate on longitudinal deployment data.',
      contributionPattern: 'An end-to-end monitoring and adaptation system that maintains model performance in production environments, bridging the gap between one-time evaluation and sustained real-world effectiveness.',
      difficulty: 'high',
      baseNovelty: 75,
      baseFeasibility: 42,
    },
  ],

  small_sample_size: [
    {
      titlePattern: 'Statistically Robust {domain} Methods for Small-Sample Regimes',
      descriptionPattern: 'Develop methods specifically designed for small-sample scenarios in {domain} that provide reliable performance estimates and avoid overfitting. Incorporate statistical rigor into model selection and evaluation under data scarcity.',
      methodologyPattern: '(1) Analyze overfitting patterns in small-sample regimes; (2) develop regularization strategies tailored to limited data; (3) implement proper statistical testing for small samples; (4) leverage prior knowledge and data augmentation; (5) validate with power analysis and confidence intervals.',
      contributionPattern: 'Statistically principled methods that provide reliable results even with limited data, along with guidelines for appropriate experimental design and reporting in small-sample settings.',
      difficulty: 'medium',
      baseNovelty: 62,
      baseFeasibility: 60,
    },
    {
      titlePattern: 'Few-Shot and Data-Efficient Learning for {domain}',
      descriptionPattern: 'Apply and extend few-shot and data-efficient learning techniques to {domain}, enabling effective model training with significantly fewer labeled examples than currently required.',
      methodologyPattern: '(1) Adapt few-shot learning paradigms to {domain}; (2) develop task-specific inductive biases; (3) leverage pre-trained representations for knowledge transfer; (4) design episodic training protocols; (5) benchmark data efficiency across methods.',
      contributionPattern: 'A data-efficient learning framework that achieves competitive performance with orders of magnitude less training data, democratizing {domain} research for low-resource settings.',
      difficulty: 'high',
      baseNovelty: 72,
      baseFeasibility: 48,
    },
    {
      titlePattern: 'Bayesian Approaches for Reliable {domain} Under Data Scarcity',
      descriptionPattern: 'Develop Bayesian methods for {domain} that provide well-calibrated uncertainty estimates and robust predictions when training data is scarce, enabling reliable decision-making under uncertainty.',
      methodologyPattern: '(1) Design appropriate prior distributions incorporating domain knowledge; (2) develop scalable posterior inference methods; (3) validate uncertainty calibration; (4) demonstrate robustness under distribution shift; (5) compare with frequentist approaches on small-sample benchmarks.',
      contributionPattern: 'Bayesian methods with reliable uncertainty quantification for {domain}, enabling practitioners to make informed decisions even when data is limited and model confidence matters.',
      difficulty: 'high',
      baseNovelty: 68,
      baseFeasibility: 50,
    },
  ],

  missing_edge_case: [
    {
      titlePattern: 'Comprehensive Edge-Case Testing and Robustification for {domain}',
      descriptionPattern: 'Systematically identify, test, and address edge cases in {domain} methods. Develop targeted test suites for rare but critical scenarios and create methods that gracefully handle these challenging inputs.',
      methodologyPattern: '(1) Define edge-case taxonomy through systematic analysis; (2) create targeted test suites for each category; (3) evaluate state-of-the-art methods on edge cases; (4) develop robustification techniques; (5) validate improved coverage without sacrificing typical-case performance.',
      contributionPattern: 'The first comprehensive edge-case benchmark for {domain} along with robustification methods that significantly improve performance on rare but important scenarios.',
      difficulty: 'medium',
      baseNovelty: 60,
      baseFeasibility: 62,
    },
    {
      titlePattern: 'Adversarial and Stress Testing Framework for {domain}',
      descriptionPattern: 'Develop an adversarial testing framework for {domain} that automatically discovers failure modes and edge cases through systematic perturbation and challenge generation.',
      methodologyPattern: '(1) Design domain-specific perturbation operators; (2) implement automated test generation via adversarial search; (3) create a severity scoring system for failures; (4) develop targeted robustness training; (5) validate on critical edge-case scenarios.',
      contributionPattern: 'An automated testing framework that systematically exposes vulnerabilities in {domain} methods, enabling proactive identification and fixing of edge-case failures before deployment.',
      difficulty: 'medium',
      baseNovelty: 65,
      baseFeasibility: 55,
    },
    {
      titlePattern: 'Curriculum Learning with Progressive Edge-Case Exposure for {domain}',
      descriptionPattern: 'Design a curriculum learning approach for {domain} that progressively exposes models to increasingly difficult edge cases during training, building robustness in a principled manner.',
      methodologyPattern: '(1) Define difficulty metrics for edge cases; (2) design curriculum schedules; (3) implement difficulty-aware sampling; (4) evaluate generalization to held-out edge cases; (5) analyze learning dynamics and convergence properties.',
      contributionPattern: 'A curriculum learning framework that builds edge-case robustness incrementally, achieving better performance on rare scenarios without sacrificing efficiency on common inputs.',
      difficulty: 'medium',
      baseNovelty: 64,
      baseFeasibility: 58,
    },
  ],

  outdated_method: [
    {
      titlePattern: 'Modernizing {domain}: Applying State-of-the-Art Techniques to Revisit Classic Problems',
      descriptionPattern: 'Revisit classic problems in {domain} using modern techniques that have proven successful in related areas. Demonstrate that contemporary methods can significantly outperform established baselines and challenge existing conclusions.',
      methodologyPattern: '(1) Identify problems where outdated methods remain standard; (2) apply modern architectures and training strategies; (3) conduct fair comparisons with properly tuned baselines; (4) analyze sources of improvement; (5) provide updated benchmarks and recommendations.',
      contributionPattern: 'Demonstrated significant performance improvements on established problems using modern methods, along with updated best practices and benchmark results that raise the state of the art.',
      difficulty: 'low',
      baseNovelty: 45,
      baseFeasibility: 80,
    },
    {
      titlePattern: 'Neural Scaling Laws for {domain}: When Do Modern Methods Surpass Classical Approaches?',
      descriptionPattern: 'Investigate scaling laws in {domain} to understand at what data and compute scales modern deep learning methods become preferable to classical approaches, providing practical guidance for method selection.',
      methodologyPattern: '(1) Train models at multiple scales for both classical and modern methods; (2) fit scaling law models to predict performance; (3) identify crossover points where modern methods become advantageous; (4) analyze computational cost-performance trade-offs; (5) develop practical decision frameworks.',
      contributionPattern: 'Scaling law analysis that provides practical, data-driven guidance on when to adopt modern versus classical methods based on available resources and performance requirements.',
      difficulty: 'medium',
      baseNovelty: 68,
      baseFeasibility: 55,
    },
    {
      titlePattern: 'Hybrid Classical-Modern Approaches for {domain}',
      descriptionPattern: 'Develop hybrid methods that combine the interpretability and theoretical guarantees of classical approaches with the representational power of modern deep learning for {domain}, achieving the best of both worlds.',
      methodologyPattern: '(1) Analyze complementary strengths of classical and modern methods; (2) design integration architectures that preserve theoretical properties; (3) develop training procedures for hybrid models; (4) validate interpretability and performance claims; (5) compare against pure classical and pure modern baselines.',
      contributionPattern: 'Hybrid methods that achieve competitive performance with modern approaches while maintaining interpretability and theoretical guarantees of classical methods.',
      difficulty: 'high',
      baseNovelty: 76,
      baseFeasibility: 42,
    },
  ],

  cross_domain_gap: [
    {
      titlePattern: 'Cross-Domain Transfer and Adaptation for {domain}',
      descriptionPattern: 'Investigate cross-domain transfer for {domain}, developing methods that effectively leverage knowledge and techniques from related domains. Address domain shift and adaptation challenges to enable knowledge transfer at scale.',
      methodologyPattern: '(1) Identify source domains with transferable knowledge; (2) develop domain adaptation techniques for {domain}; (3) design domain-invariant representations; (4) validate transfer effectiveness across multiple domain pairs; (5) analyze what transfers and what does not.',
      contributionPattern: 'A cross-domain transfer framework that enables effective knowledge reuse from related domains, reducing the need for domain-specific data and expertise.',
      difficulty: 'high',
      baseNovelty: 75,
      baseFeasibility: 45,
    },
    {
      titlePattern: 'Universal {domain} Representations via Multi-Domain Pre-Training',
      descriptionPattern: 'Develop universal representations for {domain} by pre-training on data from multiple related domains, creating a foundation model that can be efficiently adapted to new domains and tasks with minimal fine-tuning.',
      methodologyPattern: '(1) Curate multi-domain training data; (2) design domain-aware pre-training objectives; (3) implement efficient fine-tuning strategies for new domains; (4) evaluate zero-shot and few-shot transfer; (5) analyze representation properties across domains.',
      contributionPattern: 'A universal pre-trained model for {domain} that achieves strong performance across diverse domains with minimal adaptation, serving as a foundation for future research.',
      difficulty: 'high',
      baseNovelty: 80,
      baseFeasibility: 35,
    },
    {
      titlePattern: 'Bridging Domain Boundaries: A Systematic Study of Domain Shift in {domain}',
      descriptionPattern: 'Conduct a systematic study of domain shift effects in {domain}, characterizing the types and magnitudes of shift encountered in practice and developing diagnostic tools for assessing transfer feasibility.',
      methodologyPattern: '(1) Taxonomize types of domain shift in {domain}; (2) measure shift magnitude across domain pairs using multiple metrics; (3) correlate shift measures with transfer performance; (4) develop predictive models for transfer success; (5) create diagnostic tools for practitioners.',
      contributionPattern: 'A comprehensive characterization of domain shift in {domain} and practical diagnostic tools that enable researchers to predict and mitigate transfer failures.',
      difficulty: 'medium',
      baseNovelty: 62,
      baseFeasibility: 60,
    },
  ],

  limited_scope: [
    {
      titlePattern: 'Scaling {domain} Methods: From Limited-Scope Proof-of-Concept to Generalizable Solutions',
      descriptionPattern: 'Extend limited-scope methods in {domain} to work robustly across diverse settings, input types, and scales. Identify and remove the assumptions that restrict current approaches and develop more general solutions.',
      methodologyPattern: '(1) Catalog limiting assumptions in current methods; (2) design experiments that test boundary conditions; (3) develop generalized methods that relax key assumptions; (4) validate across diverse settings and scales; (5) establish generalization benchmarks.',
      contributionPattern: 'Generalized methods that work reliably across the full range of {domain} scenarios, removing key limitations that have restricted the applicability of existing approaches.',
      difficulty: 'high',
      baseNovelty: 65,
      baseFeasibility: 45,
    },
    {
      titlePattern: 'Multi-Task and Multi-Domain Generalization for {domain}',
      descriptionPattern: 'Develop multi-task and multi-domain learning approaches for {domain} that go beyond single-task evaluations, creating methods that generalize across the full breadth of {domain} applications.',
      methodologyPattern: '(1) Define a comprehensive task suite for {domain}; (2) develop multi-task learning architectures; (3) implement negative transfer mitigation; (4) evaluate generalization to held-out tasks and domains; (5) analyze task relationships and knowledge sharing.',
      contributionPattern: 'Multi-task methods with strong generalization across the breadth of {domain}, along with analysis of task relationships that informs future architecture and training design.',
      difficulty: 'high',
      baseNovelty: 70,
      baseFeasibility: 42,
    },
    {
      titlePattern: 'Robust {domain} Under Distribution Shift: Expanding the Scope of Applicability',
      descriptionPattern: 'Develop methods for {domain} that maintain performance under distribution shift, expanding the scope beyond controlled laboratory conditions to the full diversity of real-world inputs.',
      methodologyPattern: '(1) Characterize common distribution shifts in {domain}; (2) collect or synthesize shifted test data; (3) develop distributionally robust optimization methods; (4) validate on increasingly severe shifts; (5) establish robustness benchmarks.',
      contributionPattern: 'Distributionally robust methods for {domain} with provable guarantees under common shift types, expanding the practical applicability of {domain} methods.',
      difficulty: 'high',
      baseNovelty: 72,
      baseFeasibility: 40,
    },
  ],

  reproducibility_issue: [
    {
      titlePattern: 'Reproducibility-First Design for {domain} Research',
      descriptionPattern: 'Develop a reproducibility framework for {domain} that includes standardized implementations, evaluation protocols, and reporting standards, addressing the critical reproducibility crisis in the field.',
      methodologyPattern: '(1) Identify common sources of irreproducibility; (2) develop standardized codebases with fixed random seeds and deterministic operations; (3) create reproducibility checklists and reporting templates; (4) validate by independent reproduction attempts; (5) establish community standards and tooling.',
      contributionPattern: 'A comprehensive reproducibility toolkit and reporting standards that, when adopted, guarantee that {domain} results can be independently verified and extended.',
      difficulty: 'medium',
      baseNovelty: 45,
      baseFeasibility: 72,
    },
    {
      titlePattern: 'Automated Hyperparameter Sensitivity Analysis for {domain}',
      descriptionPattern: 'Conduct systematic hyperparameter sensitivity analysis for {domain} methods, identifying which hyperparameters critically affect results and developing robust configurations that are insensitive to minor variations.',
      methodologyPattern: '(1) Define hyperparameter spaces for key methods; (2) conduct large-scale grid/random search; (3) analyze sensitivity using variance decomposition; (4) identify stable configurations; (5) develop self-tuning methods that adapt hyperparameters automatically.',
      contributionPattern: 'Sensitivity profiles for major {domain} methods that reveal which results are robust and which are fragile, along with self-tuning methods that eliminate manual hyperparameter sensitivity.',
      difficulty: 'medium',
      baseNovelty: 52,
      baseFeasibility: 65,
    },
    {
      titlePattern: 'Deterministic Training and Evaluation Protocols for {domain}',
      descriptionPattern: 'Design fully deterministic training and evaluation protocols for {domain} that eliminate sources of random variation, enabling bit-exact reproduction of results across hardware and software environments.',
      methodologyPattern: '(1) Identify all sources of non-determinism; (2) implement deterministic alternatives; (3) validate numerical equivalence across environments; (4) measure performance cost of determinism; (5) develop practical guidelines for reproducible research.',
      contributionPattern: 'Deterministic protocols that enable exact reproduction of {domain} results, along with analysis of the performance-cost trade-off of full determinism.',
      difficulty: 'medium',
      baseNovelty: 48,
      baseFeasibility: 70,
    },
  ],

  ethical_concern: [
    {
      titlePattern: 'Fairness-Aware {domain}: Detecting and Mitigating Bias in {focus}',
      descriptionPattern: 'Develop fairness-aware methods for {domain} that systematically detect and mitigate biases related to protected attributes. Ensure that {domain} methods do not perpetuate or amplify societal inequities.',
      methodologyPattern: '(1) Define fairness criteria relevant to {domain}; (2) develop bias detection metrics and auditing tools; (3) implement debiasing techniques at pre-processing, in-processing, and post-processing stages; (4) validate fairness improvements without excessive performance degradation; (5) establish fairness benchmarks.',
      contributionPattern: 'Fairness-aware methods and auditing tools for {domain} that enable practitioners to identify and mitigate bias, promoting equitable outcomes in {focus} applications.',
      difficulty: 'high',
      baseNovelty: 68,
      baseFeasibility: 48,
    },
    {
      titlePattern: 'Privacy-Preserving {domain} Methods with Formal Guarantees',
      descriptionPattern: 'Develop privacy-preserving methods for {domain} that provide formal differential privacy guarantees while maintaining useful performance levels, addressing critical privacy concerns in sensitive applications.',
      methodologyPattern: '(1) Define privacy requirements for {domain} applications; (2) implement differentially private training procedures; (3) analyze privacy-utility trade-offs; (4) develop privacy-preserving data sharing mechanisms; (5) validate on sensitive-domain datasets.',
      contributionPattern: 'Privacy-preserving methods with formal guarantees for {domain}, enabling the use of sensitive data while providing mathematical privacy assurances.',
      difficulty: 'high',
      baseNovelty: 72,
      baseFeasibility: 42,
    },
    {
      titlePattern: 'Ethical Impact Assessment Framework for {domain} Research',
      descriptionPattern: 'Create a structured ethical impact assessment framework for {domain} research that helps researchers anticipate, evaluate, and mitigate potential negative societal impacts of their work.',
      methodologyPattern: '(1) Survey ethical concerns in {domain} literature; (2) develop structured assessment questionnaires; (3) create scoring rubrics for impact severity; (4) validate through retrospective analysis of published work; (5) deploy and iteratively refine with community feedback.',
      contributionPattern: 'A practical ethical impact assessment framework that makes it easier for researchers to proactively identify and address ethical concerns, improving the societal responsibility of {domain} research.',
      difficulty: 'low',
      baseNovelty: 55,
      baseFeasibility: 72,
    },
  ],

  scalability_limitation: [
    {
      titlePattern: 'Scalable {domain} Methods for Large-Scale Deployment',
      descriptionPattern: 'Develop scalable methods for {domain} that maintain effectiveness when applied to large datasets, high-dimensional inputs, or high-throughput scenarios. Address computational, memory, and latency bottlenecks.',
      methodologyPattern: '(1) Profile scalability bottlenecks in existing methods; (2) develop efficient algorithms with reduced computational complexity; (3) implement distributed and parallel processing strategies; (4) optimize memory usage via efficient representations; (5) benchmark scalability on increasingly large inputs.',
      contributionPattern: 'Scalable methods that reduce computational costs by orders of magnitude while maintaining performance, enabling {domain} deployment at production scale.',
      difficulty: 'high',
      baseNovelty: 62,
      baseFeasibility: 50,
    },
    {
      titlePattern: 'Efficient {domain} via Model Compression and Distillation',
      descriptionPattern: 'Apply model compression and knowledge distillation techniques to {domain} to create lightweight models that retain the performance of large models while being deployable in resource-constrained environments.',
      methodologyPattern: '(1) Identify performance-critical model components; (2) apply pruning, quantization, and distillation; (3) develop task-specific compression strategies; (4) evaluate compression-performance trade-offs; (5) validate on edge deployment scenarios.',
      contributionPattern: 'Compressed {domain} models that achieve 10-100x efficiency improvements with minimal performance loss, enabling deployment on edge devices and in latency-sensitive applications.',
      difficulty: 'medium',
      baseNovelty: 55,
      baseFeasibility: 62,
    },
    {
      titlePattern: 'Incremental and Streaming {domain} for Continuously Growing Data',
      descriptionPattern: 'Develop incremental and streaming learning methods for {domain} that can efficiently process continuously arriving data without requiring full retraining, addressing scalability limitations for real-time applications.',
      methodologyPattern: '(1) Design streaming-compatible model architectures; (2) implement efficient incremental update algorithms; (3) develop catastrophic forgetting prevention mechanisms; (4) evaluate on streaming data benchmarks; (5) analyze latency and throughput trade-offs.',
      contributionPattern: 'Incremental learning methods that enable {domain} systems to continuously learn from data streams, removing the need for costly periodic retraining.',
      difficulty: 'high',
      baseNovelty: 70,
      baseFeasibility: 45,
    },
  ],
};

// ─── Cross-pollination idea generators ───────────────────────────────────────

interface CrossPollinationStrategy {
  generate: (papers: ExtractedPaper[]) => ResearchIdea[];
}

const crossPollinationStrategies: CrossPollinationStrategy[] = [
  // Strategy 1: Method from one paper → domain of another
  {
    generate: (papers): ResearchIdea[] => {
      if (papers.length < 2) return [];
      const ideas: ResearchIdea[] = [];

      for (let i = 0; i < papers.length; i++) {
        for (let j = 0; j < papers.length; j++) {
          if (i === j) continue;

          const sourcePaper = papers[i];
          const targetPaper = papers[j];

          // Only generate if the papers have different research focuses
          const sourceFocus = sourcePaper.researchFocus.toLowerCase();
          const targetFocus = targetPaper.researchFocus.toLowerCase();
          const focusWordsA = sourceFocus.split(/\s+/).filter((w) => w.length > 4);
          const focusOverlap = focusWordsA.filter((w) => targetFocus.includes(w));
          if (focusOverlap.length > focusWordsA.length * 0.6) continue;

          const sourceMethods = extractMethodNames(sourcePaper);
          if (sourceMethods.length === 0) continue;

          ideas.push({
            id: generateId(),
            title: `Applying ${sourceMethods[0]} from ${truncateTitle(sourcePaper.title)} to ${extractDomainLabel(targetPaper)}`,
            description: `This research proposes applying the ${sourceMethods[0]} methodology, originally developed for ${truncateTitle(sourcePaper.title)}, to the domain of ${extractDomainLabel(targetPaper)}. By transferring this approach, we aim to leverage its strengths—demonstrated in the source domain—to address challenges in the target domain that current methods have not adequately resolved.`,
            methodology: `(1) Analyze the theoretical assumptions of ${sourceMethods[0]} in the source domain; (2) identify domain-specific adaptations needed for ${extractDomainLabel(targetPaper)}; (3) implement the transferred methodology with necessary modifications; (4) conduct comparative experiments against domain-specific baselines from ${truncateTitle(targetPaper.title)}; (5) analyze transfer effectiveness and identify failure modes.`,
            expectedContribution: `A novel application of ${sourceMethods[0]} to ${extractDomainLabel(targetPaper)}, potentially opening a new research direction by bridging two previously disconnected areas. The cross-domain transfer may reveal both the generality of the method and domain-specific challenges that require further innovation.`,
            difficulty: 'high',
            relatedGaps: [],
            noveltyScore: clampScore(75 + Math.floor(Math.random() * 15)),
            feasibilityScore: clampScore(35 + Math.floor(Math.random() * 20)),
          });
        }
      }

      return ideas;
    },
  },

  // Strategy 2: Combine approaches from multiple papers
  {
    generate: (papers): ResearchIdea[] => {
      if (papers.length < 2) return [];
      const ideas: ResearchIdea[] = [];

      for (let i = 0; i < papers.length; i++) {
        for (let j = i + 1; j < papers.length; j++) {
          const paperA = papers[i];
          const paperB = papers[j];

          const methodsA = extractMethodNames(paperA);
          const methodsB = extractMethodNames(paperB);

          if (methodsA.length === 0 || methodsB.length === 0) continue;

          // Skip if both use the same primary method
          if (methodsA[0] === methodsB[0]) continue;

          ideas.push({
            id: generateId(),
            title: `Hybrid ${methodsA[0]}-${methodsB[0]} Architecture for Enhanced ${extractDomainLabel(paperA)}`,
            description: `This research proposes a novel hybrid architecture combining the strengths of ${methodsA[0]} (from "${truncateTitle(paperA.title)}") and ${methodsB[0]} (from "${truncateTitle(paperB.title)}"). The hybrid design leverages the complementary capabilities of both approaches: ${methodsA[0]}'s strength in ${inferStrength(methodsA[0])} combined with ${methodsB[0]}'s advantage in ${inferStrength(methodsB[0])}, creating a unified framework that outperforms either approach alone.`,
            methodology: `(1) Analyze the complementary strengths and weaknesses of ${methodsA[0]} and ${methodsB[0]}; (2) design a hybrid architecture that integrates both approaches at appropriate levels; (3) develop joint training procedures; (4) conduct ablation studies isolating each component's contribution; (5) evaluate against pure ${methodsA[0]} and pure ${methodsB[0]} baselines on shared benchmarks.`,
            expectedContribution: `A novel hybrid architecture that demonstrably outperforms individual approaches by leveraging complementary strengths, providing a new paradigm for combining ${methodsA[0]} and ${methodsB[0]} in ${extractDomainLabel(paperA)}.`,
            difficulty: 'high',
            relatedGaps: [],
            noveltyScore: clampScore(70 + Math.floor(Math.random() * 20)),
            feasibilityScore: clampScore(38 + Math.floor(Math.random() * 20)),
          });
        }
      }

      return ideas;
    },
  },

  // Strategy 3: Address contradictions with new experiments
  {
    generate: (papers): ResearchIdea[] => {
      if (papers.length < 2) return [];
      const ideas: ResearchIdea[] = [];

      // Find papers with overlapping topics but different conclusions
      for (let i = 0; i < papers.length; i++) {
        for (let j = i + 1; j < papers.length; j++) {
          const paperA = papers[i];
          const paperB = papers[j];

          const commonTopics = paperA.topics.filter((t) => paperB.topics.includes(t));
          if (commonTopics.length === 0) continue;

          // Check for potentially contradictory conclusions
          const conclusionA = paperA.conclusion.toLowerCase();
          const conclusionB = paperB.conclusion.toLowerCase();

          const contradictionSignals = [
            (conclusionA.includes('improve') && conclusionB.includes('no improvement')),
            (conclusionA.includes('significant') && conclusionB.includes('insignificant')),
            (conclusionA.includes('outperform') && conclusionB.includes('comparable')),
            (conclusionA.includes('better') && conclusionB.includes('worse')),
          ];

          const hasContradiction = contradictionSignals.some(Boolean);
          if (!hasContradiction) continue;

          const methodsA = extractMethodNames(paperA);
          const methodsB = extractMethodNames(paperB);

          ideas.push({
            id: generateId(),
            title: `Reconciling Contradictory Findings: A Controlled Comparison of ${methodsA[0] || 'Method A'} vs. ${methodsB[0] || 'Method B'} in ${commonTopics[0]}`,
            description: `This research directly addresses the contradictory findings between "${truncateTitle(paperA.title)}" and "${truncateTitle(paperB.title)}" regarding ${commonTopics.join(', ')}. By conducting carefully controlled experiments that isolate the factors driving the discrepancy, we aim to determine the conditions under which each approach is superior and provide a unified understanding.`,
            methodology: `(1) Reproduce key experiments from both papers under identical conditions; (2) systematically vary potential confounding factors (dataset, hyperparameters, evaluation metrics); (3) conduct statistical significance testing; (4) identify regime boundaries where each method excels; (5) develop a unified framework that selects the best approach based on problem characteristics.`,
            expectedContribution: `Definitive resolution of contradictory findings through controlled experiments, along with practical guidelines for method selection based on problem characteristics and resource constraints.`,
            difficulty: 'medium',
            relatedGaps: [],
            noveltyScore: clampScore(58 + Math.floor(Math.random() * 15)),
            feasibilityScore: clampScore(60 + Math.floor(Math.random() * 15)),
          });
        }
      }

      return ideas;
    },
  },

  // Strategy 4: Multi-paper synthesis
  {
    generate: (papers): ResearchIdea[] => {
      if (papers.length < 3) return [];
      const ideas: ResearchIdea[] = [];

      // Try combining insights from 3+ papers
      const allTopics = papers.flatMap((p) => p.topics);
      const topicCounts = new Map<string, number>();
      for (const topic of allTopics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }

      // Find topics shared by at least 2 papers
      const sharedTopics = [...topicCounts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([topic]) => topic);

      if (sharedTopics.length === 0) return [];

      const methodNames = papers.map((p) => extractMethodNames(p)).flat();
      const uniqueMethods = [...new Set(methodNames)];

      if (uniqueMethods.length < 2) return [];

      ideas.push({
        id: generateId(),
        title: `Unified Multi-Method Framework for ${sharedTopics[0]}: Integrating Insights from ${papers.length} Complementary Studies`,
        description: `This research synthesizes insights from ${papers.length} complementary studies on ${sharedTopics.join(', ')} to create a unified framework that integrates the strengths of ${uniqueMethods.slice(0, 3).join(', ')}${uniqueMethods.length > 3 ? ', and more' : ''}. By combining diverse perspectives and methodologies, the framework provides a more comprehensive and robust solution than any individual approach.`,
        methodology: `(1) Extract and formalize the key insights from each study; (2) identify complementary relationships between approaches; (3) design a modular framework that can incorporate multiple methods; (4) develop an orchestration mechanism for method selection and combination; (5) validate the unified framework against individual approaches on shared benchmarks.`,
        expectedContribution: `A unified, modular framework for ${sharedTopics[0]} that integrates the complementary strengths of multiple existing approaches, providing both improved performance and a more complete understanding of the problem space.`,
        difficulty: 'high',
        relatedGaps: [],
        noveltyScore: clampScore(72 + Math.floor(Math.random() * 18)),
        feasibilityScore: clampScore(32 + Math.floor(Math.random() * 18)),
      });

      return ideas;
    },
  },
];

// ─── Helper functions ────────────────────────────────────────────────────────

const METHODOLOGY_NAMES: Record<string, string[]> = {
  'Transformer': ['transformer', 'self-attention', 'multi-head attention', 'bert', 'gpt', 'vit'],
  'CNN': ['cnn', 'convolutional neural network', 'resnet', 'vgg', 'inception', 'efficientnet'],
  'RNN': ['rnn', 'recurrent neural network'],
  'LSTM': ['lstm', 'long short-term memory', 'gru'],
  'GAN': ['gan', 'generative adversarial'],
  'VAE': ['vae', 'variational autoencoder'],
  'Random Forest': ['random forest'],
  'SVM': ['svm', 'support vector machine'],
  'Graph Neural Network': ['gnn', 'gcn', 'graph neural', 'graph attention'],
  'Diffusion Model': ['diffusion', 'ddpm', 'score-based'],
  'Reinforcement Learning': ['reinforcement learning', 'rl', 'policy gradient', 'q-learning'],
  'Bayesian': ['bayesian', 'gaussian process', 'mcmc'],
  'Ensemble': ['ensemble', 'xgboost', 'gradient boosting', 'adaboost'],
  'Contrastive Learning': ['contrastive', 'simclr', 'moco'],
  'Meta-Learning': ['meta-learning', 'maml', 'few-shot'],
  'Transfer Learning': ['transfer learning', 'fine-tuning', 'domain adaptation'],
  'Evolutionary': ['evolutionary', 'genetic algorithm', 'neuroevolution'],
};

function extractMethodNames(paper: ExtractedPaper): string[] {
  const text = `${paper.methodology} ${paper.abstract}`.toLowerCase();
  const methods: string[] = [];

  for (const [name, keywords] of Object.entries(METHODOLOGY_NAMES)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        if (!methods.includes(name)) {
          methods.push(name);
        }
        break;
      }
    }
  }

  return methods;
}

function extractDomainLabel(paper: ExtractedPaper): string {
  if (paper.researchFocus) {
    return paper.researchFocus.length > 50
      ? paper.researchFocus.substring(0, 47) + '...'
      : paper.researchFocus;
  }
  if (paper.topics.length > 0) {
    return paper.topics[0];
  }
  return 'the target domain';
}

function truncateTitle(title: string): string {
  return title.length > 50 ? title.substring(0, 47) + '...' : title;
}

function inferStrength(method: string): string {
  const strengths: Record<string, string> = {
    'Transformer': 'modeling long-range dependencies and contextual relationships',
    'CNN': 'extracting local spatial features and hierarchical representations',
    'RNN': 'processing sequential data with temporal dependencies',
    'LSTM': 'capturing long-term sequential dependencies',
    'GAN': 'generating realistic synthetic data',
    'VAE': 'learning structured latent representations',
    'Random Forest': 'handling tabular data with feature interactions',
    'SVM': 'finding optimal decision boundaries in high-dimensional spaces',
    'Graph Neural Network': 'modeling relational structure and graph topology',
    'Diffusion Model': 'high-quality generative modeling with stable training',
    'Reinforcement Learning': 'optimizing sequential decision-making under uncertainty',
    'Bayesian': 'providing calibrated uncertainty estimates',
    'Ensemble': 'reducing variance and improving robustness through model diversity',
    'Contrastive Learning': 'learning discriminative representations without labels',
    'Meta-Learning': 'rapid adaptation to new tasks with minimal data',
    'Transfer Learning': 'leveraging pre-trained knowledge for new domains',
    'Evolutionary': 'global optimization in complex non-convex landscapes',
  };

  return strengths[method] || 'capturing complex patterns in data';
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function fillTemplate(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

function getDomainFromPapers(papers: ExtractedPaper[], gap: ResearchGap): string {
  const affectedPapers = papers.filter((p) => gap.affectedPapers.includes(p.id));
  if (affectedPapers.length > 0 && affectedPapers[0].researchFocus) {
    return affectedPapers[0].researchFocus;
  }
  if (affectedPapers.length > 0 && affectedPapers[0].topics.length > 0) {
    return affectedPapers[0].topics.join(' and ');
  }
  return 'the studied domain';
}

function getFocusFromPapers(papers: ExtractedPaper[], gap: ResearchGap): string {
  const affectedPapers = papers.filter((p) => gap.affectedPapers.includes(p.id));
  const focuses = affectedPapers.map((p) => p.researchFocus).filter(Boolean);
  if (focuses.length > 0) {
    return focuses[0].length > 60 ? focuses[0].substring(0, 57) + '...' : focuses[0];
  }
  return 'the research area';
}

// ─── Main function ───────────────────────────────────────────────────────────

export function generateResearchIdeas(
  papers: ExtractedPaper[],
  gaps: ResearchGap[]
): ResearchIdea[] {
  const ideas: ResearchIdea[] = [];

  // ── Phase 1: Generate ideas for each gap ──────────────────────────────────

  for (const gap of gaps) {
    const templates = GAP_IDEA_TEMPLATES[gap.gapType];

    if (!templates || templates.length === 0) {
      // Generate a generic idea for gap types without templates
      ideas.push(generateGenericIdea(papers, gap));
      continue;
    }

    const domain = getDomainFromPapers(papers, gap);
    const focus = getFocusFromPapers(papers, gap);
    const replacements = { domain, focus };

    for (const template of templates) {
      // Add some controlled randomness to scores based on gap properties
      const noveltyJitter = (gap.noveltyScore % 10) - 5;
      const severityBonus = Math.floor(gap.severityScore * 1.5);

      const noveltyScore = clampScore(
        template.baseNovelty + noveltyJitter + Math.min(severityBonus, 10)
      );
      const feasibilityScore = clampScore(
        template.baseFeasibility - Math.min(severityBonus, 8) + Math.floor(Math.random() * 8)
      );

      ideas.push({
        id: generateId(),
        title: fillTemplate(template.titlePattern, replacements),
        description: fillTemplate(template.descriptionPattern, replacements),
        methodology: fillTemplate(template.methodologyPattern, replacements),
        expectedContribution: fillTemplate(template.contributionPattern, replacements),
        difficulty: template.difficulty,
        relatedGaps: [gap.id],
        noveltyScore,
        feasibilityScore,
      });
    }
  }

  // ── Phase 2: Generate cross-pollination ideas ─────────────────────────────

  if (papers.length >= 2) {
    for (const strategy of crossPollinationStrategies) {
      const crossIdeas = strategy.generate(papers);

      // Link cross-pollination ideas to relevant gaps
      for (const idea of crossIdeas) {
        const relatedGaps = findRelatedGaps(idea, gaps);
        idea.relatedGaps = relatedGaps.length > 0 ? relatedGaps : [];

        // Adjust scores based on gap linkage
        if (relatedGaps.length > 0) {
          const maxSeverity = Math.max(
            ...gaps
              .filter((g) => relatedGaps.includes(g.id))
              .map((g) => g.severityScore)
          );
          idea.noveltyScore = clampScore(idea.noveltyScore + Math.floor(maxSeverity * 0.5));
          idea.feasibilityScore = clampScore(idea.feasibilityScore - Math.floor(maxSeverity * 0.3));
        }
      }

      ideas.push(...crossIdeas);
    }
  }

  // ── Phase 3: Generate gap-combination ideas ───────────────────────────────

  // Find pairs of related gaps and create ideas that address both
  if (gaps.length >= 2) {
    for (let i = 0; i < gaps.length; i++) {
      for (let j = i + 1; j < gaps.length; j++) {
        const gapA = gaps[i];
        const gapB = gaps[j];

        // Check if gaps share affected papers
        const sharedPapers = gapA.affectedPapers.filter((id) =>
          gapB.affectedPapers.includes(id)
        );

        if (sharedPapers.length > 0) {
          const domain = getDomainFromPapers(
            papers.filter((p) => sharedPapers.includes(p.id)),
            gapA
          );

          ideas.push({
            id: generateId(),
            title: `Addressing ${GAP_TYPE_LABELS[gapA.gapType]} and ${GAP_TYPE_LABELS[gapB.gapType]} Simultaneously in ${domain}`,
            description: `This research proposes an integrated approach that simultaneously addresses two interconnected gaps in ${domain}: (1) ${gapA.description.substring(0, 100)}${gapA.description.length > 100 ? '...' : ''}, and (2) ${gapB.description.substring(0, 100)}${gapB.description.length > 100 ? '...' : ''}. By tackling these issues together, we can exploit their interdependencies and develop more holistic solutions.`,
            methodology: `(1) Analyze the interplay between ${GAP_TYPE_LABELS[gapA.gapType]} and ${GAP_TYPE_LABELS[gapB.gapType]}; (2) design a unified approach that addresses both gaps simultaneously; (3) develop metrics that capture improvement across both dimensions; (4) validate through experiments that vary both gap factors; (5) compare against approaches that address each gap independently.`,
            expectedContribution: `A unified framework that provides synergistic improvements by addressing two related gaps simultaneously, demonstrating that holistic solutions can outperform piecemeal approaches.`,
            difficulty: 'high',
            relatedGaps: [gapA.id, gapB.id],
            noveltyScore: clampScore(78 + Math.floor(Math.random() * 12)),
            feasibilityScore: clampScore(30 + Math.floor(Math.random() * 15)),
          });
        }
      }
    }
  }

  // ── Phase 4: Deduplicate and sort ─────────────────────────────────────────

  // Remove near-duplicate ideas (very similar titles)
  const uniqueIdeas: ResearchIdea[] = [];
  const seenTitles = new Set<string>();

  for (const idea of ideas) {
    const normalizedTitle = idea.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueIdeas.push(idea);
    }
  }

  // Sort by novelty score (descending), then feasibility
  uniqueIdeas.sort((a, b) => {
    if (b.noveltyScore !== a.noveltyScore) return b.noveltyScore - a.noveltyScore;
    return b.feasibilityScore - a.feasibilityScore;
  });

  return uniqueIdeas;
}

// ─── Helper: Generate a generic idea for gap types without templates ─────────

function generateGenericIdea(papers: ExtractedPaper[], gap: ResearchGap): ResearchIdea {
  const domain = getDomainFromPapers(papers, gap);
  const focus = getFocusFromPapers(papers, gap);
  const gapLabel = GAP_TYPE_LABELS[gap.gapType] || gap.gapType.replace(/_/g, ' ');

  return {
    id: generateId(),
    title: `Addressing ${gapLabel} in ${domain}`,
    description: `This research proposes to address the identified ${gapLabel.toLowerCase()} in ${domain}. Specifically, it targets the gap described as: "${gap.description.substring(0, 150)}${gap.description.length > 150 ? '...' : ''}". By systematically investigating this gap, the research aims to provide novel insights and practical solutions that advance the state of the art in ${focus}.`,
    methodology: `(1) Conduct a thorough analysis of the ${gapLabel.toLowerCase()} through systematic literature review and expert consultation; (2) design experiments that specifically target the identified gap; (3) develop targeted solutions informed by the gap analysis; (4) validate solutions on appropriate benchmarks and datasets; (5) establish guidelines for preventing similar gaps in future work.`,
    expectedContribution: `Novel insights and practical solutions that directly address the ${gapLabel.toLowerCase()}, advancing the understanding and practice of ${domain}.`,
    difficulty: gap.severityScore > 7 ? 'high' : gap.severityScore > 4 ? 'medium' : 'low',
    relatedGaps: [gap.id],
    noveltyScore: clampScore(50 + gap.noveltyScore / 2 + Math.floor(Math.random() * 10)),
    feasibilityScore: clampScore(55 - gap.severityScore * 3 + Math.floor(Math.random() * 10)),
  };
}

// ─── Helper: Find gaps related to a cross-pollination idea ───────────────────

function findRelatedGaps(idea: ResearchIdea, gaps: ResearchGap[]): string[] {
  const relatedGapIds: string[] = [];
  const ideaText = `${idea.title} ${idea.description}`.toLowerCase();

  for (const gap of gaps) {
    // Check if the idea's text mentions concepts from the gap
    const gapKeywords = gap.description.toLowerCase().split(/\s+/).filter((w) => w.length > 5);
    const overlap = gapKeywords.filter((w) => ideaText.includes(w));

    if (overlap.length >= 2) {
      relatedGapIds.push(gap.id);
    }

    // Also link based on gap type keywords
    const gapTypeKeywords: Record<string, string[]> = {
      missing_dataset: ['dataset', 'benchmark', 'data collection', 'coverage'],
      methodology_gap: ['methodology', 'method', 'approach', 'framework', 'technique'],
      conflicting_results: ['conflicting', 'contradiction', 'reproduce', 'inconsistent'],
      no_real_world_validation: ['real-world', 'deployment', 'validation', 'practice'],
      small_sample_size: ['small sample', 'data scarcity', 'few-shot', 'limited data'],
      missing_edge_case: ['edge case', 'outlier', 'rare', 'boundary', 'corner case'],
      outdated_method: ['outdated', 'modern', 'state-of-the-art', 'classical'],
      cross_domain_gap: ['cross-domain', 'transfer', 'domain adaptation', 'multi-domain'],
      limited_scope: ['scope', 'generaliz', 'broader', 'limited'],
      reproducibility_issue: ['reproducib', 'replicate', 'deterministic', 'reproduce'],
      ethical_concern: ['ethic', 'bias', 'fairness', 'privacy'],
      scalability_limitation: ['scalab', 'efficiency', 'large-scale', 'computational'],
    };

    const typeKeywords = gapTypeKeywords[gap.gapType] || [];
    const typeOverlap = typeKeywords.filter((k) => ideaText.includes(k));
    if (typeOverlap.length >= 1 && !relatedGapIds.includes(gap.id)) {
      relatedGapIds.push(gap.id);
    }
  }

  return relatedGapIds;
}
