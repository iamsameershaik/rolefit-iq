import type {
  WorkspaceState,
  MetricItem,
  PipelineStage,
  CandidateProfile,
  JDAnalysis,
  MatrixSkill,
  ChatMessage,
} from '../types';

// ── Workspace ────────────────────────────────────────────────────

export const emptyWorkspace: WorkspaceState = {
  cv: {
    id: 'cv-01',
    type: 'cv',
    title: 'CV / Resume',
    description: 'Upload your current CV or resume. PDF, DOCX, or plain text.',
    status: 'empty',
  },
  jds: [
    {
      id: 'jd-01',
      type: 'jd',
      title: 'Job Description 1',
      description: 'Paste or upload the first job description you want to analyse.',
      status: 'empty',
    },
    {
      id: 'jd-02',
      type: 'jd',
      title: 'Job Description 2',
      description: 'Optional second role for side-by-side fit comparison.',
      status: 'empty',
    },
    {
      id: 'jd-03',
      type: 'jd',
      title: 'Job Description 3',
      description: 'Optional third role to complete your comparison set.',
      status: 'empty',
    },
  ],
};

export const sampleWorkspace: WorkspaceState = {
  cv: {
    id: 'cv-01',
    type: 'cv',
    title: 'CV / Resume',
    description: 'Upload your current CV or resume. PDF, DOCX, or plain text.',
    status: 'indexed',
    fileName: 'sample_candidate_cv.pdf',
    charCount: 8420,
    chunkCount: 18,
  },
  jds: [
    {
      id: 'jd-01',
      type: 'jd',
      title: 'Job Description 1',
      description: 'Paste or upload the first job description you want to analyse.',
      status: 'indexed',
      fileName: 'forward_deployed_engineer.pdf',
      charCount: 3840,
      chunkCount: 10,
    },
    {
      id: 'jd-02',
      type: 'jd',
      title: 'Job Description 2',
      description: 'Optional second role for side-by-side fit comparison.',
      status: 'indexed',
      fileName: 'ai_solutions_engineer.pdf',
      charCount: 4210,
      chunkCount: 12,
    },
    {
      id: 'jd-03',
      type: 'jd',
      title: 'Job Description 3',
      description: 'Optional third role to complete your comparison set.',
      status: 'indexed',
      fileName: 'ai_automation_consultant.pdf',
      charCount: 3670,
      chunkCount: 8,
    },
  ],
};

export const heroMetrics: MetricItem[] = [
  { id: 'M-01', label: 'CV indexed', value: '1' },
  { id: 'M-02', label: 'Roles compared', value: '3' },
  { id: 'M-03', label: 'Evidence chunks', value: '46' },
  { id: 'M-04', label: 'Assistant ready', value: 'Yes' },
];

export const pipelineStages: PipelineStage[] = [
  { key: 'extract', label: 'extract', active: false },
  { key: 'chunk', label: 'chunk', active: false },
  { key: 'embed', label: 'embed', active: false },
  { key: 'analyse', label: 'analyse', active: false },
  { key: 'ask', label: 'ask', active: false },
];

export const candidateName = 'Sample Candidate';

// ── Candidate profile ─────────────────────────────────────────────

export const candidateProfile: CandidateProfile = {
  name: 'Sample Candidate',
  positioning: 'AI Solutions Engineer / Applied AI Builder',
  location: 'Cardiff, UK',
  roleSignalsDetected: 4,
  cvChunksIndexed: 18,
  evidenceChunks: 48,
  primaryThemes: [
    'AI systems',
    'React + TypeScript',
    'RAG workflows',
    'Supabase / Postgres',
    'Automation',
    'Client-facing delivery',
  ],
};

// ── JD Analyses ───────────────────────────────────────────────────

