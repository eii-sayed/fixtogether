import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminReviewQueuePage from '../pages/AdminReviewQueuePage';

// Mock axios instance
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { userId: 'admin-1', fullName: 'Super Admin', role: 'admin' },
    isAuthenticated: true,
  })),
}));

import api from '../api/axios';

const mockQueueResponse = {
  items: [
    {
      _id: 'rq-item-1',
      entityType: 'RepairRequest',
      entityId: 'rr-101',
      priority: 'critical',
      reason: 'Safety flag: Lithium battery swell hazard detected',
      status: 'pending',
      claimedBy: null,
      slaExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: '2026-10-10T10:00:00.000Z',
    },
    {
      _id: 'rq-item-2',
      entityType: 'Dispute',
      entityId: 'disp-202',
      priority: 'high',
      reason: 'Owner filed dispute regarding broken screen during repair',
      status: 'in_review',
      claimedBy: { _id: 'admin-1', fullName: 'Super Admin' },
      lockedUntil: new Date(Date.now() + 1800000).toISOString(),
      slaExpiresAt: new Date(Date.now() + 7200000).toISOString(),
      createdAt: '2026-10-10T11:00:00.000Z',
    },
  ],
  counts: {
    all: 2,
    critical: 1,
    safety: 1,
    disputes: 1,
    verifications: 0,
    users: 0,
    requests: 0,
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

describe('AdminReviewQueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders queue tabs and filter navigation', async () => {
    api.get.mockResolvedValue({ data: { data: mockQueueResponse } });

    render(<AdminReviewQueuePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('All Items')).toBeInTheDocument();
    });

    expect(screen.getByText('Critical Escalations')).toBeInTheDocument();
    expect(screen.getByText('Safety Flags')).toBeInTheDocument();
    expect(screen.getByText('Disputes')).toBeInTheDocument();
    expect(screen.getByText('Verifications')).toBeInTheDocument();
  });

  it('renders triage items with reasons and priorities', async () => {
    api.get.mockResolvedValue({ data: { data: mockQueueResponse } });

    render(<AdminReviewQueuePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/Safety flag: Lithium battery swell hazard detected/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Owner filed dispute regarding broken screen during repair/i)
    ).toBeInTheDocument();
  });

  it('renders empty state when queue has no matching tasks', async () => {
    api.get.mockResolvedValue({ data: { data: { items: [], counts: {} } } });

    render(<AdminReviewQueuePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Review Queue is Clear/i)).toBeInTheDocument();
    });
  });
});
