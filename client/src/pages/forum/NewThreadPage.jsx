import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  HelpCircle,
  Wrench,
  MessageCircle,
  BookOpen,
  Sparkles,
  Send,
  Package,
  Image,
  Tag,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

export default function NewThreadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [type, setType] = useState('question');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 60000,
  });

  // Fetch Registered Items for optional linking
  const { data: itemsData } = useQuery({
    queryKey: ['my-items-thread-link'],
    queryFn: () => api.get('/items?limit=50').then((r) => r.data.data),
  });

  const categories = categoriesData?.categories || [];
  const myItems = itemsData?.items || [];

  // Create Thread Mutation
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/threads', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['forum-threads']);
      queryClient.invalidateQueries(['forum-stats']);
      toast.success('Your thread has been published to the community!');
      navigate(`/forum/${res.data?.data?.thread?._id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create thread');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a clear title for your question or thread.');
      return;
    }
    if (!categoryId) {
      toast.error('Please choose a category.');
      return;
    }
    if (!content.trim()) {
      toast.error('Please describe your issue or query.');
      return;
    }

    const payload = {
      title: title.trim(),
      category: categoryId,
      type,
      content: content.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      images: imageUrl.trim() ? [{ url: imageUrl.trim() }] : [],
      item: selectedItemId || undefined,
    };

    createMutation.mutate(payload);
  };

  const types = [
    {
      id: 'question',
      label: 'Question / Query',
      icon: HelpCircle,
      desc: 'Ask for advice or diagnostic help with a specific hardware issue.',
    },
    {
      id: 'troubleshooting',
      label: 'Troubleshooting Advice',
      icon: Wrench,
      desc: 'Work through an ongoing repair with technicians.',
    },
    {
      id: 'discussion',
      label: 'General Discussion',
      icon: MessageCircle,
      desc: 'Share opinions on repairability, tools, and electronics.',
    },
    {
      id: 'guide',
      label: 'DIY Repair Guide',
      icon: BookOpen,
      desc: 'Share step-by-step instructions or safety protocols.',
    },
    {
      id: 'showcase',
      label: 'Repaired Showcase',
      icon: Sparkles,
      desc: 'Show off an item you successfully restored or saved.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/forum" className="hover:text-gray-900 flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Forum
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-bold">Ask Question / Start Thread</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Post Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="card p-6 sm:p-7 space-y-6 border border-gray-100 shadow-sm">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Create a Community Thread
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Post your query to receive opinions, suggestions, and verified repair answers from technicians.
              </p>
            </div>

            {/* Post Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Post Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {types.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p
                          className={`text-xs font-bold ${
                            isSelected ? 'text-blue-900' : 'text-gray-800'
                          }`}
                        >
                          {t.label}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="input text-xs w-full"
              >
                <option value="">-- Choose Relevant Category --</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Question or Thread Title <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400 font-mono">{title.length}/200</span>
              </div>
              <input
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Dell Inspiron 15 battery indicator flashes amber 4 times and won't charge"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input text-xs w-full"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Mention specific brand, model, and the primary symptom for faster answers.
              </p>
            </div>

            {/* Content Body */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Detailed Description & Symptoms <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={6}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Explain what happened, any sounds/smells, error codes, what tests you already tried, and what equipment/tools you have available..."
                className="input text-xs w-full p-3 leading-relaxed"
              />
            </div>

            {/* Attached Image URL */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Attach Photo / Circuit Diagram URL (Optional)
              </label>
              <div className="relative">
                <Image className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or image link"
                  className="input pl-9 text-xs w-full"
                />
              </div>

              {imageUrl.trim() && (
                <div className="mt-3 p-2 bg-gray-50 rounded-2xl border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Image Preview</p>
                  <img
                    src={imageUrl.trim()}
                    alt="Preview"
                    className="max-h-48 rounded-xl object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Optional Registered Item link */}
            {myItems.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Link From Your Registered Inventory (Optional)
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="">-- Do not link an item --</option>
                  {myItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.title} ({item.category?.name || 'Item'} • {item.condition})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. laptop, motherboard, charging, soldering"
                  className="input pl-9 text-xs w-full"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <Link to="/forum" className="btn-ghost text-xs text-gray-500">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary text-xs flex items-center gap-2 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {createMutation.isPending ? 'Publishing...' : 'Publish Question to Forum'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Tips for Fast Answers (1 col) */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4 bg-gradient-to-br from-white to-blue-50/40 border border-blue-100/70">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              How to Get Fast, Accurate Answers
            </h3>

            <ul className="space-y-3 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div>
                  <strong className="text-gray-900 block">State the Exact Model</strong>
                  Different revisions of the same brand have totally different internal boards and power stages.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div>
                  <strong className="text-gray-900 block">Detail What You Observed</strong>
                  Did you hear clicking? Did lights flash? Did anything smell hot or scorched?
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <div>
                  <strong className="text-gray-900 block">Share Clear Macro Photos</strong>
                  Technicians can often identify blown diodes, cracked solder, or swollen capacitors from photos.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <div>
                  <strong className="text-gray-900 block">Mark Verified Solution</strong>
                  Once fixed, mark the winning answer to thank the technician and build the community archive.
                </div>
              </li>
            </ul>
          </div>

          <div className="card p-5 space-y-2.5 bg-amber-50/60 border border-amber-200/70 text-amber-950">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Safety First
              </h4>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              If a repair involves live mains voltage, lithium battery swelling, or microwave capacitors,
              ask for certified technician guidance before opening enclosures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
