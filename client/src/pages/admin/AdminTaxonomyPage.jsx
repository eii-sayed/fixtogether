import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui';
import {
  Cog,
  Plus,
  Edit2,
  Trash2,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Wrench,
  Search,
  XCircle,
} from 'lucide-react';

export default function AdminTaxonomyPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'skills'
  const [search, setSearch] = useState('');

  // Category Modal State
  const [categoryModal, setCategoryModal] = useState(null); // null | {}
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catRiskLevel, setCatRiskLevel] = useState('low');
  const [catProhibitedAI, setCatProhibitedAI] = useState('');

  // Skill Merge Modal State
  const [mergeModal, setMergeModal] = useState(null); // sourceSkill
  const [targetSkillId, setTargetSkillId] = useState('');
  const [mergeImpact, setMergeImpact] = useState(null);

  // Skill Create/Edit Modal State
  const [skillModal, setSkillModal] = useState(null);
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [skillReq, setSkillReq] = useState('none');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Categories
  const { data: catData, isLoading: isCatLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories?active=true').then((r) => r.data.data?.categories || []),
  });

  // 2. Fetch Skills
  const { data: skillsData, isLoading: isSkillsLoading } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: () => api.get('/skills?active=true').then((r) => r.data.data?.skills || []),
  });

  const categories = catData || [];
  const skills = skillsData || [];

  // Category Mutations
  const createCatMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/categories', payload),
    onSuccess: () => {
      setCategoryModal(null);
      queryClient.invalidateQueries(['admin-categories']);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to save category.'),
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/admin/categories/${id}`, payload),
    onSuccess: () => {
      setCategoryModal(null);
      queryClient.invalidateQueries(['admin-categories']);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to update category.'),
  });

  // Skill Mutations
  const createSkillMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/skills', payload),
    onSuccess: () => {
      setSkillModal(null);
      queryClient.invalidateQueries(['admin-skills']);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to save skill.'),
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/admin/skills/${id}`, payload),
    onSuccess: () => {
      setSkillModal(null);
      queryClient.invalidateQueries(['admin-skills']);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to update skill.'),
  });

  const mergeSkillMutation = useMutation({
    mutationFn: ({ sourceSkillId, targetSkillId }) =>
      api.post('/admin/skills/merge', { sourceSkillId, targetSkillId }),
    onSuccess: () => {
      setMergeModal(null);
      setMergeImpact(null);
      queryClient.invalidateQueries(['admin-skills']);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to merge skill.'),
  });

  const handleOpenCategoryEdit = (cat) => {
    if (cat) {
      setCategoryModal(cat);
      setCatName(cat.name || '');
      setCatDescription(cat.description || '');
      setCatRiskLevel(cat.riskLevel || 'low');
      setCatProhibitedAI((cat.prohibitedAIAdvice || []).join(', '));
    } else {
      setCategoryModal({});
      setCatName('');
      setCatDescription('');
      setCatRiskLevel('low');
      setCatProhibitedAI('');
    }
  };

  const handleOpenSkillEdit = (sk) => {
    if (sk) {
      setSkillModal(sk);
      setSkillName(sk.name || '');
      setSkillDesc(sk.description || '');
      setSkillCategory(sk.category?._id || sk.category || '');
      setSkillReq(sk.verificationRequirement || 'none');
    } else {
      setSkillModal({});
      setSkillName('');
      setSkillDesc('');
      setSkillCategory('');
      setSkillReq('none');
    }
  };

  const handleOpenMerge = async (sk) => {
    setMergeModal(sk);
    setTargetSkillId('');
    try {
      const res = await api.get(`/admin/taxonomy/impact/skill/${sk._id}`);
      setMergeImpact(res.data.data?.impact);
    } catch {
      setMergeImpact(null);
    }
  };

  if (isCatLoading || isSkillsLoading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Categories & Skills Taxonomy Governance
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Taxonomy Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage device classifications, risk profiles, technician skill mappings, and execute safe synonym mergers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'categories' ? (
            <button
              onClick={() => handleOpenCategoryEdit(null)}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          ) : (
            <button
              onClick={() => handleOpenSkillEdit(null)}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Skill
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" /> Item Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'skills'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Wrench className="w-4 h-4" /> Technician Skills ({skills.length})
        </button>
      </div>

      {/* TAB 1: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat._id} className="card p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      cat.riskLevel === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : cat.riskLevel === 'high'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {cat.riskLevel} Risk
                  </span>
                  <button
                    onClick={() => handleOpenCategoryEdit(cat)}
                    className="text-gray-400 hover:text-primary-600 p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {cat.description || 'General electronics category classification.'}
                </p>

                {cat.prohibitedAIAdvice?.length > 0 && (
                  <div className="p-2 bg-amber-50 rounded-lg text-[11px] text-amber-800 space-y-0.5">
                    <span className="font-bold">Prohibited AI Guidance:</span>
                    <p className="line-clamp-1">{cat.prohibitedAIAdvice.join(', ')}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Slug: {cat.slug}</span>
                <span className="text-emerald-600 font-semibold">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SKILLS */}
      {activeTab === 'skills' && (
        <div className="card">
          <div className="divide-y divide-gray-100">
            {skills.map((sk) => (
              <div
                key={sk._id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{sk.name}</h3>
                    {sk.verificationRequirement !== 'none' && (
                      <span className="badge-gray text-[10px] uppercase font-bold text-amber-700 bg-amber-50">
                        {sk.verificationRequirement?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {sk.description || 'Specialized repair competency'} • Category:{' '}
                    {sk.category?.name || 'All'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenMerge(sk)}
                    className="btn-outline py-1 px-2.5 text-xs flex items-center gap-1"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-purple-600" /> Merge
                  </button>
                  <button
                    onClick={() => handleOpenSkillEdit(sk)}
                    className="btn-secondary py-1 px-2.5 text-xs"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Edit/Create Modal */}
      {categoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              {categoryModal._id ? 'Edit Category' : 'Create Category'}
            </h3>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Smart Watches & Wearables"
                className="input text-xs w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Risk Level</label>
              <select
                value={catRiskLevel}
                onChange={(e) => setCatRiskLevel(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk (High Voltage / Lithium Battery)</option>
                <option value="critical">Critical Risk</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Description</label>
              <textarea
                rows={2}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Category scope and hardware types..."
                className="input text-xs w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Prohibited AI Guidance Terms (comma-separated)
              </label>
              <input
                type="text"
                value={catProhibitedAI}
                onChange={(e) => setCatProhibitedAI(e.target.value)}
                placeholder="open battery pack, solder capacitor without discharge"
                className="input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setCategoryModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() => {
                  const prohibitedArr = catProhibitedAI
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const payload = {
                    name: catName,
                    description: catDescription,
                    riskLevel: catRiskLevel,
                    prohibitedAIAdvice: prohibitedArr,
                  };
                  if (categoryModal._id) {
                    updateCatMutation.mutate({ id: categoryModal._id, payload });
                  } else {
                    createCatMutation.mutate(payload);
                  }
                }}
                disabled={!catName.trim()}
                className="btn-primary text-xs"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Merge Impact Modal */}
      {mergeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <GitMerge className="w-5 h-5 text-purple-600" /> Merge Skill Synonym
            </h3>
            <p className="text-xs text-gray-600">
              Merge <strong>"{mergeModal.name}"</strong> into a canonical target skill. All technician profiles referencing this skill will be migrated automatically.
            </p>

            {mergeImpact && (
              <div className="bg-purple-50 p-3 rounded-xl text-xs text-purple-900 space-y-1">
                <span className="font-bold">Estimated Migration Impact:</span>
                <p>• {mergeImpact.affectedTechnicians || 0} active technician profiles will be updated.</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Canonical Target Skill <span className="text-red-500">*</span>
              </label>
              <select
                value={targetSkillId}
                onChange={(e) => setTargetSkillId(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="">Select target canonical skill...</option>
                {skills
                  .filter((s) => s._id !== mergeModal._id)
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.category?.name || 'General'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setMergeModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  mergeSkillMutation.mutate({
                    sourceSkillId: mergeModal._id,
                    targetSkillId,
                  })
                }
                disabled={!targetSkillId || mergeSkillMutation.isPending}
                className="btn-primary text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                Confirm Migration & Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Create/Edit Modal */}
      {skillModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">
              {skillModal._id ? 'Edit Skill' : 'Create Skill'}
            </h3>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Skill Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. Micro-soldering SMD components"
                className="input text-xs w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Category</label>
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="">General (All Categories)</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Verification Requirement
              </label>
              <select
                value={skillReq}
                onChange={(e) => setSkillReq(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="none">No Specific License Required</option>
                <option value="license_required">Government License Required</option>
                <option value="certification_required">Manufacturer / OEM Certification Required</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setSkillModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() => {
                  const payload = {
                    name: skillName,
                    description: skillDesc,
                    category: skillCategory || null,
                    verificationRequirement: skillReq,
                  };
                  if (skillModal._id) {
                    updateSkillMutation.mutate({ id: skillModal._id, payload });
                  } else {
                    createSkillMutation.mutate(payload);
                  }
                }}
                disabled={!skillName.trim() || createSkillMutation.isPending || updateSkillMutation.isPending}
                className="btn-primary text-xs"
              >
                Save Skill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