export const jdAnalyses: JDAnalysis[] = [
  {
    id: 'jd-01',
    title: 'Forward Deployed Engineer',
    company: 'Applied AI Co.',
    fitTier: 'Strong',
    explainableFitEstimate: 82,
    evidenceStrength: 'Strong',
    riskLevel: 'Low',
    preparationPriority: 'Medium',
    matchedSkills: ['React / TypeScript', 'RAG workflows', 'AI workflow implementation', 'Client delivery', 'Supabase / Postgres'],
    missingSkills: ['Production observability', 'AWS Bedrock', 'Distributed tracing'],
    topStrengths: [
      'Strong full-stack delivery with React + TypeScript evidence across multiple projects',
      'Demonstrated RAG architecture design and implementation in production context',
      'Client-facing technical delivery with documented outcomes',
    ],
    skillGaps: [
      {
        skill: 'Production observability',
        currentLevel: 'Not evidenced',
        impact: 'Medium',
        suggestedAction: 'Add monitoring/logging work from any project to CV. Reference tools used (Sentry, Datadog, CloudWatch).',
        relatedJDs: ['jd-01'],
      },
      {
        skill: 'AWS / Bedrock',
        currentLevel: 'Not evidenced',
        impact: 'Medium',
        suggestedAction: 'If AWS experience exists, surface it explicitly. If not, note Azure/GCP equivalents.',
        relatedJDs: ['jd-01', 'jd-02'],
      },
      {
        skill: 'Distributed tracing',
        currentLevel: 'Not evidenced',
        impact: 'Low',
        suggestedAction: 'If OpenTelemetry or similar has been used, add a brief mention.',
        relatedJDs: ['jd-01'],
      },
    ],
    riskFlags: [
      {
        title: 'Observability gap',
        explanation: 'The JD emphasises production monitoring and reliability. No observability tooling is evidenced in the CV.',
        severity: 'Medium',
        relatedJDs: ['jd-01'],
      },
      {
        title: 'No enterprise-scale evidence',
        explanation: 'Projects described appear to be startup or small-team scale. The role may expect larger-scale systems.',
        severity: 'Low',
        relatedJDs: ['jd-01'],
      },
    ],
    interviewQuestions: [
      {
        question: 'Walk me through a production AI system you deployed end-to-end.',
        answerAngle: 'Lead with the RAG workflow project. Describe retrieval, chunking, latency, and iteration.',
        evidenceToMention: 'CV · Projects · Chunk 04 — RAG implementation detail',
        riskToAvoid: 'Do not overstate scale. Be honest about team size and scope.',
      },
      {
        question: 'How do you handle a client whose technical expectations exceed your current system?',
        answerAngle: 'Describe a specific client conversation, how you managed expectation, and what you shipped.',
        evidenceToMention: 'CV · Experience · Chunk 03 — client delivery narrative',
        riskToAvoid: 'Avoid vague answers. Ground in a specific example.',
      },
      {
        question: 'What is your approach to debugging a retrieval pipeline that returns irrelevant results?',
        answerAngle: 'Describe embedding quality checks, chunk size tuning, and reranking options you have used.',
        evidenceToMention: 'CV · Projects · Chunk 06 — retrieval tuning reference',
        riskToAvoid: 'Do not claim experience with tools you have not used.',
      },
    ],
    talkingPoints: [
      'End-to-end AI workflow ownership with client-visible outcomes',
      'Retrieval-augmented generation design and practical tuning',
      'React + TypeScript as primary delivery toolchain',
    ],
    rewriteRecommendation: {
      jdId: 'jd-01',
      professionalSummary:
        'Applied AI engineer with a track record of shipping retrieval-grounded AI systems and full-stack interfaces in client-facing environments. Experienced in designing RAG workflows, integrating LLM APIs, and delivering production-ready TypeScript applications. Strong communicator who bridges technical implementation and business outcome.',
      bulletImprovements: [
        'Replace "worked on AI projects" → "Designed and deployed a RAG-based document retrieval system, reducing manual review time by ~40%"',
        'Add explicit mention of observability: "Instrumented key pipeline stages with logging and alerting to support reliability in production"',
        'Strengthen client delivery bullet: "Led technical delivery for [client type] engagement, owning sprint planning, demos, and post-launch iteration"',
      ],
      keywordSuggestions: ['LLM integration', 'vector retrieval', 'production observability', 'TypeScript', 'RAG', 'client delivery'],
      doNotClaim: [
        'Do not claim AWS Bedrock experience unless you have direct evidence',
        'Do not state enterprise scale unless your projects genuinely operated at that scale',
      ],
    },
    evidenceSnippets: [
      {
        id: 'ES-FDE-01',
        text: 'Designed and implemented a retrieval-augmented generation pipeline using OpenAI embeddings and Supabase pgvector, processing over 2,000 document chunks with sub-300ms retrieval latency.',
        source: 'CV · Projects · Chunk 04',
        sourceType: 'cv',
        relevance: 'Directly supports the JD requirement for AI pipeline design and production deployment experience.',
      },
      {
        id: 'ES-FDE-02',
        text: 'Led client-facing technical delivery across three product sprints, managing stakeholder communication, technical scoping, and live demo preparation.',
        source: 'CV · Experience · Chunk 03',
        sourceType: 'cv',
        relevance: 'Matches the JD emphasis on client interaction and technical ownership in deployed environments.',
      },
      {
        id: 'ES-FDE-03',
        text: 'The role requires demonstrated experience shipping AI features to external customers in fast-paced environments, with strong debugging and iteration skills.',
        source: 'JD 1 · Requirements · Chunk 02',
        sourceType: 'jd',
        relevance: 'Core requirement. CV evidence partially satisfies this via project delivery, but enterprise-scale evidence is absent.',
      },
      {
        id: 'ES-FDE-04',
        text: 'Built React + TypeScript interfaces for AI-powered applications, integrating with REST APIs and streaming LLM responses.',
        source: 'CV · Projects · Chunk 06',
        sourceType: 'cv',
        relevance: 'Covers the front-end engineering component of the role requirement.',
      },
    ],
    fitSummary:
      'Strong alignment on core technical delivery. The candidate demonstrates practical AI system design, RAG implementation, and client-facing product work — the three primary signals this role weights most heavily. The main gap is production observability, which is referenced in the JD but absent from the CV.',
    strongestAlignment: [
      'RAG workflow design and tuning',
      'React + TypeScript full-stack delivery',
      'Client-facing technical ownership',
      'LLM API integration',
    ],
    weakestAlignment: [
      'Production observability and monitoring',
      'Enterprise-scale systems evidence',
      'AWS / cloud infrastructure depth',
    ],
    candidateNarrative:
      'Position yourself as an applied AI engineer who has shipped real retrieval systems with measurable outcomes. Lead with the RAG project, then support with client delivery and TypeScript evidence. Acknowledge the observability gap proactively if asked — a short example of any logging/monitoring work you have done will close it.',
  },

  {
    id: 'jd-02',
    title: 'AI Solutions Engineer',
    company: 'Enterprise AI Ltd.',
    fitTier: 'Moderate',
    explainableFitEstimate: 78,
    evidenceStrength: 'Moderate',
    riskLevel: 'Medium',
    preparationPriority: 'High',
    matchedSkills: ['LLM API integration', 'Python', 'React / TypeScript', 'Supabase', 'Automation pipelines'],
    missingSkills: ['Enterprise sales cycle exposure', 'AWS / Azure production deployments', 'Formal solution architecture'],
    topStrengths: [
      'Practical LLM API integration experience evidenced across multiple projects',
      'Automation pipeline design with clear business outcome framing',
      'Supabase and Postgres data layer experience transferable to enterprise contexts',
    ],
    skillGaps: [
      {
        skill: 'Enterprise sales cycle exposure',
        currentLevel: 'Not evidenced',
        impact: 'High',
        suggestedAction: 'If any pre-sales or discovery work exists, surface it. Frame project scoping work as requirement-gathering.',
        relatedJDs: ['jd-02'],
      },
      {
        skill: 'Cloud infrastructure (AWS / Azure)',
        currentLevel: 'Partial',
        impact: 'High',
        suggestedAction: 'Document any hosting, deployment, or serverless work explicitly. Reference specific services used.',
        relatedJDs: ['jd-02', 'jd-01'],
      },
      {
        skill: 'Solution architecture documentation',
        currentLevel: 'Not evidenced',
        impact: 'Medium',
        suggestedAction: 'Add a bullet about any system design docs, diagrams, or architecture decisions you have owned.',
        relatedJDs: ['jd-02'],
      },
    ],
    riskFlags: [
      {
        title: 'Enterprise context mismatch',
        explanation: 'The JD targets someone who has worked within enterprise procurement and delivery cycles. CV signals are startup/agency-scale.',
        severity: 'Medium',
        relatedJDs: ['jd-02'],
      },
      {
        title: 'Cloud infrastructure depth',
        explanation: 'The role expects hands-on AWS or Azure deployment experience. This is not clearly evidenced in the CV.',
        severity: 'Medium',
        relatedJDs: ['jd-02'],
      },
    ],
    interviewQuestions: [
      {
        question: 'Describe a time you translated a vague business problem into a technical AI solution.',
        answerAngle: 'Frame the automation pipeline project as a discovery-to-delivery story. Describe how you identified the problem, scoped the solution, and measured impact.',
        evidenceToMention: 'CV · Projects · Chunk 07 — automation workflow design',
        riskToAvoid: 'Avoid framing it as purely technical. Emphasise the business outcome.',
      },
      {
        question: 'How would you architect a scalable document processing pipeline on AWS?',
        answerAngle: 'If AWS experience is limited, describe equivalent architecture choices and pivot to what you have built.',
        evidenceToMention: 'CV · Projects · Chunk 04 — pipeline architecture',
        riskToAvoid: 'Do not invent AWS experience. Be honest and describe transferable decisions.',
      },
      {
        question: 'What is your process for onboarding a client onto a new AI tool?',
        answerAngle: 'Describe any client enablement, documentation, or training work you have done.',
        evidenceToMention: 'CV · Experience · Chunk 03',
        riskToAvoid: 'Do not overclaim formal sales engineering experience.',
      },
    ],
    talkingPoints: [
      'LLM integration and automation pipeline design with clear outcomes',
      'Ability to translate business problems into AI-native solutions',
      'Full-stack build capability with React and TypeScript',
    ],
    rewriteRecommendation: {
      jdId: 'jd-02',
      professionalSummary:
        'AI solutions engineer with experience designing and delivering LLM-powered automation systems for real business problems. Comfortable working across the full solution lifecycle from requirements scoping to production deployment. Brings full-stack build capability and a pragmatic approach to integrating AI into existing workflows.',
      bulletImprovements: [
        'Reframe automation project: "Designed and delivered an LLM-powered document processing pipeline reducing operational overhead by 60% for a [sector] client"',
        'Surface any client scoping work: "Led technical discovery sessions to define solution scope, acceptance criteria, and delivery roadmap"',
        'Add infrastructure context: "Deployed to [platform] using [services], managing CI/CD pipeline and environment configuration"',
      ],
      keywordSuggestions: ['solution architecture', 'LLM integration', 'automation pipeline', 'client onboarding', 'AI deployment'],
      doNotClaim: [
        'Do not claim formal pre-sales or solution consultant titles without direct experience',
        'Do not claim AWS certifications or deep cloud expertise without evidence',
      ],
    },
    evidenceSnippets: [
      {
        id: 'ES-AIS-01',
        text: 'Built an end-to-end automation pipeline integrating GPT-4 for document classification, Supabase for structured storage, and a React dashboard for operator review.',
        source: 'CV · Projects · Chunk 07',
        sourceType: 'cv',
        relevance: 'Demonstrates LLM integration, pipeline design, and full-stack delivery — core signals for this role.',
      },
      {
        id: 'ES-AIS-02',
        text: 'The candidate demonstrates experience in Python scripting for data pipeline orchestration, with evidence of API integration and scheduled task management.',
        source: 'CV · Technical Skills · Chunk 02',
        sourceType: 'cv',
        relevance: 'Supports the Python requirement, though depth of enterprise Python is not fully evidenced.',
      },
      {
        id: 'ES-AIS-03',
        text: 'Role requires experience working with enterprise clients through full solution delivery cycles, including requirements, architecture, build, and handover.',
        source: 'JD 2 · Requirements · Chunk 03',
        sourceType: 'jd',
        relevance: 'Key gap. CV evidence is project-level, not explicitly enterprise cycle.',
      },
      {
        id: 'ES-AIS-04',
        text: 'Collaborated with stakeholders to scope, prioritise, and deliver two product features within a constrained timeline.',
        source: 'CV · Experience · Chunk 05',
        sourceType: 'cv',
        relevance: 'Partially evidences stakeholder management and delivery ownership, transferable to solution engineering context.',
      },
    ],
    fitSummary:
      'Moderate fit with strong technical signals but a gap in enterprise delivery context. The candidate has the core LLM and automation skills the role requires, but the JD skews toward structured enterprise engagements with cloud infrastructure depth. Preparation should focus on framing existing work at a higher business abstraction and surfacing any cloud deployment details.',
    strongestAlignment: [
      'LLM API integration and pipeline design',
      'Automation workflow delivery with business outcomes',
      'Supabase / Postgres data layer',
    ],
    weakestAlignment: [
      'Enterprise client engagement and sales cycle exposure',
      'Cloud infrastructure depth (AWS / Azure)',
      'Formal solution architecture ownership',
    ],
    candidateNarrative:
      'Lead with practical AI delivery experience. Position yourself as someone who builds and ships, not just specifies. Use the automation pipeline project as your centrepiece. Be upfront about the enterprise context gap and frame your startup delivery experience as adaptable and outcome-focused.',
  },

  {
    id: 'jd-03',
    title: 'AI Automation Consultant',
    company: 'Transformation Partners Ltd.',
    fitTier: 'Moderate',
    explainableFitEstimate: 74,
    evidenceStrength: 'Moderate',
    riskLevel: 'Medium',
    preparationPriority: 'High',
    matchedSkills: ['AI workflow design', 'Automation implementation', 'Client communication', 'LLM APIs', 'Process analysis'],
    missingSkills: ['Formal consulting methodology', 'Change management', 'Business process modelling', 'Executive stakeholder management'],
    topStrengths: [
      'Practical AI workflow design with demonstrated client delivery',
      'LLM-powered automation experience with clear problem-outcome framing',
      'Strong communication and technical translation skills evidenced in project work',
    ],
    skillGaps: [
      {
        skill: 'Formal consulting methodology',
        currentLevel: 'Not evidenced',
        impact: 'High',
        suggestedAction: 'Frame any project scoping, workshop facilitation, or structured problem-solving in consulting language.',
        relatedJDs: ['jd-03'],
      },
      {
        skill: 'Change management',
        currentLevel: 'Not evidenced',
        impact: 'Medium',
        suggestedAction: 'If any adoption, training, or rollout work exists in your history, surface and frame it explicitly.',
        relatedJDs: ['jd-03'],
      },
      {
        skill: 'Executive stakeholder management',
        currentLevel: 'Not evidenced',
        impact: 'Medium',
        suggestedAction: 'Describe any board-level or senior stakeholder interactions, even informally.',
        relatedJDs: ['jd-03'],
      },
      {
        skill: 'Business process modelling',
        currentLevel: 'Not evidenced',
        impact: 'Low',
        suggestedAction: 'If process mapping, workflow diagrams, or current/future-state analysis has been part of your work, mention it.',
        relatedJDs: ['jd-03'],
      },
    ],
    riskFlags: [
      {
        title: 'Consulting framing absent',
        explanation: 'The CV reads as an engineering profile. This consulting role may expect a more business-outcomes and advisory framing throughout.',
        severity: 'High',
        relatedJDs: ['jd-03'],
      },
      {
        title: 'Seniority gap risk',
        explanation: 'Consultant roles often expect stakeholder management at senior/exec level. The CV does not evidence this clearly.',
        severity: 'Medium',
        relatedJDs: ['jd-03'],
      },
    ],
    interviewQuestions: [
      {
        question: 'Tell me about a time you helped a client understand where AI could improve their operations.',
        answerAngle: 'Describe a discovery conversation, process audit, or use-case mapping session you have led.',
        evidenceToMention: 'CV · Experience · Chunk 03 — client discovery work',
        riskToAvoid: 'Avoid overweighting the technical build. Lead with the advisory and diagnostic work.',
      },
      {
        question: 'How do you manage resistance to AI adoption from non-technical stakeholders?',
        answerAngle: 'Describe specific communication strategies, demonstrations, or outcome-framing you have used.',
        evidenceToMention: 'CV · Experience · Chunk 03',
        riskToAvoid: 'Do not claim formal change management certification unless you have it.',
      },
      {
        question: 'Describe a process you automated and how you measured the impact.',
        answerAngle: 'Use the automation pipeline project. Lead with the problem statement, then the design, then the measurable outcome.',
        evidenceToMention: 'CV · Projects · Chunk 07',
        riskToAvoid: 'Ensure the impact metric is real and defensible.',
      },
    ],
    talkingPoints: [
      'AI workflow design and practical automation with real operational impact',
      'Client-facing communication and technical translation capability',
      'Ability to move between strategic problem framing and hands-on delivery',
    ],
    rewriteRecommendation: {
      jdId: 'jd-03',
      professionalSummary:
        'AI and automation consultant with hands-on experience identifying, designing, and delivering AI-powered workflow improvements for real business problems. Combines technical depth in LLM integration and process automation with strong advisory and communication skills. Experienced working with clients from discovery through deployment.',
      bulletImprovements: [
        'Reframe engineering bullets in outcomes language: "Identified and automated a high-volume document review process, saving approximately 15 hours/week of manual effort"',
        'Add advisory framing: "Facilitated client workshops to map current-state workflows and identify AI automation opportunities"',
        'Surface any training or knowledge-transfer work: "Delivered handover documentation and training sessions to non-technical client team"',
      ],
      keywordSuggestions: ['AI automation strategy', 'process improvement', 'stakeholder engagement', 'change enablement', 'digital transformation'],
      doNotClaim: [
        'Do not claim formal consulting methodology certification (e.g. McKinsey, BCG frameworks) without direct training',
        'Do not claim C-suite stakeholder management if your experience has been at team or mid-management level',
      ],
    },
    evidenceSnippets: [
      {
        id: 'ES-AAC-01',
        text: 'Mapped client operational workflow and identified three high-value automation opportunities, leading to a prioritised implementation roadmap.',
        source: 'CV · Experience · Chunk 08',
        sourceType: 'cv',
        relevance: 'Strong signal for the consulting discovery and scoping component of this role.',
      },
      {
        id: 'ES-AAC-02',
        text: 'The role requires demonstrable experience translating ambiguous business challenges into structured AI automation use cases and delivering measurable outcomes.',
        source: 'JD 3 · Requirements · Chunk 01',
        sourceType: 'jd',
        relevance: 'Core requirement that the CV partially satisfies but needs stronger business-outcomes framing.',
      },
      {
        id: 'ES-AAC-03',
        text: 'Delivered client-facing training and onboarding materials for a new AI-powered workflow tool, achieving full team adoption within two weeks.',
        source: 'CV · Projects · Chunk 09',
        sourceType: 'cv',
        relevance: 'Partially addresses the change management and adoption component of the role.',
      },
      {
        id: 'ES-AAC-04',
        text: 'Automated repetitive reporting workflow using Python and GPT-4, reducing turnaround time from 4 hours to 12 minutes with zero manual review errors.',
        source: 'CV · Projects · Chunk 07',
        sourceType: 'cv',
        relevance: 'Strong evidence of automation impact — directly relevant to the core consulting outcome this role targets.',
      },
    ],
    fitSummary:
      'Moderate fit driven by genuine automation delivery experience and client communication capability. The primary gap is consulting framing — the CV presents as an engineering profile and this role rewards advisory, process-diagnosis, and change management language. With targeted reframing, fit can be pushed toward Strong.',
    strongestAlignment: [
      'AI workflow design and automation delivery',
      'LLM-powered process improvement with measurable outcomes',
      'Client-facing communication and technical translation',
    ],
    weakestAlignment: [
      'Formal consulting methodology and advisory framing',
      'Executive stakeholder management evidence',
      'Change management and adoption facilitation',
    ],
    candidateNarrative:
      'This role rewards reframing your engineering work in advisory and outcomes language. Position yourself as someone who diagnoses problems, designs AI solutions, and guides clients through adoption — not just someone who builds systems. The automation pipeline and client delivery work is your strongest evidence. Lead with outcomes and business impact, then support with technical capability.',
  },
];

