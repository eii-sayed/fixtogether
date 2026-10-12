import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../pages/DashboardPage';

// Mock axios instance
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

import api from '../api/axios';

const mockDashboardData = {
  metrics: {
    totalUsers: 142,
    activeRepairs: 28,
    resolvedDisputes: 15,
    divertedWasteKg: 420.5,
  },
  criticalAlerts: {
    criticalSafetyFlags: [{ _id: 'flag-1', reason: 'High voltage microwave capacitor' }],
    highPriorityDisputes: [{ _id: 'disp-1', issue: 'Refused warranty rework' }],
    pendingVerifications: [{ _id: 'ver-1', applicant: 'Tech Rahim' }],
  },
  urgentQueue: [
    {
      _id: 'q-1',
      entityType: 'Dispute',
      priority: 'critical',
      title: 'Broken TV motherboard damage claim',
      status: 'pending',
      createdAt: '2026-10-10T12:00:00.000Z',
    },
  ],
  systemHealth: {
    apiStatus: 'healthy',
    dbLatencyMs: 14,
    outboxQueueSize: 0,
  },
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

describe('Admin DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders command center title and operational queues', async () => {
    api.get.mockResolvedValue({ data: { data: mockDashboardData } });

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Administrator Command Center')).toBeInTheDocument();
    });

    // Check critical operational queues cards
    expect(screen.getByText('Critical Safety')).toBeInTheDocument();
    expect(screen.getByText('Active Disputes')).toBeInTheDocument();
    expect(screen.getByText('Verifications')).toBeInTheDocument();

    // Check quick action links
    expect(screen.getByRole('link', { name: /Open Review Queue/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Audit Logs/i })).toBeInTheDocument();
  });

  it('displays accurate count of critical alerts from the API', async () => {
    api.get.mockResolvedValue({ data: { data: mockDashboardData } });

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Critical Safety')).toBeInTheDocument();
    });

    // Flag count (1 critical safety flag)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders error state if fetching dashboard fails', async () => {
    api.get.mockRejectedValue(new Error('Network error loading metrics'));

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Network error loading metrics/i)).toBeInTheDocument();
    });
  });
});
