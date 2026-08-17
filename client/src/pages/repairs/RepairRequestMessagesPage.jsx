import { useParams, useNavigate } from 'react-router-dom';
import RepairConversation from '../../components/chat/RepairConversation';

export default function RepairRequestMessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden h-[100dvh] min-h-[100svh]">
      <RepairConversation
        repairRequestId={id}
        showBackButton={true}
        isFullScreen={true}
        onBack={() => navigate(-1)}
      />
    </div>
  );
}
