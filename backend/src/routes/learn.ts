import { Router, Request, Response } from 'express';
import {
  summarizeSection,
  askAboutSection,
  explainTerm,
  generateQuiz,
  generateScenario,
  gradeSqlAttempt,
  generateFlashcards,
  PracticeScenario,
} from '../services/learnService.js';
import { getOrCompute, hashKey } from '../services/cache.js';

const router = Router();

interface SectionRequest {
  sectionId: string;
  sectionTitle: string;
  sectionContent: string;
}

interface AskRequest {
  sectionTitle: string;
  sectionContent: string;
  question: string;
}

interface TermRequest {
  term: string;
  sectionTitle?: string;
}

interface GradeRequest {
  scenario: PracticeScenario;
  attempt: string;
}

const MAX_CONTENT = 50000;
const MAX_QUESTION = 1000;
const MAX_TERM = 80;
const MAX_ATTEMPT = 8000;

function validateSectionBody(body: SectionRequest): string | null {
  if (!body.sectionId || !body.sectionTitle || !body.sectionContent) {
    return 'sectionId, sectionTitle, and sectionContent are required';
  }
  if (body.sectionContent.length > MAX_CONTENT) return 'section content exceeds size limit';
  return null;
}

router.post('/summary', async (req: Request<{}, {}, SectionRequest>, res: Response) => {
  try {
    const err = validateSectionBody(req.body);
    if (err) return res.status(400).json({ error: err });
    const { sectionTitle, sectionContent } = req.body;
    const key = hashKey('summary', sectionTitle, sectionContent);
    const { value, cached } = await getOrCompute(
      'summary', key, () => summarizeSection(sectionTitle, sectionContent),
    );
    res.json({ ...(value as object), cached });
  } catch (error: any) {
    console.error('Learn summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize section' });
  }
});

router.post('/ask', async (req: Request<{}, {}, AskRequest>, res: Response) => {
  try {
    const { sectionTitle, sectionContent, question } = req.body;
    if (!sectionTitle || !sectionContent || !question) {
      return res.status(400).json({ error: 'sectionTitle, sectionContent, and question are required' });
    }
    if (question.length > MAX_QUESTION) return res.status(400).json({ error: 'question too long' });
    if (sectionContent.length > MAX_CONTENT) return res.status(400).json({ error: 'section content exceeds size limit' });

    // Cache by the question+section hash — identical repeats (e.g. suggested
    // prompts, refresh, back-nav) avoid a roundtrip.
    const key = hashKey('ask', sectionTitle, sectionContent, question.trim().toLowerCase());
    const { value, cached } = await getOrCompute(
      'ask', key, () => askAboutSection(sectionTitle, sectionContent, question.trim()),
    );
    res.json({ answer: value, cached });
  } catch (error: any) {
    console.error('Learn ask error:', error);
    res.status(500).json({ error: error.message || 'Failed to answer question' });
  }
});

router.post('/term', async (req: Request<{}, {}, TermRequest>, res: Response) => {
  try {
    const { term, sectionTitle } = req.body;
    if (!term || typeof term !== 'string') return res.status(400).json({ error: 'term is required' });
    if (term.length > MAX_TERM) return res.status(400).json({ error: 'term too long' });

    // Term cache is section-agnostic — a term means the same thing everywhere.
    const key = hashKey('term', term.toLowerCase().trim());
    const { value, cached } = await getOrCompute(
      'term', key, () => explainTerm(term.trim(), sectionTitle),
    );
    res.json({ explanation: value, cached });
  } catch (error: any) {
    console.error('Learn term error:', error);
    res.status(500).json({ error: error.message || 'Failed to explain term' });
  }
});

router.post('/quiz', async (req: Request<{}, {}, SectionRequest>, res: Response) => {
  try {
    const err = validateSectionBody(req.body);
    if (err) return res.status(400).json({ error: err });
    const { sectionTitle, sectionContent } = req.body;
    const key = hashKey('quiz', sectionTitle, sectionContent);
    const { value, cached } = await getOrCompute(
      'quiz', key, () => generateQuiz(sectionTitle, sectionContent),
    );
    res.json({ questions: value, cached });
  } catch (error: any) {
    console.error('Learn quiz error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

router.post('/practice/scenario', async (req: Request<{}, {}, SectionRequest>, res: Response) => {
  try {
    const err = validateSectionBody(req.body);
    if (err) return res.status(400).json({ error: err });
    const { sectionTitle, sectionContent } = req.body;
    const key = hashKey('scenario', sectionTitle, sectionContent);
    const { value, cached } = await getOrCompute(
      'scenario', key, () => generateScenario(sectionTitle, sectionContent),
    );
    res.json({ scenario: value, cached });
  } catch (error: any) {
    console.error('Learn scenario error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate scenario' });
  }
});

router.post('/practice/grade', async (req: Request<{}, {}, GradeRequest>, res: Response) => {
  try {
    const { scenario, attempt } = req.body;
    if (!scenario || !attempt) return res.status(400).json({ error: 'scenario and attempt are required' });
    if (attempt.length > MAX_ATTEMPT) return res.status(400).json({ error: 'attempt exceeds size limit' });

    const key = hashKey('grade', scenario.task, attempt.trim());
    const { value, cached } = await getOrCompute(
      'grade', key, () => gradeSqlAttempt(scenario, attempt.trim()),
    );
    res.json({ ...(value as object), cached });
  } catch (error: any) {
    console.error('Learn grade error:', error);
    res.status(500).json({ error: error.message || 'Failed to grade attempt' });
  }
});

router.post('/flashcards', async (req: Request<{}, {}, SectionRequest>, res: Response) => {
  try {
    const err = validateSectionBody(req.body);
    if (err) return res.status(400).json({ error: err });
    const { sectionTitle, sectionContent } = req.body;
    const key = hashKey('flashcards', sectionTitle, sectionContent);
    const { value, cached } = await getOrCompute(
      'flashcards', key, () => generateFlashcards(sectionTitle, sectionContent),
    );
    res.json({ cards: value, cached });
  } catch (error: any) {
    console.error('Learn flashcards error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

export default router;
