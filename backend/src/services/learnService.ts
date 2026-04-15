import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
}

const MODEL = 'gpt-5.4';

const MAX_SECTION_CHARS = 12000;

function clip(text: string, max = MAX_SECTION_CHARS): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n\n[…truncated…]';
}

export interface SectionSummary {
  tldr: string;
  takeaways: string[];
}

export async function summarizeSection(
  sectionTitle: string,
  sectionContent: string,
): Promise<SectionSummary> {
  const systemPrompt = `You are a PostgreSQL tutor. Summarize a section of a PostgreSQL learning guide.
Return ONLY valid JSON — no markdown, no code fences, no prose outside JSON.

Structure:
{
  "tldr": "<one sentence, max 30 words>",
  "takeaways": ["<bullet 1>", "<bullet 2>", "<bullet 3>"]
}

Rules:
- tldr: a single sharp sentence capturing the point of the section.
- takeaways: exactly 3 bullets, each max 18 words, concrete and specific.`;

  const userPrompt = `Section: "${sectionTitle}"\n\n${clip(sectionContent)}`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_completion_tokens: 800,
  });

  const raw = response.choices[0]?.message?.content || '';
  return extractJSON(raw) as SectionSummary;
}

export async function askAboutSection(
  sectionTitle: string,
  sectionContent: string,
  question: string,
): Promise<string> {
  const systemPrompt = `You are a PostgreSQL tutor answering a student's question about a specific section of a learning guide.

Rules:
- Ground your answer in the provided section. If the question goes beyond it, say so briefly, then answer using accurate PostgreSQL knowledge.
- Be concise (max ~180 words). Use short paragraphs or bullets.
- Use plain markdown (no headings above ### level). Code fences with \`\`\`sql for SQL.
- Be specific: name operators, functions, catalog tables, and settings where relevant.
- Never fabricate syntax. If unsure, say so.`;

  const userPrompt = `Section: "${sectionTitle}"

--- SECTION CONTENT ---
${clip(sectionContent)}
--- END SECTION ---

Student question: ${question}`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_completion_tokens: 1200,
  });

  return response.choices[0]?.message?.content?.trim() || 'No answer available.';
}

export async function explainTerm(term: string, sectionTitle?: string): Promise<string> {
  const systemPrompt = `You are a PostgreSQL expert. Explain a single PostgreSQL term or concept for an inline tooltip.

Rules:
- Plain text only. No markdown, no code fences, no headings.
- Max 50 words.
- Cover: what it is, and why it matters for query performance or correctness.
- Be precise and concrete. Mention the catalog, system column, or operator if relevant.`;

  const contextLine = sectionTitle ? `(context: section "${sectionTitle}")` : '';
  const userPrompt = `Term: "${term}" ${contextLine}`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_completion_tokens: 300,
  });

  return response.choices[0]?.message?.content?.trim() || 'No explanation available.';
}

// ─── Quiz generation ─────────────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuiz(
  sectionTitle: string,
  sectionContent: string,
): Promise<QuizQuestion[]> {
  const systemPrompt = `You are a PostgreSQL instructor writing a short quiz for a section of a learning guide.
Return ONLY a valid JSON array — no markdown, no code fences, no prose.

Each item in the array must have:
{
  "question": "<a clear, single question, max 30 words>",
  "choices": ["<choice A>", "<choice B>", "<choice C>", "<choice D>"],
  "correctIndex": <0|1|2|3>,
  "explanation": "<1-3 sentences explaining why the correct answer is correct and why the others are wrong>"
}

Rules:
- Generate exactly 4 questions.
- Each question must have exactly 4 choices.
- Cover different concepts from the section (no two questions on the same idea).
- Distractors must be plausible — common misconceptions, not obviously wrong.
- Ground every question in the provided section content.`;

  const userPrompt = `Section: "${sectionTitle}"\n\n${clip(sectionContent)}`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_completion_tokens: 3000,
  });

  const raw = response.choices[0]?.message?.content || '';
  const parsed = extractJSONArray(raw);
  if (!Array.isArray(parsed)) throw new Error('Quiz response was not an array');
  return parsed as QuizQuestion[];
}

// ─── Practice sandbox ────────────────────────────────────────────────────────

export interface PracticeScenario {
  scenario: string;
  schema: string;
  task: string;
  hints: string[];
}

