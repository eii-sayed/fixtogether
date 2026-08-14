import { Check, CheckCheck } from 'lucide-react';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble({ message, isSent, showAvatar = true }) {
  const isSystem = message.messageType === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 mb-1 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {showAvatar ? (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-1 ${
            isSent
              ? 'bg-primary-100 text-primary-700'
              : 'bg-secondary-100 text-secondary-700'
          }`}
        >
          {message.sender?.fullName?.charAt(0)?.toUpperCase() || '?'}
        </div>
      ) : (
        <div className="w-7 shrink-0" />
      )}

      {/* Bubble */}
      <div className={`max-w-[75%] min-w-[80px]`}>
        {showAvatar && (
          <p className={`text-[10px] font-medium mb-0.5 px-1 ${
            isSent ? 'text-right text-primary-600' : 'text-left text-secondary-600'
          }`}>
            {message.sender?.fullName}
          </p>
        )}
        <div
          className={`px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isSent
              ? 'bg-primary-600 text-white rounded-2xl rounded-tr-md'
              : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-md'
          }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
          {isSent && (
            message.readAt
              ? <CheckCheck className="w-3 h-3 text-primary-400" />
              : <Check className="w-3 h-3 text-gray-300" />
          )}
        </div>
      </div>
    </div>
  );
}
