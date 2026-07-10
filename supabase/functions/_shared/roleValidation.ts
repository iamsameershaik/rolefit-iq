// Document role validation — lightweight heuristic layer that checks whether
// content looks like a CV/resume or a job description before indexing.
//
// This is intentionally pragmatic, not perfect. It catches obvious misuse
// (recipes in a JD slot, code in a CV slot, cover letters in JD slots) without
// rejecting legitimate but unconventional document formats.

export type DocumentRole = "resume" | "job_description";

export interface ValidationResult {
  valid: boolean;
  reason: string;
  confidence: "high" | "medium" | "low";
}

// ── CV / resume signals ──────────────────────────────────────────
const CV_SIGNALS = [
  // Section headings common in CVs
  /\b(?:professional\s+summary|career\s+objective|personal\s+profile|about\s+me)\b/i,
  /\b(?:work\s+experience|employment\s+history|career\s+history|professional\s+experience)\b/i,
  /\b(?:education|qualifications|academic\s+background)\b/i,
  /\b(?:skills|technical\s+skills|core\s+competencies|key\s+skills)\b/i,
  /\b(?:certifications?|training|licenses?)\b/i,
  /\b(?:projects?|key\s+projects|notable\s+projects|side\s+projects)\b/i,
  /\b(?:publications?|awards?|achievements?|volunteering)\b/i,
  // Contact info patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i,
  /\b(?:LinkedIn|GitHub|Portfolio|Website)\b/i,
  // Common CV action verbs
  /\b(?:developed|engineered|implemented|designed|led|managed|built|deployed|architected|optimised|optimized)\b/i,
  // Years of experience phrasing
  /\b\d+\+?\s+years?\s+(?:of\s+)?(?:experience|working)\b/i,
];

