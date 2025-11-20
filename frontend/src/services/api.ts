import axios, { AxiosError } from 'axios';

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

export default api;
