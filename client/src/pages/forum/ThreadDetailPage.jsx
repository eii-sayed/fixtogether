import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState } from '../../components/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  CheckCircle,
  Clock,
  Eye,
  Share2,
  Trash2,
  Edit,
  CornerDownRight,
  Send,
  HelpCircle,
  Wrench,
  Sparkles,
  BookOpen,
  MessageCircle,
  ShieldCheck,
  Package,
  Award,
  UserCheck,
} from 'lucide-react';

export default function ThreadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // New Comment state
  const [commentContent, setCommentContent] = useState('');
  const [commentType, setCommentType] = useState('answer');
  const [commentImageUrl, setCommentImageUrl] = useState('');

  // Active Reply states (Facebook-style inline reply)
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // Fetch Thread Details
  const { data: threadData, isLoading: threadLoading, error: threadError } = useQuery({
    queryKey: ['thread-detail', id],
    queryFn: () => api.get(`/threads/${id}`).then((r) => r.data.data.thread),
  });

  // Fetch Threaded Comments & Replies
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['thread-comments', id],
    queryFn: () => api.get(`/threads/${id}/comments`).then((r) => r.data.data),
  });

  // Vote on Main Thread Mutation
  const voteThreadMutation = useMutation({
    mutationFn: (direction) => api.post(`/threads/${id}/vote`, { direction }),
    onSuccess: (res) => {
      queryClient.setQueryData(['thread-detail', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          score: res.data.data.score,
          upvoted: res.data.data.upvoted,
          downvoted: res.data.data.downvoted,
        };
      });
      queryClient.invalidateQueries(['forum-threads']);
    },
    onError: () => {
      if (!isAuthenticated) toast.error('Please log in to vote on this thread');
      else toast.error('Failed to vote');
    },
  });

  // Vote on Comment Mutation
  const voteCommentMutation = useMutation({
    mutationFn: ({ commentId, direction }) =>
      api.post(`/threads/${id}/comments/${commentId}/vote`, { direction }),
    onSuccess: () => {
      queryClient.invalidateQueries(['thread-comments', id]);
    },
  });

  // Create Top-Level Comment Mutation
  const createCommentMutation = useMutation({
    mutationFn: (payload) => api.post(`/threads/${id}/comments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['thread-comments', id]);
      queryClient.invalidateQueries(['thread-detail', id]);
      queryClient.invalidateQueries(['forum-threads']);
      setCommentContent('');
      setCommentImageUrl('');
      toast.success('Your response has been posted!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    },
  });

  // Create Nested Reply Mutation (Facebook-style)
  const createReplyMutation = useMutation({
    mutationFn: (payload) => api.post(`/threads/${id}/comments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['thread-comments', id]);
      queryClient.invalidateQueries(['thread-detail', id]);
      setReplyingToCommentId(null);
      setReplyContent('');
      toast.success('Reply posted!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to post reply');
    },
  });

  // Mark Accepted Solution Mutation
  const solveMutation = useMutation({
    mutationFn: (commentId) => api.post(`/threads/${id}/comments/${commentId}/solve`),
    onSuccess: () => {
      queryClient.invalidateQueries(['thread-detail', id]);
      queryClient.invalidateQueries(['thread-comments', id]);
      queryClient.invalidateQueries(['forum-threads']);
      queryClient.invalidateQueries(['forum-stats']);
      toast.success('🌟 Answer marked as the Accepted Solution!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to mark accepted solution');
    },
  });

  // Delete Comment Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => api.delete(`/threads/${id}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['thread-comments', id]);
      queryClient.invalidateQueries(['thread-detail', id]);
      toast.success('Comment deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  // Delete Thread Mutation
  const deleteThreadMutation = useMutation({
    mutationFn: () => api.delete(`/threads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-threads']);
      queryClient.invalidateQueries(['forum-stats']);
      toast.success('Thread deleted');
      navigate('/forum');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete thread'),
  });

  if (threadLoading) return <PageLoader />;
  if (threadError || !threadData) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Thread Not Found</h2>
        <p className="text-sm text-gray-500">
          This thread may have been removed or does not exist.
        </p>
        <Link to="/forum" className="btn-primary inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Community Forum
        </Link>
      </div>
    );
  }

  const thread = threadData;
  const comments = commentsData?.comments || [];
  const isOP = user && (user.userId === thread.author?._id || user._id === thread.author?._id);
  const isAdmin = user?.role === 'admin';
  const isSolved = thread.status === 'solved';

  const typeConfig = {
    question: { label: 'Question', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: HelpCircle },
    troubleshooting: { label: 'Troubleshooting', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Wrench },
    discussion: { label: 'Discussion', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: MessageCircle },
    guide: { label: 'DIY Guide', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: BookOpen },
    showcase: { label: 'Showcase', color: 'bg-pink-100 text-pink-800 border-pink-200', icon: Sparkles },
  };
  const typeInfo = typeConfig[thread.type] || typeConfig.question;
  const TypeIcon = typeInfo.icon;

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please log in to post an answer or suggestion');
      return;
    }
    if (!commentContent.trim()) {
      toast.error('Please enter your comment or answer');
      return;
    }
    createCommentMutation.mutate({
      content: commentContent.trim(),
      type: commentType,
      images: commentImageUrl.trim() ? [{ url: commentImageUrl.trim() }] : [],
    });
  };

  const handlePostReply = (parentCommentId) => {
    if (!isAuthenticated) {
      toast.error('Please log in to reply');
      return;
    }
    if (!replyContent.trim()) {
      toast.error('Please enter your reply');
      return;
    }
    createReplyMutation.mutate({
      parentCommentId,
      content: replyContent.trim(),
      type: 'comment',
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <Link to="/forum" className="hover:text-gray-900 flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Community Forum
        </Link>
        <span className="text-gray-400">
          Posted in{' '}
          <strong className="text-gray-700">{thread.category?.name || 'Community'}</strong>
        </span>
      </div>

      {/* Main Post Card */}
      <div className="card p-5 sm:p-7 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-5">
        {/* Left: Vote Controls */}
        <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-1 shrink-0 bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100 sm:w-14">
          <button
            type="button"
            onClick={() => voteThreadMutation.mutate(thread.upvoted ? 0 : 1)}
            className={`p-1.5 rounded-xl transition-all ${
              thread.upvoted
                ? 'text-orange-600 bg-orange-100/80 scale-105'
                : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
            }`}
            title="Upvote"
          >
            <ArrowBigUp className={`w-7 h-7 ${thread.upvoted ? 'fill-orange-600' : ''}`} />
          </button>

          <span
            className={`text-sm font-bold font-mono ${
              thread.upvoted
                ? 'text-orange-600'
                : thread.downvoted
                ? 'text-indigo-600'
                : 'text-gray-800'
            }`}
          >
            {thread.score ?? thread.upvoteScore ?? 0}
          </span>

          <button
            type="button"
            onClick={() => voteThreadMutation.mutate(thread.downvoted ? 0 : -1)}
            className={`p-1.5 rounded-xl transition-all ${
              thread.downvoted
                ? 'text-indigo-600 bg-indigo-100/80 scale-105'
                : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            title="Downvote"
          >
            <ArrowBigDown className={`w-7 h-7 ${thread.downvoted ? 'fill-indigo-600' : ''}`} />
          </button>
        </div>

        {/* Right: Content & OP Header */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header Row: Author info & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center overflow-hidden border border-primary-200">
                {thread.author?.profileImage?.url ? (
                  <img
                    src={thread.author.profileImage.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  thread.author?.fullName?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/users/${thread.author?._id}`}
                    className="text-sm font-bold text-gray-900 hover:text-primary-600"
                  >
                    {thread.author?.fullName}
                  </Link>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700">
                    OP
                  </span>
                  {thread.author?.role === 'technician' && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Technician
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>
                    Posted{' '}
                    {new Date(thread.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {thread.author?.city && (
                    <>
                      <span>•</span>
                      <span>{thread.author.city}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${typeInfo.color}`}
              >
                <TypeIcon className="w-3.5 h-3.5" />
                {typeInfo.label}
              </span>

              {isSolved && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Solved
                </span>
              )}

              {(isOP || isAdmin) && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this thread?')) {
                      deleteThreadMutation.mutate();
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Thread"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
            {thread.title}
          </h1>

          {/* Linked Item Banner (if linked) */}
          {thread.item && (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-primary-600 shrink-0" />
                <span>
                  Related Registered Item:{' '}
                  <strong className="text-gray-900">{thread.item.title}</strong>{' '}
                  ({thread.item.condition})
                </span>
              </div>
              <Link to="/items" className="text-primary-700 font-bold hover:underline shrink-0">
                View in Inventory →
              </Link>
            </div>
          )}

          {/* Body Content */}
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line pt-1">
            {thread.content}
          </div>

          {/* Attached Images */}
          {thread.images?.length > 0 && (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {thread.images.map((img, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 max-h-72"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {img.caption && (
                    <p className="p-2 text-xs text-gray-500 bg-white/90 border-t border-gray-100">
                      {img.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {thread.tags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {thread.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verified Solution Showcase Card (if Solved) */}
      {isSolved && thread.solvedComment && (
        <div className="p-5 rounded-3xl bg-emerald-50/70 border-2 border-emerald-300 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-200/80 px-3 py-1 rounded-full">
              <CheckCircle className="w-4 h-4 text-emerald-700" /> Verified Community Solution
            </span>
            <span className="text-xs text-emerald-700 font-semibold">
              Marked as Accepted by OP
            </span>
          </div>
          <p className="text-xs text-emerald-950/90 leading-relaxed italic line-clamp-3">
            "{thread.solvedComment.content}"
          </p>
        </div>
      )}

      {/* Write a Response (Facebook-style comment composer) */}
      <div className="card p-5 border border-gray-100 shadow-xs space-y-3 bg-gradient-to-br from-white to-blue-50/20">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Join the Discussion / Share Your Solution
        </h3>

        {/* Answer Type Selector */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: 'answer', label: '🛠️ Direct Solution' },
            { id: 'suggestion', label: '💡 Troubleshooting Tip' },
            { id: 'opinion', label: '💬 Opinion / Advice' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCommentType(t.id)}
              className={`px-3 py-1 rounded-xl font-semibold border transition-all ${
                commentType === t.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handlePostComment} className="space-y-3">
          <textarea
            rows={3}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder={
              isAuthenticated
                ? 'Provide diagnostic suggestions, mention test steps, or share repair experience...'
                : 'Log in to participate in the discussion and post an answer...'
            }
            disabled={!isAuthenticated || createCommentMutation.isPending}
            className="input w-full text-xs p-3 leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <input
              type="url"
              placeholder="Optional photo/schematic URL (https://...)"
              value={commentImageUrl}
              onChange={(e) => setCommentImageUrl(e.target.value)}
              disabled={!isAuthenticated}
              className="input text-xs sm:w-80"
            />

            <button
              type="submit"
              disabled={!isAuthenticated || createCommentMutation.isPending || !commentContent.trim()}
              className="btn-primary text-xs flex items-center justify-center gap-1.5 shadow-sm shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {createCommentMutation.isPending ? 'Posting...' : 'Post Response'}
            </button>
          </div>
        </form>
      </div>

      {/* Threaded Discussion Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>Answers & Community Suggestions</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-700">
              {comments.length}
            </span>
          </h2>
        </div>

        {commentsLoading ? (
          <PageLoader />
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No responses yet"
            description="Be the first technician or community member to help out with an answer or suggestion!"
          />
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isAccepted = comment.isAcceptedSolution;
              const isCommentAuthor = user && (user.userId === comment.author?._id || user._id === comment.author?._id);
              const canMarkSolution = (isOP || isAdmin) && !isAccepted;

              return (
                <div
                  key={comment._id}
                  className={`card p-4 sm:p-5 border transition-all ${
                    isAccepted
                      ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-300 shadow-xs'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {/* Top-Level Comment Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                        {comment.author?.profileImage?.url ? (
                          <img
                            src={comment.author.profileImage.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          comment.author?.fullName?.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/users/${comment.author?._id}`}
                            className="text-xs font-bold text-gray-900 hover:text-primary-600"
                          >
                            {comment.author?.fullName}
                          </Link>
                          {comment.author?.role === 'technician' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                              Technician
                            </span>
                          )}
                          {comment.author?._id === thread.author?._id && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-gray-100 text-gray-700">
                              OP
                            </span>
                          )}
                          {comment.type && comment.type !== 'comment' && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 capitalize">
                              {comment.type}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 block">
                          {new Date(comment.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Accepted Solution Pill */}
                    {isAccepted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Accepted Solution
                      </span>
                    )}
                  </div>

                  {/* Comment Body */}
                  <div className="mt-3 text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line pl-10">
                    {comment.content}
                  </div>

                  {/* Attached Images */}
                  {comment.images?.length > 0 && (
                    <div className="mt-2 pl-10">
                      <img
                        src={comment.images[0].url}
                        alt=""
                        className="max-h-48 rounded-xl border border-gray-200"
                      />
                    </div>
                  )}

                  {/* Action Bar (Like/Vote, Reply button, Mark Solution, Delete) */}
                  <div className="mt-3 pl-10 flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100/70">
                    {/* Comment Vote */}
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                      <button
                        type="button"
                        onClick={() =>
                          voteCommentMutation.mutate({
                            commentId: comment._id,
                            direction: comment.upvoted ? 0 : 1,
                          })
                        }
                        className={`p-0.5 rounded hover:text-orange-600 ${
                          comment.upvoted ? 'text-orange-600' : 'text-gray-400'
                        }`}
                        title="Upvote"
                      >
                        <ArrowBigUp className={`w-4 h-4 ${comment.upvoted ? 'fill-orange-600' : ''}`} />
                      </button>
                      <span className="font-mono font-bold text-xs">{comment.score ?? 0}</span>
                      <button
                        type="button"
                        onClick={() =>
                          voteCommentMutation.mutate({
                            commentId: comment._id,
                            direction: comment.downvoted ? 0 : -1,
                          })
                        }
                        className={`p-0.5 rounded hover:text-indigo-600 ${
                          comment.downvoted ? 'text-indigo-600' : 'text-gray-400'
                        }`}
                        title="Downvote"
                      >
                        <ArrowBigDown
                          className={`w-4 h-4 ${comment.downvoted ? 'fill-indigo-600' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Facebook-style Reply button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (replyingToCommentId === comment._id) {
                          setReplyingToCommentId(null);
                        } else {
                          setReplyingToCommentId(comment._id);
                          setReplyContent('');
                        }
                      }}
                      className="font-bold text-gray-600 hover:text-primary-600 flex items-center gap-1 transition-colors"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>

                    {/* OP Mark Solution Button */}
                    {canMarkSolution && (
                      <button
                        type="button"
                        onClick={() => solveMutation.mutate(comment._id)}
                        className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark as Accepted Solution</span>
                      </button>
                    )}

                    {/* Delete button */}
                    {(isCommentAuthor || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this comment?')) {
                            deleteCommentMutation.mutate(comment._id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 ml-auto"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Inline Reply Composer (Facebook-style) */}
                  {replyingToCommentId === comment._id && (
                    <div className="mt-3 pl-10 pt-3 border-t border-gray-100 animate-in fade-in duration-150">
                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder={`Reply to ${comment.author?.fullName}...`}
                          className="input flex-1 text-xs p-2.5"
                        />
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePostReply(comment._id)}
                            disabled={createReplyMutation.isPending || !replyContent.trim()}
                            className="btn-primary btn-sm text-xs px-3"
                          >
                            Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyingToCommentId(null)}
                            className="btn-ghost btn-sm text-xs px-3 text-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nested Direct Replies (Facebook-style comment tree) */}
                  {comment.replies?.length > 0 && (
                    <div className="mt-4 pl-8 sm:pl-10 space-y-3 border-l-2 border-gray-100 ml-5">
                      {comment.replies.map((reply) => {
                        const isReplyAuthor = user && (user.userId === reply.author?._id || user._id === reply.author?._id);
                        return (
                          <div
                            key={reply._id}
                            className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">
                                  {reply.author?.fullName}
                                </span>
                                {reply.author?.role === 'technician' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800">
                                    Tech
                                  </span>
                                )}
                                {reply.author?._id === thread.author?._id && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-gray-200 text-gray-700">
                                    OP
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {new Date(reply.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>

                            <p className="text-xs text-gray-800 leading-relaxed">{reply.content}</p>

                            <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                              <button
                                type="button"
                                onClick={() =>
                                  voteCommentMutation.mutate({
                                    commentId: reply._id,
                                    direction: reply.upvoted ? 0 : 1,
                                  })
                                }
                                className={`flex items-center gap-1 hover:text-orange-600 ${
                                  reply.upvoted ? 'text-orange-600 font-bold' : ''
                                }`}
                              >
                                <ArrowBigUp
                                  className={`w-3.5 h-3.5 ${reply.upvoted ? 'fill-orange-600' : ''}`}
                                />
                                <span>{reply.score ?? 0}</span>
                              </button>

                              {(isReplyAuthor || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('Delete reply?')) {
                                      deleteCommentMutation.mutate(reply._id);
                                    }
                                  }}
                                  className="text-gray-400 hover:text-red-600"
                                  title="Delete reply"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