// ── RoleFit Matrix ────────────────────────────────────────────────

export const roleFitMatrix: MatrixSkill[] = [
  { skill: 'React / TypeScript',       fde: 'strong',   aiSolutions: 'strong',   aiAutomation: 'moderate' },
  { skill: 'Python',                   fde: 'moderate', aiSolutions: 'strong',   aiAutomation: 'moderate' },
  { skill: 'LLM APIs',                 fde: 'strong',   aiSolutions: 'strong',   aiAutomation: 'strong'   },
  { skill: 'RAG / embeddings',         fde: 'strong',   aiSolutions: 'moderate', aiAutomation: 'weak'     },
  { skill: 'Supabase / Postgres',      fde: 'strong',   aiSolutions: 'moderate', aiAutomation: 'weak'     },
  { skill: 'AWS / Bedrock',            fde: 'missing',  aiSolutions: 'missing',  aiAutomation: 'missing'  },
  { skill: 'Client delivery',          fde: 'strong',   aiSolutions: 'moderate', aiAutomation: 'strong'   },
  { skill: 'Observability',            fde: 'missing',  aiSolutions: 'weak',     aiAutomation: 'missing'  },
  { skill: 'Testing',                  fde: 'moderate', aiSolutions: 'moderate', aiAutomation: 'weak'     },
  { skill: 'Stakeholder comms',        fde: 'moderate', aiSolutions: 'moderate', aiAutomation: 'strong'   },
];

