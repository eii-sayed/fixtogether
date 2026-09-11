import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState, Pagination } from '../../components/ui';
import ThreadCard from '../../components/forum/ThreadCard';
import { toast } from 'sonner';
import {
  Flame,
  Clock,
  Trophy,
  HelpCircle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Wrench,
  Sparkles,
  MessageSquare,
  Users,
  Award,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

export default function ForumPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const activeSort = searchParams.get('sort') || 'hot';
  const activeCategory = searchParams.get('category') || '';
  const activeType = searchParams.get('type') || '';
  const activeSearch = searchParams.get('search') || '';

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(activeSearch);

  // Fetch Categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 60000,
  });

  // Fetch Community Forum Stats
  const { data: statsData } = useQuery({
    queryKey: ['forum-stats'],
    queryFn: () => api.get('/threads/stats').then((r) => r.data.data),
    staleTime: 30000,
  });

  // Fetch Threads Feed
  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ['forum-threads', page, activeSort, activeCategory, activeType, activeSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page,
        limit: 10,
        sort: activeSort,
      });
      if (activeCategory) params.set('category', activeCategory);
      if (activeType) params.set('type', activeType);
      if (activeSearch) params.set('search', activeSearch);

      return api.get(`/threads?${params.toString()}`).then((r) => r.data.data);
    },
  });

  // Vote Mutation
  const voteMutation = useMutation({
    mutationFn: ({ threadId, direction }) =>
      api.post(`/threads/${threadId}/vote`, { direction }),
    onSuccess: (res, variables) => {
      queryClient.setQueryData(
        ['forum-threads', page, activeSort, activeCategory, activeType, activeSearch],
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            threads: oldData.threads.map((t) => {
              if (t._id === variables.threadId) {
                return {
                  ...t,
                  score: res.data.data.score,
                  upvoted: res.data.data.upvoted,
                  downvoted: res.data.data.downvoted,
                };
              }
              return t;
            }),
          };
        }
      );
    },
    onError: () => {
      if (!isAuthenticated) {
        toast.error('Please log in to vote on questions and answers');
      } else {
        toast.error('Failed to register vote');
      }
    },
  });

  const handleVote = (threadId, direction) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote on community threads');
      return;
    }
    voteMutation.mutate({ threadId, direction });
  };

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  const categories = categoriesData?.categories || [];
  const threads = threadsData?.threads || [];
  const stats = statsData || { totalThreads: 0, solvedThreads: 0, solvedPercentage: 0, topContributors: [] };

  const sortTabs = [
    { id: 'hot', label: 'Hot', icon: Flame, desc: 'Trending discussions' },
    { id: 'new', label: 'New', icon: Clock, desc: 'Latest queries' },
    { id: 'top', label: 'Top', icon: Trophy, desc: 'Most upvoted' },
    { id: 'unanswered', label: 'Unanswered', icon: HelpCircle, desc: 'Awaiting expert help' },
    { id: 'solved', label: 'Solved', icon: CheckCircle, desc: 'Proven solutions' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-blue-200" />
            <span>Open Community Knowledge Base</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Repair & Hardware Q&A Community
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Got an electronics glitch or appliance issue? Post a question, compare troubleshooting
            opinions, and receive verified answers from technicians and community makers.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/forum/new"
              className="btn bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Ask a Question / Post Query
            </Link>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Wrench className="w-64 h-64" />
        </div>
      </div>

      {/* Main Grid: Feed (Left) + Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Feed & Controls (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Navigation & Sort Bar (Reddit-style) */}
          <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Sort Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              {sortTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSort === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => updateParam('sort', tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200/60'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Post Type Selector */}
            <div className="flex items-center gap-2">
              <select
                value={activeType}
                onChange={(e) => updateParam('type', e.target.value)}
                className="input text-xs py-1.5 px-2.5 h-8 bg-gray-50 border-gray-200"
              >
                <option value="">All Post Types</option>
                <option value="question">Questions & Queries</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="discussion">Discussions</option>
                <option value="guide">DIY Guides</option>
                <option value="showcase">Repaired Showcases</option>
              </select>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search questions by symptom, model, error code..."
                className="input pl-10 text-xs w-full"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateParam('search', '');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </form>

            <select
              value={activeCategory}
              onChange={(e) => updateParam('category', e.target.value)}
              className="input text-xs sm:w-56 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Threads List Feed */}
          {threadsLoading ? (
            <PageLoader />
          ) : threads.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No Questions or Discussions Found"
              description="No community threads match your current filter criteria. Be the first to ask a question or start a discussion!"
              action={
                <Link to="/forum/new" className="btn-primary text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Ask a Question
                </Link>
              }
            />
          ) : (
            <div className="space-y-3.5">
              {threads.map((thread) => (
                <ThreadCard key={thread._id} thread={thread} onVote={handleVote} />
              ))}

              <Pagination pagination={threadsData?.pagination} onPageChange={setPage} />
            </div>
          )}
        </div>

        {/* Right Column: Community Stats & Sidebar (1 col) */}
        <div className="space-y-5">
          {/* Community Stats Widget */}
          <div className="card p-5 space-y-4 bg-gradient-to-br from-white to-gray-50/50 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Community Stats
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100/60 text-center">
                <p className="text-xl font-black text-blue-900">{stats.totalThreads || 0}</p>
                <p className="text-[11px] font-semibold text-blue-700 mt-0.5">Queries & Posts</p>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100/60 text-center">
                <p className="text-xl font-black text-emerald-900">{stats.solvedThreads || 0}</p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                  Verified Solved ({stats.solvedPercentage}%)
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Link
                to="/forum/new"
                className="btn-primary btn-sm text-xs w-full flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Post a Question
              </Link>
            </div>
          </div>

          {/* Top Helpful Contributors */}
          {stats.topContributors?.length > 0 && (
            <div className="card p-5 space-y-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Top Solvers
                </h3>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  Accepted
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {stats.topContributors.map((c, i) => (
                  <div key={c._id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-gray-100 font-mono text-[10px] flex items-center justify-center font-bold text-gray-500 shrink-0">
                        {i + 1}
                      </span>
                      <div className="truncate">
                        <Link
                          to={`/users/${c._id}`}
                          className="font-bold text-gray-800 hover:text-primary-600 truncate block"
                        >
                          {c.user?.fullName || 'Contributor'}
                        </Link>
                        <span className="text-[10px] text-gray-400 capitalize">
                          {c.user?.role}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                      {c.solutionsCount} solved
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DIY Safety Guidelines */}
          <div className="card p-5 space-y-3 bg-amber-50/50 border border-amber-200/60 text-amber-950">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Community Repair Rules
              </h4>
            </div>
            <ul className="space-y-2 text-xs text-amber-900/90 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span>•</span>
                <span>
                  <strong>High Voltage Caution:</strong> Always discharge microwave & power supply capacitors before servicing.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span>•</span>
                <span>
                  <strong>Provide Full Details:</strong> Include exact brand, model number, and photos for faster diagnosis.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span>•</span>
                <span>
                  <strong>Mark Solutions:</strong> When an opinion or answer fixes your issue, mark it as the <strong>Accepted Solution</strong> to help others!
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
