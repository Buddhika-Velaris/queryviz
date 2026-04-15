import axios, { AxiosError } from 'axios';
import { cacheKey, cachedCall } from '../lib/cache';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90 second timeout for AI operations
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
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
  try {
    const response = await api.post('/analyze/explain-node', { nodeType });
    return response.data.explanation;
  } catch (error: any) {
    console.warn(`[API] Failed to explain node "${nodeType}":`, error.message);
    
    // Graceful degradation - return a basic explanation if API fails
    if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
      return `${nodeType}: A PostgreSQL execution plan operation. Click again to retry loading full explanation.`;
    }
    
    throw new Error(error.response?.data?.error || 'Failed to explain node');
  }
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
  try {
    const response = await api.post('/learn/summary', { sectionId, sectionTitle, sectionContent });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to summarize section');
  }
}

export async function askAboutSection(
  sectionTitle: string,
  sectionContent: string,
  question: string,
): Promise<string> {
  try {
    const response = await api.post('/learn/ask', { sectionTitle, sectionContent, question });
    return response.data.answer;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to answer question');
  }
}

export async function explainTerm(term: string, sectionTitle?: string): Promise<string> {
  try {
    const response = await api.post('/learn/term', { term, sectionTitle });
    return response.data.explanation;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to explain term');
  }
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
  try {
    const response = await api.post('/learn/quiz', { sectionId, sectionTitle, sectionContent });
    return response.data.questions;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to generate quiz');
  }
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
  try {
    const response = await api.post('/learn/practice/scenario', { sectionId, sectionTitle, sectionContent });
    return response.data.scenario;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to generate scenario');
  }
}

export interface PracticeGrade {
  score: number;
  verdict: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  optimalSolution: string;
}

export async function gradeSqlAttempt(scenario: PracticeScenario, attempt: string): Promise<PracticeGrade> {
  try {
    const response = await api.post('/learn/practice/grade', { scenario, attempt });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to grade attempt');
  }
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
  try {
    const response = await api.post('/learn/flashcards', { sectionId, sectionTitle, sectionContent });
    return response.data.cards;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to generate flashcards');
  }
}

export default api;
