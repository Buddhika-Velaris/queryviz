import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    throw new Error(error.response?.data?.error || 'Failed to explain node');
  }
}

export default api;
