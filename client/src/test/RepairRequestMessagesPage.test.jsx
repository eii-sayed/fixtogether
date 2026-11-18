import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RepairRequestMessagesPage from '../pages/repairs/RepairRequestMessagesPage';

vi.mock('../components/chat/RepairConversation', () => ({
  default: ({ repairRequestId }) => <div>Conversation: {repairRequestId}</div>,
}));

describe('RepairRequestMessagesPage', () => {
  it('opens the conversation from the legacy chat URL', () => {
    render(
      <MemoryRouter initialEntries={['/chat?repairId=repair-123']}>
        <Routes>
          <Route path="/chat" element={<RepairRequestMessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Conversation: repair-123')).toBeInTheDocument();
  });

  it('redirects to messages when no repair request ID is provided', () => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<RepairRequestMessagesPage />} />
          <Route path="/messages" element={<div>Messages inbox</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Messages inbox')).toBeInTheDocument();
  });
});
