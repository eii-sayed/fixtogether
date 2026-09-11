import { Link } from "react-router-dom";
import {
  Bookmark,
  CheckCircle2,
  Eye,
  Heart,
  MessageCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export function TechnicianBadge({ role }) {
  return role === "technician" ? (
    <span className="badge-blue inline-flex items-center gap-1">
      <ShieldCheck className="w-3 h-3" /> Technician
    </span>
  ) : null;
}
export function ThreadStats({ thread }) {
  return (
    <div className="flex gap-3 text-xs text-gray-500">
      <span className="inline-flex items-center gap-1">
        <Eye className="w-3.5 h-3.5" />
        {thread.views}
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageCircle className="w-3.5 h-3.5" />
        {thread.replyCount}
      </span>
      <span className="inline-flex items-center gap-1">
        <Heart className="w-3.5 h-3.5" />
        {thread.likesCount}
      </span>
    </div>
  );
}
export function ThreadCard({ thread }) {
  return (
    <Link
      to={`/forum/threads/${thread._id}`}
      className="card block p-5 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <div className="flex justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary-600">
            {thread.category}
          </span>
          <h3 className="mt-1 text-lg font-bold text-gray-900">
            {thread.title}
          </h3>
        </div>
        {thread.status === "Resolved" && (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        )}
      </div>
      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
        {thread.description}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{thread.author?.fullName || "Community member"}</span>
          <TechnicianBadge role={thread.author?.role} />
        </div>
        <ThreadStats thread={thread} />
      </div>
    </Link>
  );
}
export function LikeButton({ liked, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm ${liked ? "text-rose-600" : "text-gray-500 hover:text-rose-600"}`}
    >
      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
      {count}
    </button>
  );
}
export function BookmarkButton({ bookmarked, onClick }) {
  return (
    <button
      type="button"
      aria-label="Bookmark thread"
      onClick={onClick}
      className={
        bookmarked ? "text-amber-500" : "text-gray-400 hover:text-amber-500"
      }
    >
      <Bookmark className={`w-5 h-5 ${bookmarked ? "fill-current" : ""}`} />
    </button>
  );
}
export function ReplyCard({ reply, canAccept, onLike, onAccept, onDelete }) {
  return (
    <article
      className={`rounded-xl border p-4 ${reply.isAcceptedAnswer ? "border-emerald-300 bg-emerald-50/60" : "border-gray-200 bg-white"}`}
    >
      <div className="flex justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">
          {reply.author?.fullName || "Community member"}{" "}
          <TechnicianBadge role={reply.author?.role} />
        </div>
        {reply.isAcceptedAnswer && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Accepted Solution
          </span>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
        {reply.content}
      </p>
      {reply.links?.length > 0 && (
        <div className="mt-3 space-y-1">
          {reply.links.map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-primary-600 underline break-all"
            >
              {link}
            </a>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-4">
        <LikeButton liked={false} count={reply.likesCount} onClick={onLike} />
        {canAccept && !reply.isAcceptedAnswer && (
          <button
            onClick={onAccept}
            className="text-xs font-semibold text-emerald-700"
          >
            Accept solution
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-600"
            aria-label="Delete reply"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  );
}
