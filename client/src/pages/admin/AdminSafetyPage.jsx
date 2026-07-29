import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../api/axios';
import { PageLoader, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import { Shield, Plus, Edit2, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export default function AdminSafetyPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({ keywords: '', riskType: '', severity: 'high', warningMessage: '', blockAIAdvice: true });

  const { data, isLoading, error } = useQuery({
    queryKey: ['safety-rules'],
    queryFn: () => api.get('/admin/safety-rules').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/safety-rules', payload),
    onSuccess: () => { queryClient.invalidateQueries(['safety-rules']); toast.success('Rule created'); resetForm(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/admin/safety-rules/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries(['safety-rules']); toast.success('Rule updated'); resetForm(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/safety-rules/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['safety-rules']); toast.success('Rule deactivated'); },
  });

  const resetForm = () => { setShowForm(false); setEditingRule(null); setFormData({ keywords: '', riskType: '', severity: 'high', warningMessage: '', blockAIAdvice: true }); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean) };
    if (editingRule) updateMutation.mutate({ id: editingRule, ...payload });
    else createMutation.mutate(payload);
  };

  const startEdit = (rule) => {
    setEditingRule(rule._id);
    setFormData({ keywords: rule.keywords.join(', '), riskType: rule.riskType, severity: rule.severity, warningMessage: rule.warningMessage, blockAIAdvice: rule.blockAIAdvice });
    setShowForm(true);
  };

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const severityColors = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-yellow', critical: 'badge-red' };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Safety Rules</h1>
          <p className="text-sm text-gray-500 mt-1">Manage keyword-based safety rules for repair requests</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary"><Plus className="w-4 h-4" /> Add Rule</button>
      </div>

      {showForm && (
        <div className="card card-body mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editingRule ? 'Edit Rule' : 'New Safety Rule'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Risk Type</label>
                <input value={formData.riskType} onChange={(e) => setFormData(p => ({ ...p, riskType: e.target.value }))}
                  className="input" placeholder="e.g., electrical, fire, battery" required />
              </div>
              <div>
                <label className="label">Severity</label>
                <select value={formData.severity} onChange={(e) => setFormData(p => ({ ...p, severity: e.target.value }))} className="input">
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Keywords (comma-separated)</label>
              <input value={formData.keywords} onChange={(e) => setFormData(p => ({ ...p, keywords: e.target.value }))}
                className="input" placeholder="spark, sparking, electric shock" required />
            </div>
            <div>
              <label className="label">Warning Message</label>
              <textarea value={formData.warningMessage} onChange={(e) => setFormData(p => ({ ...p, warningMessage: e.target.value }))}
                className="input resize-y" rows={2} required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formData.blockAIAdvice} onChange={(e) => setFormData(p => ({ ...p, blockAIAdvice: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600" />
              Block AI advice when triggered
            </label>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">{editingRule ? 'Update' : 'Create'}</button>
              <button type="button" onClick={resetForm} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {data?.rules?.map((rule) => (
          <div key={rule._id} className={`card card-body ${!rule.active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-danger-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 capitalize">{rule.riskType}</h3>
                    <span className={severityColors[rule.severity]}>{rule.severity}</span>
                    {rule.blockAIAdvice && <span className="badge-red">Blocks AI</span>}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{rule.warningMessage}</p>
                  <div className="flex flex-wrap gap-1">
                    {rule.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{kw}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(rule)} className="btn-ghost btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteMutation.mutate(rule._id)} className="btn-ghost btn-sm text-danger-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
