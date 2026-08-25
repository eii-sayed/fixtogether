import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Search,
  Wrench,
  Package,
  Heart,
  User,
  XCircle,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search query execution
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = [];

        // Role-filtered search targets
        if (user?.role === 'technician') {
          // Technicians search published repair requests
          const reqRes = await api.get(`/repair-requests?search=${encodeURIComponent(query)}&limit=5`);
          (reqRes.data?.data?.requests || []).forEach((r) => {
            found.push({
              id: r._id,
              type: 'request',
              title: r.title || r.item?.title,
              subtitle: `Category: ${r.item?.category?.name || 'General'} • Budget: ৳${r.budget || 0}`,
              link: `/requests/${r._id}`,
              icon: Wrench,
            });
          });
        } else if (user?.role === 'organization') {
          // Organizations search donation offers & community needs
          const donRes = await api.get(`/donations/offers?search=${encodeURIComponent(query)}&limit=5`);
          (donRes.data?.data?.offers || []).forEach((d) => {
            found.push({
              id: d._id,
              type: 'donation',
              title: d.title || d.item?.title,
              subtitle: `Condition: ${d.itemCondition} • Handover: ${d.preferredHandover}`,
              link: `/donations?tab=offers&offerId=${d._id}`,
              icon: Heart,
            });
          });
        } else {
          // Owners & public search available technicians and their own items
          const techRes = await api.get(`/technicians?search=${encodeURIComponent(query)}&limit=4`);
          (techRes.data?.data?.technicians || []).forEach((t) => {
            found.push({
              id: t.userId || t._id,
              type: 'technician',
              title: t.fullName || 'Technician',
              subtitle: `Rating: ${t.averageRating || 5.0}★ • Experience: ${t.yearsOfExperience || 1} yrs`,
              link: `/technicians/${t.userId || t._id}`,
              icon: User,
            });
          });

          const reqRes = await api.get(`/repair-requests?search=${encodeURIComponent(query)}&limit=4`);
          (reqRes.data?.data?.requests || []).forEach((r) => {
            found.push({
              id: r._id,
              type: 'request',
              title: r.title || r.item?.title,
              subtitle: `Status: ${r.status}`,
              link: `/requests/${r._id}`,
              icon: Wrench,
            });
          });
        }

        setResults(found);
      } catch (err) {
        // Suppress search query errors
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user?.role]);

  if (!isOpen) return null;

  const handleSelect = (link) => {
    onClose();
    navigate(link);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Type to search requests, technicians, donations..."
            className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-hidden bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[10px] font-mono text-gray-400 hover:text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-gray-50">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              Searching platform records...
            </div>
          ) : results.length > 0 ? (
            results.map((item) => {
              const Icon = item.icon || Wrench;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item.link)}
                  className="w-full text-left p-3 rounded-xl hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate group-hover:text-primary-600">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })
          ) : query.trim().length >= 2 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No matching records found for "{query}".
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400 space-y-1">
              <Sparkles className="w-5 h-5 text-gray-300 mx-auto" />
              <p>Quick jump to requests, verified technicians, or community donations.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
          <span>Role context: <strong className="capitalize">{user?.role || 'Guest'}</strong></span>
          <span className="flex items-center gap-1">
            Press <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">Ctrl+K</kbd> to open anytime
          </span>
        </div>
      </div>
    </div>
  );
}
