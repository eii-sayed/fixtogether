import { Navigate, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import RepairConversation from '../../components/chat/RepairConversation';

export default function RepairRequestMessagesPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repairRequestId = id || searchParams.get('repairId');

  if (!repairRequestId) {
    return <Navigate to="/messages" replace />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden h-[100dvh] min-h-[100svh]">
      <RepairConversation
        repairRequestId={repairRequestId}
        showBackButton={true}
        isFullScreen={true}
        onBack={() => navigate(-1)}
      />
    </div>
  );
}