// ── Mock chat messages ────────────────────────────────────────────

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-01',
    role: 'assistant',
    content:
      'RoleFit IQ is ready. I have indexed your CV and three job descriptions — 48 evidence chunks are available for retrieval. Ask me anything about fit, gaps, preparation, or rewrite suggestions.',
    timestamp: '09:41',
  },
];

export const mockChatResponses: Record<string, { content: string; citations: { id: string; text: string; source: string; sourceType: 'cv' | 'jd'; relevance: string }[] }> = {
  default: {
    content:
      'Based on the indexed evidence, I can see strong signals across your uploaded documents. To give you a grounded answer, I would need a more specific question — for example, about a particular role, skill, or gap.',
    citations: [],
  },
  fit: {
    content:
      'Based on the indexed evidence, Forward Deployed Engineer is currently the strongest fit at an explainable estimate of 82. The strongest signals are React/TypeScript delivery, AI workflow implementation, RAG-style architecture, and client-facing project work. The main gap is deeper production observability evidence.',
    citations: [
      { id: 'C-01', text: 'Designed and implemented a retrieval-augmented generation pipeline using OpenAI embeddings and Supabase pgvector.', source: 'CV · Projects · Chunk 04', sourceType: 'cv', relevance: 'Primary evidence signal for FDE fit.' },
      { id: 'C-02', text: 'The role requires demonstrated experience shipping AI features to external customers.', source: 'JD 1 · Requirements · Chunk 02', sourceType: 'jd', relevance: 'Core role requirement matched by CV evidence.' },
    ],
  },
  missing: {
    content:
      'For AI Solutions Engineer (Job 2), the primary missing signals are: (1) enterprise sales cycle or pre-sales exposure — the CV shows project delivery but not formal solution engineering context; (2) cloud infrastructure depth (AWS or Azure) — no direct evidence is present; (3) formal solution architecture documentation. These gaps are in the Medium–High impact range and worth addressing before applying.',
    citations: [
      { id: 'C-03', text: 'Role requires experience working with enterprise clients through full solution delivery cycles.', source: 'JD 2 · Requirements · Chunk 03', sourceType: 'jd', relevance: 'Gap requirement — not currently evidenced in CV.' },
      { id: 'C-04', text: 'The candidate demonstrates experience in Python scripting for data pipeline orchestration.', source: 'CV · Technical Skills · Chunk 02', sourceType: 'cv', relevance: 'Partial match — Python is present but enterprise depth is unconfirmed.' },
    ],
  },
  interview: {
    content:
      'Across all three roles, the highest-priority interview preparation areas are: (1) a concrete end-to-end AI deployment story with production detail; (2) a client communication example with specific outcome; (3) how you diagnose and tune a retrieval pipeline. For the consulting role, also prepare to frame your engineering work in business-outcomes and advisory language.',
    citations: [
      { id: 'C-05', text: 'Designed and implemented RAG pipeline with sub-300ms retrieval latency.', source: 'CV · Projects · Chunk 04', sourceType: 'cv', relevance: 'Foundation for your deployment story.' },
      { id: 'C-06', text: 'Led client-facing technical delivery across three product sprints.', source: 'CV · Experience · Chunk 03', sourceType: 'cv', relevance: 'Foundation for your client communication example.' },
    ],
  },
  rewrite: {
    content:
      'For Forward Deployed Engineer, I recommend leading your professional summary with: "Applied AI engineer with a track record of shipping retrieval-grounded AI systems and full-stack interfaces in client-facing environments." Key additions: (1) an explicit RAG/observability bullet; (2) a stronger client delivery framing with outcome metrics. I would avoid claiming AWS or enterprise-scale experience that is not in the CV evidence.',
    citations: [
      { id: 'C-07', text: 'CV summary currently reads as a general developer profile without AI specialisation signal.', source: 'CV · Summary · Chunk 01', sourceType: 'cv', relevance: 'Current state being rewritten.' },
    ],
  },
  avoid: {
    content:
      'Based on the indexed evidence, you should avoid claiming: (1) AWS Bedrock or deep cloud infrastructure experience — no evidence present; (2) enterprise-scale system ownership — your evidence is startup/small-team scale; (3) formal consulting methodology — CV reads as engineering-first; (4) executive stakeholder management — no evidence of C-suite or board-level interaction. These are not weaknesses, they are honest gaps to acknowledge and address.',
    citations: [],
  },
};
