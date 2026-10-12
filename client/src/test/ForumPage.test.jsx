import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForumPage from '../pages/forum/ForumPage';

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
    user: { userId: 'user-1', fullName: 'Rahim Khan', role: 'owner' },
    isAuthenticated: true,
  })),
}));

// Mock SocketContext
vi.mock('../context/SocketContext', () => ({
  useSocket: vi.fn(() => ({ socket: null, connected: false })),
}));

import api from '../api/axios';

const mockThreadsResponse = {
  threads: [
    {
      _id: 'thread-1',
      title: 'How to diagnose a shorted capacitor on a gaming laptop motherboard?',
      content: 'My Asus ROG Zephyrus suddenly shut down and refuses to power on. I hear a faint clicking noise near the charging IC...',
      category: { _id: 'cat-1', name: 'Laptops', slug: 'laptops' },
      author: { _id: 'author-1', fullName: 'Sumon Tech', role: 'technician' },
      upvotes: ['user-1', 'user-2'],
      upvoteCount: 2,
      replyCount: 5,
      isSolved: true,
      createdAt: '2026-10-09T14:00:00.000Z',
    },
    {
      _id: 'thread-2',
      title: 'Best replacement heating element for Philips Airfryer?',
      content: 'Has anyone sourced compatible heating coils for HD9200 models? Looking for reliable suppliers in Dhaka.',
      category: { _id: 'cat-2', name: 'Kitchen Appliances', slug: 'appliances' },
      author: { _id: 'author-2', fullName: 'Amina Begum', role: 'owner' },
      upvotes: [],
      upvoteCount: 0,
      replyCount: 2,
      isSolved: false,
      createdAt: '2026-10-10T16:20:00.000Z',
    },
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 15,
    totalPages: 1,
  },
};

const mockCategoriesResponse = [
  { _id: 'cat-1', name: 'Laptops', slug: 'laptops' },
  { _id: 'cat-2', name: 'Kitchen Appliances', slug: 'appliances' },
];

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

describe('ForumPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forum discussions and author details', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/categories')) {
        return Promise.resolve({ data: { data: mockCategoriesResponse } });
      }
      return Promise.resolve({ data: { data: mockThreadsResponse } });
    });

    render(<ForumPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/How to diagnose a shorted capacitor on a gaming laptop motherboard\?/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Best replacement heating element for Philips Airfryer\?/i)
    ).toBeInTheDocument();
  });

  it('renders Ask Question / New Thread call to action for authenticated users', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/categories')) {
        return Promise.resolve({ data: { data: mockCategoriesResponse } });
      }
      return Promise.resolve({ data: { data: mockThreadsResponse } });
    });

    render(<ForumPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Ask a Question/i })).toBeInTheDocument();
    });
  });

  it('renders empty state when search finds no results', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/categories')) {
        return Promise.resolve({ data: { data: mockCategoriesResponse } });
      }
      return Promise.resolve({ data: { data: { threads: [], pagination: { total: 0 } } } });
    });

    render(<ForumPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No Questions or Discussions Found/i)).toBeInTheDocument();
    });
  });
});
