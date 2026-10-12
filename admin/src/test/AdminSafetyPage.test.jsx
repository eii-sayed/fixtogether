import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminSafetyPage from '../pages/AdminSafetyPage';

// Mock axios instance
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

import api from '../api/axios';

const mockRulesResponse = {
  rules: [
    {
      _id: 'rule-1',
      name: 'High Voltage Microwave Magnetron Guard',
      patternType: 'keyword',
      keywords: ['magnetron', 'high voltage capacitor', 'microwave transformer'],
      riskType: 'high_voltage_shock',
      severity: 'critical',
      warningMessage: 'Lethal voltage risk: Microwave capacitors can retain fatal electrical charge even when unplugged.',
      blockAIAdvice: true,
      isActive: true,
    },
    {
      _id: 'rule-2',
      name: 'Swollen Lithium-Ion Battery Guard',
      patternType: 'regex',
      regexPattern: '(swollen|bloated|puffy|expanded).*(battery|cell|pack)',
      riskType: 'thermal_runaway_fire',
      severity: 'high',
      warningMessage: 'Fire hazard: Puncturing or charging a swollen battery can trigger a violent chemical fire.',
      blockAIAdvice: true,
      isActive: true,
    },
  ],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  return function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    );
  };
};

describe('AdminSafetyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders safety governance header and rule count', async () => {
    api.get.mockResolvedValue({ data: { data: mockRulesResponse } });

    render(<AdminSafetyPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Deterministic Safety/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText('High Voltage Microwave Magnetron Guard')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Swollen Lithium-Ion Battery Guard')
    ).toBeInTheDocument();
  });

  it('displays severity badges and risk types correctly', async () => {
    api.get.mockResolvedValue({ data: { data: mockRulesResponse } });

    render(<AdminSafetyPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/high_voltage_shock/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/thermal_runaway_fire/i)).toBeInTheDocument();
  });

  it('renders simulator button for testing safety patterns in sandbox', async () => {
    api.get.mockResolvedValue({ data: { data: mockRulesResponse } });

    render(<AdminSafetyPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTitle(/Test Simulator/i).length).toBeGreaterThan(0);
    });
  });
});
