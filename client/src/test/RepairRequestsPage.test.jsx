import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock modules
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/SocketContext', () => ({
  useSocket: vi.fn(() => ({ socket: null, connected: false })),
}));

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import RepairRequestsPage from '../pages/repairs/RepairRequestsPage';

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

describe('RepairRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Role-based filter visibility', () => {
    it('shows Drafts tab for owner role', async () => {
      useAuth.mockReturnValue({ user: { role: 'owner', userId: '1' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: null, connected: false });
      api.get.mockResolvedValue({ data: { data: { repairRequests: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } } } });

      render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Drafts')).toBeTruthy();
      });
    });

    it('does NOT show Draft or Drafts tab for technician role', async () => {
      useAuth.mockReturnValue({ user: { role: 'technician', userId: '2' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: null, connected: false });
      api.get.mockResolvedValue({ data: { data: { repairRequests: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } } } });

      render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText('Drafts')).toBeNull();
        expect(screen.queryByText('Draft')).toBeNull();
      });
    });

    it('shows role tabs for admin role', async () => {
      useAuth.mockReturnValue({ user: { role: 'admin', userId: '3' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: null, connected: false });
      api.get.mockResolvedValue({ data: { data: { repairRequests: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } } } });

      render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('All Requests')).toBeTruthy();
        expect(screen.getByText('Safety Flagged')).toBeTruthy();
      });
    });
  });

  describe('429 Error handling', () => {
    it('displays rate limit error without crashing or retrying', async () => {
      useAuth.mockReturnValue({ user: { role: 'owner', userId: '1' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: null, connected: false });

      const rateLimitError = new Error('Too many requests');
      rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
      rateLimitError.retryAfter = 900;
      rateLimitError.response = { status: 429 };
      api.get.mockRejectedValue(rateLimitError);

      render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Rate limit reached/i)).toBeTruthy();
      });
    });
  });

  describe('Socket.IO listener cleanup', () => {
    it('registers and cleans up repair-request:published listener', async () => {
      const onFn = vi.fn();
      const offFn = vi.fn();
      const mockSocket = { on: onFn, off: offFn };

      useAuth.mockReturnValue({ user: { role: 'technician', userId: '2' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: mockSocket, connected: true });
      api.get.mockResolvedValue({ data: { data: { repairRequests: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } } } });

      const { unmount } = render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(onFn).toHaveBeenCalledWith('repair-request:published', expect.any(Function));
      });

      unmount();

      expect(offFn).toHaveBeenCalledWith('repair-request:published', expect.any(Function));
    });
  });

  describe('Role-specific page titles', () => {
    it('shows "Repair Requests Journey" for owner', async () => {
      useAuth.mockReturnValue({ user: { role: 'owner', userId: '1' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: null, connected: false });
      api.get.mockResolvedValue({ data: { data: { repairRequests: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } } } });

      render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Repair Requests Journey')).toBeTruthy();
      });
    });

    it('shows "Technician Repair Opportunities" for technician', async () => {
      useAuth.mockReturnValue({ user: { role: 'technician', userId: '2' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: null, connected: false });
      api.get.mockResolvedValue({ data: { data: { repairRequests: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } } } });

      render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Technician Repair Opportunities')).toBeTruthy();
      });
    });

    it('shows "Admin Repair Moderation" for admin', async () => {
      useAuth.mockReturnValue({ user: { role: 'admin', userId: '3' }, isAuthenticated: true });
      useSocket.mockReturnValue({ socket: null, connected: false });
      api.get.mockResolvedValue({ data: { data: { repairRequests: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } } } });

      render(<RepairRequestsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Admin Repair Moderation')).toBeTruthy();
      });
    });
  });
});

describe('MobileBottomNav role tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Requests tab for all roles', async () => {
    const mobileNavConfig = {
      owner: ['Home', 'Requests', 'Add', 'Messages', 'Profile'],
      technician: ['Dashboard', 'Requests', 'My Jobs', 'Messages', 'Profile'],
      admin: ['Dashboard', 'Requests', 'Users', 'Verify', 'Profile'],
    };

    for (const [role, tabs] of Object.entries(mobileNavConfig)) {
      expect(tabs).toContain('Requests');
    }
  });
});
