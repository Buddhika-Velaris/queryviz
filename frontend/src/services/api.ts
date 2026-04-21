import axios, { AxiosError } from 'axios';
import { cacheKey, cachedCall } from '../lib/cache';

const API_BASE_URL = '/api';

type TokenGetter = () => Promise<string | null>;

let getAuthToken: TokenGetter | null = null;

export function setAuthTokenGetter(getter: TokenGetter | null): void {
  getAuthToken = getter;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90 second timeout for AI operations
});

// Request interceptor: attach Clerk session token + log
api.interceptors.request.use(
  async (config) => {
    if (getAuthToken) {
      try {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // No token available — request proceeds; backend will 401 if required
      }
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    if (response.data.metadata?.processingTime) {
      console.log(`[API] Request completed in ${response.data.metadata.processingTime}ms`);
    }
    return response;
  },
  (error: AxiosError<any>) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - AI analysis took too long. Try a simpler query.');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Sign in required to use this feature.');
    }

    if (error.response?.status === 403) {
      throw new Error('Access restricted to velaris.io accounts.');
    }

    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }

    if (error.response?.status === 413) {
      throw new Error('Query plan too large. Maximum size is 5MB.');
    }
    
    return Promise.reject(error);
  }
);

export async function analyzeSinglePlan(planJson: string) {
  try {
    const response = await api.post('/analyze/single', { planJson });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to analyze query plan');
  }
}

export async function comparePlans(planA: string, planB: string) {
  try {
    const response = await api.post('/analyze/compare', { planA, planB });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to compare query plans');
  }
}

export async function explainNode(nodeType: string): Promise<string> {
  return cachedCall(cacheKey('explain-node', nodeType.toLowerCase()), async () => {
    try {
      const response = await api.post('/analyze/explain-node', { nodeType });
      return response.data.explanation as string;
    } catch (error: any) {
      console.warn(`[API] Failed to explain node "${nodeType}":`, error.message);
      if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
        throw new Error('retryable');
      }
      throw new Error(error.response?.data?.error || 'Failed to explain node');
    }
  }).catch((e) => {
    if (e.message === 'retryable') {
      return `${nodeType}: A PostgreSQL execution plan operation. Click again to retry loading full explanation.`;
    }
    throw e;
  });
}

export interface SectionSummary {
  tldr: string;
  takeaways: string[];
  cached?: boolean;
}

export async function summarizeSection(
  sectionId: string,
  sectionTitle: string,
  sectionContent: string,
): Promise<SectionSummary> {
  return cachedCall(cacheKey('summary', sectionTitle, sectionContent), async () => {
    try {
      const response = await api.post('/learn/summary', { sectionId, sectionTitle, sectionContent });
      return response.data as SectionSummary;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to summarize section');
    }
  });
}

export async function askAboutSection(
  sectionTitle: string,
  sectionContent: string,
  question: string,
): Promise<string> {
  return cachedCall(cacheKey('ask', sectionTitle, sectionContent, question.trim().toLowerCase()), async () => {
    try {
      const response = await api.post('/learn/ask', { sectionTitle, sectionContent, question });
      return response.data.answer as string;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to answer question');
    }
  });
}

export async function explainTerm(term: string, sectionTitle?: string): Promise<string> {
  return cachedCall(cacheKey('term', term.toLowerCase().trim()), async () => {
    try {
      const response = await api.post('/learn/term', { term, sectionTitle });
      return response.data.explanation as string;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to explain term');
    }
  });
}

// ─── Quiz / sandbox / flashcards ─────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuiz(
  sectionId: string,
  sectionTitle: string,
  sectionContent: string,
): Promise<QuizQuestion[]> {
  return cachedCall(cacheKey('quiz', sectionTitle, sectionContent), async () => {
    try {
      const response = await api.post('/learn/quiz', { sectionId, sectionTitle, sectionContent });
      return response.data.questions as QuizQuestion[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to generate quiz');
    }
  });
}

export interface PracticeScenario {
  scenario: string;
  schema: string;
  task: string;
  hints: string[];
}

export async function generateScenario(
  sectionId: string,
  sectionTitle: string,
  sectionContent: string,
): Promise<PracticeScenario> {
  return cachedCall(cacheKey('scenario', sectionTitle, sectionContent), async () => {
    try {
      const response = await api.post('/learn/practice/scenario', { sectionId, sectionTitle, sectionContent });
      return response.data.scenario as PracticeScenario;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to generate scenario');
    }
  });
}

export interface PracticeGrade {
  score: number;
  verdict: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  optimalSolution: string;
}

export async function gradeSqlAttempt(scenario: PracticeScenario, attempt: string): Promise<PracticeGrade> {
  return cachedCall(cacheKey('grade', scenario.task, attempt.trim()), async () => {
    try {
      const response = await api.post('/learn/practice/grade', { scenario, attempt });
      return response.data as PracticeGrade;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to grade attempt');
    }
  });
}

export interface Flashcard {
  front: string;
  back: string;
}

export async function generateFlashcards(
  sectionId: string,
  sectionTitle: string,
  sectionContent: string,
): Promise<Flashcard[]> {
  return cachedCall(cacheKey('flashcards', sectionTitle, sectionContent), async () => {
    try {
      const response = await api.post('/learn/flashcards', { sectionId, sectionTitle, sectionContent });
      return response.data.cards as Flashcard[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to generate flashcards');
    }
  });
}

// ─── Schema validation ────────────────────────────────────────────────────────

export interface SchemaFinding {
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  knowledgeRef?: string;
}

export interface SchemaRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

export interface SuggestedReading {
  sectionRef: string;
  number: number;
  title: string;
  reason: string;
}

export interface SchemaValidationResult {
  overallScore: number;
  scoreLabel: string;
  designSummary: string;
  findings: SchemaFinding[];
  recommendations: SchemaRecommendation[];
  correctedSchema: string;
  suggestedReadings: SuggestedReading[];
  summary: string;
}

export async function validateSchema(
  sql: string,
  userContext?: string,
): Promise<{ result: SchemaValidationResult; cached: boolean }> {
  try {
    const response = await api.post('/validate/schema', { sql, userContext: userContext?.trim() || undefined });
    return response.data as { result: SchemaValidationResult; cached: boolean };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to validate schema');
  }
}

// ─── Query generation ─────────────────────────────────────────────────────────

export interface OptimizedQuery {
  description: string;
  sql: string;
  explanation: string;
}

export interface QueryIndex {
  sql: string;
  reason: string;
  impact: 'critical' | 'recommended' | 'optional';
}

export interface QueryGenerationResult {
  queries: OptimizedQuery[];
  indexes: QueryIndex[];
  notes: string;
}

export async function generateOptimalQueries(
  primaryDdl: string,
  accessPatterns: string,
  relatedDdl?: string,
): Promise<{ result: QueryGenerationResult; cached: boolean }> {
  try {
    const response = await api.post('/validate/queries', {
      primaryDdl,
      accessPatterns,
      relatedDdl: relatedDdl?.trim() || undefined,
    });
    return response.data as { result: QueryGenerationResult; cached: boolean };
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to generate queries');
  }
}

export default api;
