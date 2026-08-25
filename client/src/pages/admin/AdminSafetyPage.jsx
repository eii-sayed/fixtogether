import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileCode,
  Layers,
  History,
  Eye,
} from 'lucide-react';

export default function AdminSafetyPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'flagged'

  // Safety Rule Editor State
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    patternType: 'keyword',
    regexPattern: '',
    keywords: '',
    riskType: '',
    severity: 'high',
    warningMessage: '',
    technicianWarningMessage: '',
    blockAIAdvice: true,
    changeReason: '',
  });

  // Simulator / Test Sandbox State
  const [simRule, setSimRule] = useState(null);
  const [simInput, setSimInput] = useState('');
  const [simResult, setSimResult] = useState(null);

  // Version History Modal State
  const [historyModalRule, setHistoryModalRule] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Safety Rules
  const { data: rulesData, isLoading: isRulesLoading, error: rulesError } = useQuery({
    queryKey: ['admin-safety-rules'],
    queryFn: () => api.get('/admin/safety-rules').then((r) => r.data.data),
  });

  // 2. Fetch Flagged Listings
  const { data: flaggedData, isLoading: isFlaggedLoading } = useQuery({
    queryKey: ['admin-flagged-listings'],
    queryFn: () => api.get('/admin/flagged-listings').then((r) => r.data.data),
    enabled: activeTab === 'flagged',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/safety-rules', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-safety-rules']);
      toast.success('Safety rule created');
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Creation failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/admin/safety-rules/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-safety-rules']);
      toast.success('Safety rule updated');
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/safety-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-safety-rules']);
      toast.success('Rule deactivated');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ id, targetVersion, reason }) =>
      api.post(`/admin/safety-rules/${id}/rollback`, { targetVersion, reason }),
    onSuccess: (res) => {
      setHistoryModalRule(null);
      queryClient.invalidateQueries(['admin-safety-rules']);
      toast.success(res.data?.message || 'Rule rolled back successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Rollback failed'),
  });

  const flagActionMutation = useMutation({
    mutationFn: ({ id, action, reason }) =>
      api.patch(`/admin/flagged-listings/${id}`, { action, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-flagged-listings']);
      toast.success('Flagged listing updated');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({
      name: '',
      patternType: 'keyword',
      regexPattern: '',
      keywords: '',
      riskType: '',
      severity: 'high',
      warningMessage: '',
      technicianWarningMessage: '',
      blockAIAdvice: true,
      changeReason: '',
    });
  };

  const startEdit = (rule) => {
    setEditingRule(rule._id);
    setFormData({
      name: rule.name || '',
      patternType: rule.patternType || 'keyword',
      regexPattern: rule.regexPattern || '',
      keywords: (rule.keywords || []).join(', '),
      riskType: rule.riskType || '',
      severity: rule.severity || 'high',
      warningMessage: rule.warningMessage || '',
      technicianWarningMessage: rule.technicianWarningMessage || '',
      blockAIAdvice: rule.blockAIAdvice !== false,
      changeReason: '',
    });
    setShowForm(true);
  };

  const handleTestSimulator = () => {
    if (!simRule || !simInput) return;
    const start = performance.now();
    let matched = false;
    try {
      if (simRule.patternType === 'regex' && simRule.regexPattern) {
        const reg = new RegExp(simRule.regexPattern, 'i');
        matched = reg.test(simInput);
      } else {
        matched = (simRule.keywords || []).some((kw) =>
          simInput.toLowerCase().includes(kw.toLowerCase())
        );
      }
      const elapsed = (performance.now() - start).toFixed(2);
      setSimResult({ matched, elapsed });
    } catch (err) {
      setSimResult({ error: err.message });
    }
  };

  if (isRulesLoading) return <PageLoader />;
  if (rulesError) return <ErrorState error={rulesError} />;

  const rules = rulesData?.rules || [];
  const listings = flaggedData?.listings || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Safety Governance & Pattern Engine
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              Deterministic Safety
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Maintain strict deterministic keywords & regex rules (always supersedes AI) and moderate flagged listings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'rules' && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Safety Rule
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Shield className="w-4 h-4" /> Active Safety Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'flagged'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Flagged Listings ({listings.length})
        </button>
      </div>

      {/* TAB 1: SAFETY RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {showForm && (
            <div className="card p-6 space-y-4 border-2 border-primary-500/30">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-sm text-gray-900">
                  {editingRule ? 'Edit Safety Rule' : 'Author New Deterministic Safety Rule'}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const payload = {
                    ...formData,
                    keywords: formData.keywords
                      .split(',')
                      .map((k) => k.trim())
                      .filter(Boolean),
                  };
                  if (editingRule) updateMutation.mutate({ id: editingRule, ...payload });
                  else createMutation.mutate(payload);
                }}
                className="space-y-4"
              >
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Rule Name / Title
                    </label>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="input text-xs w-full"
                      placeholder="e.g. Swollen Lithium Battery Warning"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Risk Category
                    </label>
                    <input
                      value={formData.riskType}
                      onChange={(e) => setFormData((p) => ({ ...p, riskType: e.target.value }))}
                      className="input text-xs w-full"
                      placeholder="battery, high_voltage, fire..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Severity Level
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData((p) => ({ ...p, severity: e.target.value }))}
                      className="input text-xs w-full"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical (Immediate AI block)</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Pattern Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, patternType: 'keyword' }))}
                        className={`btn-sm flex-1 text-xs font-bold ${
                          formData.patternType === 'keyword'
                            ? 'bg-primary-600 text-white'
                            : 'btn-outline'
                        }`}
                      >
                        Keyword List
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, patternType: 'regex' }))}
                        className={`btn-sm flex-1 text-xs font-bold ${
                          formData.patternType === 'regex'
                            ? 'bg-primary-600 text-white'
                            : 'btn-outline'
                        }`}
                      >
                        Safe Regex Expression
                      </button>
                    </div>
                  </div>

                  <div>
                    {formData.patternType === 'regex' ? (
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Regex Expression (flags 'i' applied automatically)
                        </label>
                        <input
                          value={formData.regexPattern}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, regexPattern: e.target.value }))
                          }
                          className="input font-mono text-xs w-full"
                          placeholder="swoll(en|ing)\s*(battery|cell)"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Keywords (comma-separated)
                        </label>
                        <input
                          value={formData.keywords}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, keywords: e.target.value }))
                          }
                          className="input text-xs w-full"
                          placeholder="spark, electric shock, smoking battery"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Owner Safety Advisory Message
                  </label>
                  <textarea
                    value={formData.warningMessage}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, warningMessage: e.target.value }))
                    }
                    className="input text-xs w-full resize-y"
                    rows={2}
                    placeholder="Hazard Warning: Do not attempt to charge or pierce the battery..."
                    required
                  />
                </div>

                {editingRule && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Change Reason (Audit Version Log)
                    </label>
                    <input
                      value={formData.changeReason}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, changeReason: e.target.value }))
                      }
                      className="input text-xs w-full"
                      placeholder="Refined regex pattern to reduce false positive matches..."
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.blockAIAdvice}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, blockAIAdvice: e.target.checked }))
                      }
                      className="rounded text-primary-600"
                    />
                    Block AI DIY Advice when triggered
                  </label>

                  <div className="flex gap-2">
                    <button type="button" onClick={resetForm} className="btn-secondary text-xs">
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary text-xs">
                      {editingRule ? 'Update & Snapshot Version' : 'Activate Rule'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Rules List */}
          <div className="grid sm:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule._id}
                className="card p-5 space-y-3 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          rule.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : rule.severity === 'high'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {rule.severity}
                      </span>
                      <span className="badge-gray text-[10px] font-mono">
                        v{rule.version || 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSimRule(rule);
                          setSimInput('');
                          setSimResult(null);
                        }}
                        className="btn-ghost p-1 text-gray-400 hover:text-primary-600"
                        title="Test Simulator"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setHistoryModalRule(rule)}
                        className="btn-ghost p-1 text-gray-400 hover:text-purple-600"
                        title="Version History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startEdit(rule)}
                        className="btn-ghost p-1 text-gray-400 hover:text-blue-600"
                        title="Edit Rule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(rule._id)}
                        className="btn-ghost p-1 text-gray-400 hover:text-red-600"
                        title="Deactivate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900">
                    {rule.name || `Safety Rule: ${rule.riskType}`}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2">{rule.warningMessage}</p>

                  {rule.patternType === 'regex' ? (
                    <div className="p-2 bg-gray-50 rounded-lg text-xs font-mono text-purple-700 truncate">
                      Regex: /{rule.regexPattern}/i
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(rule.keywords || []).map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-700">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Type: {rule.riskType}</span>
                  {rule.blockAIAdvice && (
                    <span className="text-red-600 font-semibold">Deterministic Block Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: FLAGGED LISTINGS */}
      {activeTab === 'flagged' && (
        <div className="space-y-3">
          {listings.length > 0 ? (
            listings.map((l) => (
              <div
                key={l._id}
                className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700">
                      Flagged Hazard
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {l.item?.title || 'Repair Request'}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{l.problemDescription}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 pt-1">
                    <span>Owner: {l.owner?.fullName || 'User'}</span>
                    <span>•</span>
                    <span className="text-red-600 font-semibold">
                      Triggers: {l.safetyFlags?.map((f) => f.type).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      flagActionMutation.mutate({
                        id: l._id,
                        action: 'dismiss',
                        reason: 'Verified safe by lead administrator',
                      })
                    }
                    className="btn-outline py-1.5 px-3 text-xs"
                  >
                    Dismiss False Positive
                  </button>
                  <button
                    onClick={() =>
                      flagActionMutation.mutate({
                        id: l._id,
                        action: 'cancel',
                        reason: 'Severe hazard to safety',
                      })
                    }
                    className="btn-danger py-1.5 px-3 text-xs"
                  >
                    Cancel Listing
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No Flagged Listings"
              description="No active repair requests have unresolved critical safety flags."
              icon={CheckCircle2}
            />
          )}
        </div>
      )}

      {/* Simulator Modal */}
      {simRule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Play className="w-4 h-4 text-primary-600" /> Pattern Testing Simulator
              </h3>
              <button onClick={() => setSimRule(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Rule: <strong>{simRule.name || simRule.riskType}</strong>
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Test Input String
              </label>
              <textarea
                rows={3}
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="Type sample device description with suspected keywords..."
                className="input text-xs w-full"
              />
            </div>

            <button
              onClick={handleTestSimulator}
              disabled={!simInput.trim()}
              className="btn-primary w-full py-2 text-xs font-semibold"
            >
              Run Benchmark Test
            </button>

            {simResult && (
              <div
                className={`p-3 rounded-xl text-xs space-y-1 ${
                  simResult.matched
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Result: {simResult.matched ? 'MATCH TRIGGERED' : 'NO MATCH'}</span>
                  <span className="font-mono text-[10px]">{simResult.elapsed}ms</span>
                </div>
                <p className="text-[11px]">
                  {simResult.matched
                    ? 'Safety warning will display and block self-repair instructions.'
                    : 'Listing will proceed to standard technician review.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyModalRule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-600" /> Version History & Rollback
              </h3>
              <button
                onClick={() => setHistoryModalRule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-gray-100">
              {(historyModalRule.versionHistory || []).map((vh, i) => (
                <div key={i} className="pt-2 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-800">Version {vh.version}</span>
                    <p className="text-[11px] text-gray-500">{vh.changeReason || 'Update'}</p>
                    <span className="text-[10px] text-gray-400">
                      {new Date(vh.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {vh.version !== historyModalRule.version && (
                    <button
                      onClick={() =>
                        rollbackMutation.mutate({
                          id: historyModalRule._id,
                          targetVersion: vh.version,
                          reason: 'Reverted via Version History Dialog',
                        })
                      }
                      className="btn-outline py-1 px-2 text-[11px] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3 text-purple-600" /> Revert
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