export async function generateScenario(
  sectionTitle: string,
  sectionContent: string,
): Promise<PracticeScenario> {
  const systemPrompt = `You are a senior PostgreSQL instructor. Invent a small, realistic practice scenario that exercises the concepts in the given section.
Return ONLY valid JSON:
{
  "scenario": "<2-3 sentences setting the stage: table size, query pattern, observed problem>",
  "schema": "<a short CREATE TABLE statement (and any related indexes the student should consider modifying), in valid SQL>",
  "task": "<one sentence: what the student must produce — e.g. an index, a rewritten query, a config change>",
  "hints": ["<short hint 1>", "<short hint 2>"]
}

Rules:
- The scenario must be solvable with knowledge from the provided section.
- Schema must be runnable SQL (no placeholders).
- Keep it small: one or two tables, realistic column names.`;

  const userPrompt = `Section: "${sectionTitle}"\n\n${clip(sectionContent)}`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    max_completion_tokens: 1500,
  });

  return extractJSON(response.choices[0]?.message?.content || '') as PracticeScenario;
}

export interface PracticeGrade {
  score: number; // 0-10
  verdict: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  optimalSolution: string;
}

export async function gradeSqlAttempt(
  scenario: PracticeScenario,
  attempt: string,
): Promise<PracticeGrade> {
  const systemPrompt = `You are a strict but fair PostgreSQL grader. Grade a student's SQL attempt against a practice scenario.
Return ONLY valid JSON:
{
  "score": <integer 0-10>,
  "verdict": <"correct"|"partial"|"incorrect">,
  "feedback": "<2-4 sentences: what they got right, what they got wrong, and what to improve>",
  "optimalSolution": "<the recommended SQL solution, in a single fenced \`\`\`sql block — no prose>"
}

Rules:
- Be specific: reference exact column names, index types, query operators.
- A solution that solves the problem differently than your "optimal" but is still correct deserves a high score.
- Penalize SQL syntax errors, missing WHERE clauses, missing index columns, and obviously wrong index types (e.g. B-tree for full-text).
- score: 9-10 correct, 5-8 partial, 0-4 incorrect.`;

  const userPrompt = `Scenario:\n${scenario.scenario}\n\nSchema:\n${scenario.schema}\n\nTask:\n${scenario.task}\n\nStudent attempt:\n\`\`\`sql\n${attempt}\n\`\`\``;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_completion_tokens: 1500,
  });

  return extractJSON(response.choices[0]?.message?.content || '') as PracticeGrade;
}

// ─── Flashcards ──────────────────────────────────────────────────────────────

export interface Flashcard {
  front: string;
  back: string;
}

export async function generateFlashcards(
  sectionTitle: string,
  sectionContent: string,
): Promise<Flashcard[]> {
  const systemPrompt = `You are a PostgreSQL instructor creating spaced-repetition flashcards from a section of a learning guide.
Return ONLY a valid JSON array — no markdown, no code fences.

Each card:
{
  "front": "<a concise prompt or question, max 20 words>",
  "back": "<the answer, max 40 words, may include short SQL inline>"
}

Rules:
- Generate 6 to 10 cards.
- Each card covers ONE atomic fact, definition, or trade-off.
- No two cards should test the same concept.
- "front" should be answerable from memory — not just "describe X" but a sharp prompt like "When does PostgreSQL choose a Bitmap Heap Scan?"`;

  const userPrompt = `Section: "${sectionTitle}"\n\n${clip(sectionContent)}`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_completion_tokens: 2500,
  });

  const parsed = extractJSONArray(response.choices[0]?.message?.content || '');
  if (!Array.isArray(parsed)) throw new Error('Flashcards response was not an array');
  return parsed as Flashcard[];
}

// ─── JSON helpers ────────────────────────────────────────────────────────────

function extractJSONArray(text: string): unknown {
  try { const v = JSON.parse(text); if (Array.isArray(v)) return v; } catch {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    try { const v = JSON.parse(codeBlock[1]); if (Array.isArray(v)) return v; } catch {}
  }
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1)); } catch {}
  }
  throw new Error('Could not extract valid JSON array from LLM response');
}

function extractJSON(text: string): unknown {
  try { return JSON.parse(text); } catch {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]); } catch {}
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1)); } catch {}
  }
  throw new Error('Could not extract valid JSON from LLM response');
}
