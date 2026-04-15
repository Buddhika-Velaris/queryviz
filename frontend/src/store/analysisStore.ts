import { create } from 'zustand';
import type { SchemaValidationResult } from '../services/api';

interface SingleResult {
  plan: any;
  metrics: any;
  analysis: any;
}

interface ComparisonResult {
  planA: { plan: any; metrics: any };
  planB: { plan: any; metrics: any };
  comparison: any;
  improvement: any;
}

interface SchemaValidationState {
  sql: string;
  userContext: string;
  result: SchemaValidationResult | null;
  cached: boolean;
  error: string | null;
  loading: boolean;
}

interface AnalysisStore {
  singleResult: SingleResult | null;
  singleError: string | null;
  singleLoading: boolean;

  comparisonResult: ComparisonResult | null;
  comparisonError: string | null;
  comparisonLoading: boolean;

  schemaValidation: SchemaValidationState;

  setSingleResult: (result: SingleResult) => void;
  setSingleError: (error: string | null) => void;
  setSingleLoading: (loading: boolean) => void;
  clearSingle: () => void;

  setComparisonResult: (result: ComparisonResult) => void;
  setComparisonError: (error: string | null) => void;
  setComparisonLoading: (loading: boolean) => void;
  clearComparison: () => void;

  setSchemaValidation: (patch: Partial<SchemaValidationState>) => void;
  clearSchemaValidation: () => void;
}

const INITIAL_SCHEMA_VALIDATION: SchemaValidationState = {
  sql: '',
  userContext: '',
  result: null,
  cached: false,
  error: null,
  loading: false,
};

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  singleResult: null,
  singleError: null,
  singleLoading: false,

  comparisonResult: null,
  comparisonError: null,
  comparisonLoading: false,

  schemaValidation: INITIAL_SCHEMA_VALIDATION,

  setSingleResult: (result) => set({ singleResult: result, singleError: null }),
  setSingleError: (error) => set({ singleError: error }),
  setSingleLoading: (loading) => set({ singleLoading: loading }),
  clearSingle: () => set({ singleResult: null, singleError: null }),

  setComparisonResult: (result) => set({ comparisonResult: result, comparisonError: null }),
  setComparisonError: (error) => set({ comparisonError: error }),
  setComparisonLoading: (loading) => set({ comparisonLoading: loading }),
  clearComparison: () => set({ comparisonResult: null, comparisonError: null }),

  setSchemaValidation: (patch) =>
    set((state) => ({ schemaValidation: { ...state.schemaValidation, ...patch } })),
  clearSchemaValidation: () => set({ schemaValidation: INITIAL_SCHEMA_VALIDATION }),
}));
