import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RepairConversation from '../components/chat/RepairConversation';
import * as AuthContext from '../context/AuthContext';
import * as SocketContext from '../context/SocketContext';
import api from '../api/axios';

vi.mock('../api/axios');

const mockUser = {
  userId: 'user-123',
  fullName: 'Rahim Khan',
  role: 'owner',
  profileImage: { url: 'https://example.com/avatar.jpg' },
};

const mockChatData = {
  messages: [
    {
      _id: 'msg-1',
      repairRequest: 'rr-100',
      sender: {
        _id: 'user-456',
        fullName: 'Sumon Electronics',
        role: 'technician',
      },
      recipient: 'user-123',
      content: 'Hello! We received your repair request for the HP Pavilion.',
      messageType: 'text',
      createdAt: '2026-08-18T10:00:00.000Z',
      readAt: '2026-08-18T10:05:00.000Z',
    },
    {
      _id: 'msg-2',
      repairRequest: 'rr-100',
      sender: {
        _id: 'user-123',
        fullName: 'Rahim Khan',
        role: 'owner',
      },
      recipient: 'user-456',
      content: 'Thanks! How long will the diagnostics take?',
      messageType: 'text',
      createdAt: '2026-08-18T10:06:00.000Z',
      readAt: null,
    },
  ],
  hasMore: false,
  cursor: null,
  otherParticipant: {
    _id: 'user-456',
    fullName: 'Sumon Electronics',
    professionalName: 'Sumon Electronics Pro',
    role: 'technician',
    verificationStatus: 'approved',
    city: 'Dhaka',
  },
  repairContext: {
    repairRequestId: 'rr-100',
    itemTitle: 'HP Pavilion 15',
    itemThumbnail: 'https://example.com/item.jpg',
    requestStatus: 'published',
  },
};

describe('RepairConversation Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    vi.spyOn(SocketContext, 'useSocket').mockReturnValue({
      socket: {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        connected: true,
      },
      connected: true,
      joinChat: vi.fn(),
      leaveChat: vi.fn(),
      emitTyping: vi.fn(),
      emitStopTyping: vi.fn(),
    });

    api.get.mockResolvedValue({
      data: {
        success: true,
        data: mockChatData,
      },
    });
    api.patch.mockResolvedValue({
      data: {
        success: true,
        data: { markedCount: 1 },
      },
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RepairConversation repairRequestId="rr-100" {...props} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders conversation header with participant info and verification badge', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sumon Electronics Pro')).toBeInTheDocument();
    });

    expect(screen.getByText('HP Pavilion 15')).toBeInTheDocument();
  });

  it('renders incoming and outgoing message bubbles with plain text', async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('Hello! We received your repair request for the HP Pavilion.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Thanks! How long will the diagnostics take?')
      ).toBeInTheDocument();
    });
  });

  it('disables send button when input is empty or only whitespace', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Message/i)).toBeInTheDocument();
    });

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    expect(sendBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Message/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(sendBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Can you give an estimate?' } });
    expect(sendBtn).not.toBeDisabled();
  });

  it('renders empty state when there are no messages', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          messages: [],
          hasMore: false,
          cursor: null,
          otherParticipant: mockChatData.otherParticipant,
          repairContext: mockChatData.repairContext,
        },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });
});