// ── JD signals ───────────────────────────────────────────────────
const JD_SIGNALS = [
  // Section headings common in JDs
  /\b(?:job\s+title|role|position|job\s+description)\b/i,
  /\b(?:responsibilities|key\s+responsibilities|what\s+you'?ll\s+do|the\s+role)\b/i,
  /\b(?:requirements?|essential\s+requirements?|must\s+have|minimum\s+requirements?)\b/i,
  /\b(?:qualifications?|experience\s+required|we'?re\s+looking\s+for|about\s+you)\b/i,
  /\b(?:nice\s+to\s+have|preferred|desirable|bonus\s+qualifications?)\b/i,
  /\b(?:about\s+(?:the\s+)?(?:company|team|us)|who\s+we\s+are|about\s+(?:our\s+)?(?:client|business))\b/i,
  /\b(?:benefits?|perks?|what\s+we\s+offer|compensation|salary)\b/i,
  /\b(?:how\s+to\s+apply|application\s+instructions?)\b/i,
  // Hiring language
  /\b(?:we\s+are\s+(?:hiring|looking\s+for|seeking)|join\s+(?:our|the|us))\b/i,
  /\b(?:full.?time|part.?time|contract|permanent|temporary)\b/i,
  /\b(?:remote|hybrid|on.?site|in.?office)\b/i,
  // Seniority / role patterns
  /\b(?:senior|junior|lead|principal|staff|mid.?level)\s+(?:engineer|developer|manager|analyst|designer|architect|scientist|consultant)\b/i,
];

// ── Negative signals (content that is clearly NOT a CV or JD) ────
const NON_DOCUMENT_SIGNALS = [
  // Code snippets
  /^(?:function|class|def|import|const|let|var|public|private|package|using|#include)\s/m,
  /^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+(?:INTO|FROM|TABLE)/im,
  // Recipes
  /\b(?:ingredients?|preparation|cooking\s+instructions?|serves?\s+\d+|tablespoons?|teaspoons?|cups?\s+of)\b/i,
  // Random notes / shopping lists
  /^(?:todo|groceries|shopping\s+list|notes?):/im,
  // Very short or single-word content
  /^.{1,20}$/s,
];

// ── Cover letter signals (should not be in JD slot) ───────────────
const COVER_LETTER_SIGNALS = [
  /\b(?:dear\s+(?:hiring\s+manager|recruiter|sir|madam|mr\.|mrs\.|ms\.))\b/i,
  /\b(?:I\s+am\s+writing\s+to\s+(?:apply|express)|I\s+would\s+like\s+to\s+(?:apply|be\s+considered))\b/i,
  /\b(?:sincerely|yours\s+(?:truly|faithfully)|best\s+regards|kind\s+regards)\s*$/im,
  /\b(?:thank\s+you\s+for\s+(?:your\s+time|considering|reviewing))\b/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => {
    return count + (pattern.test(text) ? 1 : 0);
  }, 0);
}

function isLikelyCoverLetter(text: string): boolean {
  return countMatches(text, COVER_LETTER_SIGNALS) >= 2;
}

function isNonDocument(text: string): boolean {
  return NON_DOCUMENT_SIGNALS.some((p) => p.test(text));
}

/**
 * Validate whether the given text plausibly matches the expected document role.
 *
 * Returns a ValidationResult with:
 * - valid: whether to accept the content
 * - reason: human-readable explanation
 * - confidence: how sure the heuristic is
 */
export function validateDocumentRole(
  text: string,
  expectedRole: DocumentRole,
): ValidationResult {
  const trimmed = text.trim();

  // ── Empty or too short ──
  if (trimmed.length === 0) {
    return { valid: false, reason: "Document is empty.", confidence: "high" };
  }
  if (trimmed.length < 50) {
    return {
      valid: false,
      reason: "Document is too short to be a valid CV or job description. Please paste the full text.",
      confidence: "high",
    };
  }

  // ── Check for clearly non-document content ──
  if (isNonDocument(trimmed)) {
    return {
      valid: false,
      reason: "This content does not appear to be a CV or job description. It looks like code, notes, or other unrelated text.",
      confidence: "high",
    };
  }

  // ── Cover letter in JD slot ──
  if (expectedRole === "job_description" && isLikelyCoverLetter(trimmed)) {
    return {
      valid: false,
      reason: "This looks like a cover letter, not a job description. Please upload the job description text instead.",
      confidence: "medium",
    };
  }

  // ── Count role-specific signals ──
  const cvScore = countMatches(trimmed, CV_SIGNALS);
  const jdScore = countMatches(trimmed, JD_SIGNALS);

  if (expectedRole === "resume") {
    // If it looks more like a JD than a CV, reject
    if (jdScore >= 3 && cvScore === 0) {
      return {
        valid: false,
        reason: "This content looks like a job description, not a CV/resume. Please upload it in the correct JD slot.",
        confidence: "high",
      };
    }
    // If no CV signals at all, warn
    if (cvScore === 0) {
      return {
        valid: false,
        reason: "This content does not appear to be a CV or resume. Look for sections like Experience, Skills, Education, or contact information.",
        confidence: "medium",
      };
    }
    return {
      valid: true,
      reason: cvScore >= 3 ? "Content looks like a CV/resume." : "Content has some CV signals but may need review.",
      confidence: cvScore >= 3 ? "high" : "medium",
    };
  }

  // expectedRole === "job_description"
  // If it looks more like a CV than a JD, reject
  if (cvScore >= 3 && jdScore === 0) {
    return {
      valid: false,
      reason: "This content looks like a CV/resume, not a job description. Please upload it in the CV slot.",
      confidence: "high",
    };
  }
  // If no JD signals at all, warn
  if (jdScore === 0) {
    return {
      valid: false,
      reason: "This content does not appear to be a job description. Look for sections like Requirements, Responsibilities, or About the Role.",
      confidence: "medium",
    };
  }
  return {
    valid: true,
    reason: jdScore >= 3 ? "Content looks like a job description." : "Content has some JD signals but may need review.",
    confidence: jdScore >= 3 ? "high" : "medium",
  };
}

/**
 * Derive a stable slot_id from document type and job_index.
 * CV → 'cv', JD 1 → 'jd-01', JD 2 → 'jd-02', JD 3 → 'jd-03'.
 */
export function deriveSlotId(documentType: DocumentRole, jobIndex: number | null): string {
  if (documentType === "resume") return "cv";
  if (jobIndex === null) return "jd-??";
  return `jd-${String(jobIndex).padStart(2, "0")}`;
}

/**
 * Parse a user's natural-language JD reference (e.g. "Job 2", "JD 3", "job 1")
 * into a slot_id. Returns null if no valid JD number is found.
 */
export function parseJDReference(text: string): number | null {
  const match = /\b(?:jd|job)\s*(\d+)\b/i.exec(text);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (num < 1 || num > 3) return null;
  return num;
}

/**
 * Check if a user's question mentions a JD number that is out of range (4+).
 * Returns the out-of-range number, or null if none found.
 */
export function findOutOfRangeJD(text: string): number | null {
  const match = /\b(?:jd|job)\s*(\d+)\b/i.exec(text);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return num > 3 ? num : null;
}
