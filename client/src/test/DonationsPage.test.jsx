import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DonationsPage from '../pages/donations/DonationsPage';

// Mock axios instance
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { userId: 'org-user-1', fullName: 'Hope Foundation', role: 'organization' },
    isAuthenticated: true,
  })),
}));

// Mock SocketContext
vi.mock('../context/SocketContext', () => ({
  useSocket: vi.fn(() => ({ socket: null, connected: false })),
}));

import api from '../api/axios';

const mockDonationsResponse = {
  offers: [
    {
      _id: 'don-1',
      title: 'Working Dell Monitor 24-inch',
      category: 'monitors',
      condition: 'good',
      description: 'Upgraded my home office setup. Perfectly working screen.',
      images: [{ url: 'https://example.com/monitor.jpg' }],
      status: 'available',
      donor: { fullName: 'Rahim Khan', city: 'Dhaka' },
      createdAt: '2026-10-10T08:00:00.000Z',
    },
    {
      _id: 'don-2',
      title: 'Microwave Oven (Minor heating issue)',
      category: 'appliances',
      condition: 'for_parts_or_repair',
      description: 'Turns on and spins but does not heat food. Good for repair workshop.',
      images: [{ url: 'https://example.com/microwave.jpg' }],
      status: 'available',
      donor: { fullName: 'Salma Begum', city: 'Chittagong' },
      createdAt: '2026-10-11T09:30:00.000Z',
    },
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 12,
    totalPages: 1,
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

describe('DonationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders donation hub header and donation offer listings', async () => {
    api.get.mockResolvedValue({ data: { data: mockDonationsResponse } });

    render(<DonationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Working Dell Monitor 24-inch/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Microwave Oven \(Minor heating issue\)/i)
    ).toBeInTheDocument();
  });

  it('renders tab navigation for switching between offers and community needs', async () => {
    api.get.mockResolvedValue({ data: { data: mockDonationsResponse } });

    render(<DonationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Donation Offers/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Community Needs/i })).toBeInTheDocument();
  });

  it('displays call to action button for organization or donor', async () => {
    api.get.mockResolvedValue({ data: { data: mockDonationsResponse } });

    render(<DonationsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Post Community Need/i })).toBeInTheDocument();
    });
  });
});
