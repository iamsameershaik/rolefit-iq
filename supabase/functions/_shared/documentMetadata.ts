// Document metadata extraction for resumes and job descriptions.
// Phase 1: Deterministic heuristics (regex/pattern matching).
// Phase 2: OpenAI fallback for fields that heuristics miss.

export interface ResumeMetadata {
  candidate_name?: string;
  headline?: string;
  location?: string;
  email?: string;
  top_skills: string[];
  experience_themes: string[];
  recent_role_title?: string;
  recent_company?: string;
  years_signal?: string;
}

export interface JDMetadata {
  role_title?: string;
  company_name?: string;
  location?: string;
  seniority?: string;
  employment_type?: string;
  core_skills: string[];
  required_experience?: string;
  nice_to_have_skills: string[];
}

export type DocumentMetadata = ResumeMetadata | JDMetadata;

// ── Heuristic helpers ────────────────────────────────────────────

function firstMatch(text: string, pattern: RegExp): string | undefined {
  return pattern.exec(text)?.[1]?.trim() || undefined;
}

function extractEmail(text: string): string | undefined {
  return firstMatch(text, /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
}

function extractSkillsList(text: string): string[] {
  // Look for explicit skills/technologies sections
  const skillSectionMatch = /(?:skills?|technologies|tech stack|tools?|expertise|competencies)[:\s]*\n?([\s\S]{0,800}?)(?:\n\n|\n[A-Z]|$)/i.exec(text);
  if (skillSectionMatch) {
    const raw = skillSectionMatch[1];
    const items = raw.split(/[,|\n·•\-–]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40 && /\w/.test(s));
    return [...new Set(items)].slice(0, 12);
  }
  return [];
}

function extractLocation(text: string): string | undefined {
  // Common location patterns: City, Country / City, State
  const patterns = [
    /\b([A-Z][a-zA-Z\s]+,\s*(?:UK|United Kingdom|US|USA|United States|Canada|Australia|Ireland|Germany|France|Spain|Netherlands|Sweden|Norway|Denmark|Singapore|Remote))\b/,
    /location[:\s]+([^\n,]{3,40})/i,
    /based in\s+([^\n,]{3,40})/i,
    /\b(London|Manchester|Edinburgh|Dublin|New York|San Francisco|Toronto|Sydney|Berlin|Amsterdam|Remote)\b/i,
  ];
  for (const p of patterns) {
    const m = firstMatch(text, p);
    if (m) return m;
  }
  return undefined;
}

function extractYearsSignal(text: string): string | undefined {
  const m = /(\d+)\+?\s+years?\s+(?:of\s+)?(?:experience|working)/i.exec(text);
  if (m) return `${m[1]}+ years`;
  return undefined;
}

function extractSeniority(text: string, roleTitle?: string): string | undefined {
  const combined = `${roleTitle ?? ''} ${text.slice(0, 500)}`;
  if (/senior|lead|principal|staff|head of/i.test(combined)) return 'Senior';
  if (/junior|entry.?level|graduate|intern/i.test(combined)) return 'Junior';
  if (/mid.?level|mid level|intermediate/i.test(combined)) return 'Mid-level';
  return undefined;
}

// ── Resume extraction ────────────────────────────────────────────

export function extractResumeMetadata(text: string): ResumeMetadata {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Candidate name — usually the first non-empty line if it looks like a name
  let candidate_name: string | undefined;
  for (const line of lines.slice(0, 5)) {
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/.test(line) && line.length < 50) {
      candidate_name = line;
      break;
    }
  }

  // Headline — line after name that looks like a role title
  let headline: string | undefined;
  if (candidate_name) {
    const nameIdx = lines.indexOf(candidate_name);
    for (let i = nameIdx + 1; i < Math.min(nameIdx + 4, lines.length); i++) {
      const l = lines[i];
      if (l.length > 5 && l.length < 80 && !l.includes('@') && !/^\d/.test(l)) {
        headline = l;
        break;
      }
    }
  }

  // Recent role title from experience section
  let recent_role_title: string | undefined;
  let recent_company: string | undefined;
  const expSectionMatch = /(?:experience|employment|work history)[:\s]*\n([\s\S]{0,600})/i.exec(text);
  if (expSectionMatch) {
    const expLines = expSectionMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
    for (const l of expLines.slice(0, 8)) {
      if (!recent_role_title && l.length > 5 && l.length < 80 && /engineer|developer|manager|analyst|consultant|designer|lead|architect|scientist/i.test(l)) {
        recent_role_title = l.replace(/\s*\|.*$/, '').trim();
      }
      if (!recent_company && l.length > 2 && l.length < 60 && /[A-Z]/.test(l[0]) && !/engineer|developer|manager|analyst|consultant/i.test(l) && !/^\d{4}/.test(l)) {
        recent_company = l.split(/\s*[|,·]\s*/)[0].trim();
      }
      if (recent_role_title && recent_company) break;
    }
  }

  const top_skills = extractSkillsList(text);

  // Experience themes — infer from common technology/domain keywords
  const themeKeywords: Record<string, RegExp> = {
    'AI / Machine Learning': /\b(?:machine learning|ML|deep learning|neural network|LLM|GPT|OpenAI|Anthropic|transformers?|NLP|RAG|embeddings?|vector|langchain|llama)\b/i,
    'Full-stack development': /\b(?:React|Next\.js|Vue|Angular|TypeScript|JavaScript|Node\.?js|Express|REST API|GraphQL)\b/i,
    'Cloud / Infrastructure': /\b(?:AWS|Azure|GCP|Kubernetes|Docker|Terraform|CI\/CD|DevOps|serverless|lambda)\b/i,
    'Data engineering': /\b(?:Spark|Airflow|dbt|Snowflake|BigQuery|Redshift|ETL|pipeline|Kafka|data warehouse)\b/i,
    'Backend development': /\b(?:Python|Go|Rust|Java|C#|\.NET|Django|FastAPI|Spring|microservice)\b/i,
    'Database / Storage': /\b(?:PostgreSQL|Supabase|MySQL|MongoDB|Redis|vector database|pgvector|pinecone|weaviate)\b/i,
    'Product & delivery': /\b(?:agile|scrum|sprint|product owner|stakeholder|roadmap|OKR|delivery)\b/i,
  };
  const experience_themes: string[] = [];
  for (const [theme, re] of Object.entries(themeKeywords)) {
    if (re.test(text)) experience_themes.push(theme);
  }

  return {
    candidate_name,
    headline,
    location: extractLocation(text),
    email: extractEmail(text),
    top_skills,
    experience_themes,
    recent_role_title,
    recent_company,
    years_signal: extractYearsSignal(text),
  };
}

// ── JD extraction ────────────────────────────────────────────────

export function extractJDMetadata(text: string): JDMetadata {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Role title — often the first meaningful line or after "Job Title:"
  let role_title: string | undefined;
  const titlePatterns = [
    /(?:job title|role|position)[:\s]+([^\n]{5,80})/i,
    /^((?:Senior|Junior|Lead|Principal|Staff)?\s*[A-Z][a-zA-Z\s/]{4,60})$/,
  ];
  for (const p of titlePatterns) {
    const m = firstMatch(text.slice(0, 400), p);
    if (m) { role_title = m; break; }
  }
  if (!role_title) {
    for (const l of lines.slice(0, 5)) {
      if (l.length > 5 && l.length < 80 && /engineer|developer|manager|analyst|consultant|scientist|designer|architect/i.test(l)) {
        role_title = l;
        break;
      }
    }
  }

  // Company name
  let company_name: string | undefined;
  const companyPatterns = [
    /(?:company|organisation|organization|employer|about us|at)\s*[:—]\s*([^\n]{2,60})/i,
    /(?:join|work at|working at)\s+([A-Z][a-zA-Z\s&]{2,40})/i,
  ];
  for (const p of companyPatterns) {
    const m = firstMatch(text.slice(0, 500), p);
    if (m) { company_name = m.trim(); break; }
  }

  const core_skills = extractSkillsList(text);

  // Required experience
  let required_experience: string | undefined;
  const expMatch = /(?:required|minimum|must have)\s+(?:experience|qualifications?)[:\s]*([^\n]{10,150})/i.exec(text);
  if (expMatch) required_experience = expMatch[1].trim();

  // Nice-to-have skills
  const niceSectionMatch = /(?:nice.to.have|preferred|desirable|bonus)[:\s]*\n?([\s\S]{0,400}?)(?:\n\n|$)/i.exec(text);
  const nice_to_have_skills: string[] = [];
  if (niceSectionMatch) {
    const items = niceSectionMatch[1].split(/[,|\n·•\-–]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40);
    nice_to_have_skills.push(...[...new Set(items)].slice(0, 8));
  }

  // Employment type
  let employment_type: string | undefined;
  if (/\bfull.?time\b/i.test(text)) employment_type = 'Full-time';
  else if (/\bpart.?time\b/i.test(text)) employment_type = 'Part-time';
  else if (/\bcontract\b/i.test(text)) employment_type = 'Contract';
  else if (/\bfreelance\b/i.test(text)) employment_type = 'Freelance';

  return {
    role_title,
    company_name,
    location: extractLocation(text),
    seniority: extractSeniority(text, role_title),
    employment_type,
    core_skills,
    required_experience,
    nice_to_have_skills,
  };
}

// ── OpenAI-assisted extraction fallback ─────────────────────────
// Used to fill in fields heuristics could not determine.

interface OpenAIFallbackOptions {
  apiKey: string;
  model?: string;
}

export async function enrichMetadataWithOpenAI(
  documentType: 'resume' | 'job_description',
  text: string,
  partial: DocumentMetadata,
  opts: OpenAIFallbackOptions,
): Promise<DocumentMetadata> {
  const missingFields: string[] = [];

  if (documentType === 'resume') {
    const m = partial as ResumeMetadata;
    if (!m.candidate_name) missingFields.push('candidate_name (full name of the person)');
    if (!m.headline) missingFields.push('headline (current or target role title)');
    if (!m.location) missingFields.push('location (city/country or Remote)');
    if (m.top_skills.length === 0) missingFields.push('top_skills (array of up to 10 key skills)');
    if (m.experience_themes.length === 0) missingFields.push('experience_themes (array of 2-5 broad themes like "AI / Machine Learning")');
  } else {
    const m = partial as JDMetadata;
    if (!m.role_title) missingFields.push('role_title');
    if (!m.company_name) missingFields.push('company_name');
    if (!m.location) missingFields.push('location');
    if (m.core_skills.length === 0) missingFields.push('core_skills (array of up to 10 required skills)');
  }

  if (missingFields.length === 0) return partial;

  const fieldList = missingFields.map((f) => `  "${f}"`).join(',\n');
  const prompt = `Extract the following fields from this ${documentType === 'resume' ? 'CV/resume' : 'job description'} text. Return ONLY a JSON object with these fields (use null if a field cannot be determined):
{
${fieldList}
}

Document text (first 2000 chars):
${text.slice(0, 2000)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model ?? 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return partial;

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const raw = JSON.parse(data.choices[0].message.content) as Record<string, unknown>;

    // Merge non-null extracted fields back
    const enriched = { ...partial };
    for (const [k, v] of Object.entries(raw)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      (enriched as Record<string, unknown>)[k] = v;
    }
    return enriched;
  } catch {
    return partial;
  }
}
