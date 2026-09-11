import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  CheckCircle,
  Clock,
  Eye,
  Tag,
  Wrench,
  HelpCircle,
  Sparkles,
  BookOpen,
  MessageCircle,
} from 'lucide-react';

export default function ThreadCard({ thread, onVote }) {
  const typeConfig = {
    question: { label: 'Question', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: HelpCircle },
    troubleshooting: { label: 'Troubleshooting', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Wrench },
    discussion: { label: 'Discussion', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: MessageCircle },
    guide: { label: 'DIY Guide', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: BookOpen },
    showcase: { label: 'Showcase', color: 'bg-pink-100 text-pink-800 border-pink-200', icon: Sparkles },
  };

  const typeInfo = typeConfig[thread.type] || typeConfig.question;
  const TypeIcon = typeInfo.icon;
  const isSolved = thread.status === 'solved';

  return (
    <div className="card p-4 sm:p-5 hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 border border-gray-100 group">
      {/* Left Column: Reddit-style Vote Widget */}
      <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-1 shrink-0 bg-gray-50/80 p-2 sm:p-2.5 rounded-2xl border border-gray-100 sm:w-12">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (onVote) onVote(thread._id, thread.upvoted ? 0 : 1);
          }}
          className={`p-1 rounded-xl transition-all ${
            thread.upvoted
              ? 'text-orange-600 bg-orange-100/80 scale-105'
              : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
          }`}
          title="Upvote"
          aria-label="Upvote"
        >
          <ArrowBigUp className={`w-6 h-6 ${thread.upvoted ? 'fill-orange-600' : ''}`} />
        </button>

        <span
          className={`text-xs font-bold font-mono ${
            thread.upvoted
              ? 'text-orange-600'
              : thread.downvoted
              ? 'text-indigo-600'
              : 'text-gray-700'
          }`}
        >
          {thread.score ?? thread.upvoteScore ?? 0}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (onVote) onVote(thread._id, thread.downvoted ? 0 : -1);
          }}
          className={`p-1 rounded-xl transition-all ${
            thread.downvoted
              ? 'text-indigo-600 bg-indigo-100/80 scale-105'
              : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
          title="Downvote"
          aria-label="Downvote"
        >
          <ArrowBigDown className={`w-6 h-6 ${thread.downvoted ? 'fill-indigo-600' : ''}`} />
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 min-w-0 space-y-2.5">
        {/* Meta Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Post Type Flair */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeInfo.color}`}
          >
            <TypeIcon className="w-3 h-3" />
            {typeInfo.label}
          </span>

          {/* Solved Badge */}
          {isSolved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Solved
            </span>
          )}

          {/* Category */}
          {thread.category?.name && (
            <span className="text-gray-500 font-medium">
              in <span className="font-semibold text-gray-700">{thread.category.name}</span>
            </span>
          )}

          <span className="text-gray-300">•</span>

          {/* Author */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="font-medium text-gray-800 hover:text-primary-700">
              {thread.author?.fullName || 'Community Member'}
            </span>
            {thread.author?.role === 'technician' && (
              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-blue-100 text-blue-800">
                Technician
              </span>
            )}
          </div>

          <span className="text-gray-300">•</span>

          {/* Time Ago */}
          <span className="text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(thread.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors leading-snug">
          <Link to={`/forum/${thread._id}`}>{thread.title}</Link>
        </h3>

        {/* Content Preview */}
        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {thread.content}
        </p>

        {/* Image Preview Thumbnail (if attached) */}
        {thread.images?.length > 0 && (
          <div className="pt-1">
            <div className="w-24 h-16 sm:w-32 sm:h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={thread.images[0].url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
          </div>
        )}

        {/* Footer Bar: Tags, Comments Count, Views */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {thread.tags?.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Stats: Comments & Views */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              to={`/forum/${thread._id}`}
              className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 font-semibold transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span>{thread.commentsCount || 0} answers & replies</span>
            </Link>

            <span className="flex items-center gap-1 text-gray-400">
              <Eye className="w-3.5 h-3.5" />
              <span>{thread.viewsCount || 0} views</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
