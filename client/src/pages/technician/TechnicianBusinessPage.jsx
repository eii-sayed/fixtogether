import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3, ClipboardList, Plus, ReceiptText, Trash2, Users, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';
import { ErrorState, PageLoader } from '../../components/ui';

const initialTemplate = {
  name: '', description: '', estimatedDurationMinutes: 60, laborCost: 0,
  partsAllowance: 0, warrantyDays: 0, checklist: '',
};

const money = (value, currency = 'BDT') => new Intl.NumberFormat('en-BD', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(value || 0);

export default function TechnicianBusinessPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialTemplate);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const { data: earningsData, isLoading: earningsLoading, error: earningsError } = useQuery({
    queryKey: ['technician-earnings', '30d'],
    queryFn: () => api.get('/technicians/me/earnings?period=30d').then((response) => response.data.data),
  });
  const { data: customersData } = useQuery({
    queryKey: ['technician-customers'],
    queryFn: () => api.get('/technicians/me/customers?limit=8').then((response) => response.data.data),
  });
  const { data: templatesData } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => api.get('/technicians/me/service-templates?limit=30').then((response) => response.data.data),
  });
  const { data: invoicesData } = useQuery({
    queryKey: ['technician-invoices'],
    queryFn: () => api.get('/technicians/me/invoices?limit=8').then((response) => response.data.data),
  });

  const createTemplate = useMutation({
    mutationFn: (payload) => api.post('/technicians/me/service-templates', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      setForm(initialTemplate);
      setShowTemplateForm(false);
      toast.success('Service template saved');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not save service template'),
  });
  const deleteTemplate = useMutation({
    mutationFn: (id) => api.delete(`/technicians/me/service-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-templates'] }),
    onError: () => toast.error('Could not delete service template'),
  });

  if (earningsLoading) return <PageLoader />;
  if (earningsError) return <ErrorState error={earningsError} />;

  const earnings = earningsData?.summary || {};
  const templates = templatesData?.templates || [];
  const customers = customersData?.customers || [];
  const invoices = invoicesData?.invoices || [];

  const submitTemplate = (event) => {
    event.preventDefault();
    createTemplate.mutate({
      ...form,
      estimatedDurationMinutes: Number(form.estimatedDurationMinutes),
      laborCost: Number(form.laborCost),
      partsAllowance: Number(form.partsAllowance),
      warrantyDays: Number(form.warrantyDays),
      checklist: form.checklist.split('\n').map((item) => item.trim()).filter(Boolean),
    });
  };

  return (
    <div className="page-container max-w-6xl space-y-6 py-6">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business workspace</h1>
          <p className="text-sm text-gray-500">Track verified payments, repeat customers, invoices, and reusable services.</p>
        </div>
        <Link to="/repair-jobs" className="btn-secondary text-sm inline-flex items-center justify-center gap-2">
          <Wrench className="w-4 h-4" /> Open repair jobs
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="30-day net earnings" value={money(earnings.netEarnings, earnings.currency)} icon={BarChart3} />
        <Metric label="Payments confirmed" value={earnings.paymentCount || 0} icon={ReceiptText} />
        <Metric label="Refunds" value={money(earnings.refunds, earnings.currency)} icon={ReceiptText} />
        <Metric label="Customers served" value={earnings.uniqueCustomers || 0} icon={Users} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Saved service templates</h2>
              <p className="text-xs text-gray-500 mt-0.5">Use consistent scope and pricing while preparing quotations.</p>
            </div>
            <button type="button" onClick={() => setShowTemplateForm((value) => !value)} className="btn-primary text-xs inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New template
            </button>
          </div>
          {showTemplateForm && (
            <form onSubmit={submitTemplate} className="p-4 bg-gray-50 border-b border-gray-100 grid sm:grid-cols-2 gap-3">
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Service name" className="input sm:col-span-2" />
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Standard scope" className="input sm:col-span-2 min-h-16" />
              <input type="number" min="15" value={form.estimatedDurationMinutes} onChange={(event) => setForm({ ...form, estimatedDurationMinutes: event.target.value })} placeholder="Minutes" className="input" />
              <input type="number" min="0" value={form.laborCost} onChange={(event) => setForm({ ...form, laborCost: event.target.value })} placeholder="Labor cost" className="input" />
              <input type="number" min="0" value={form.partsAllowance} onChange={(event) => setForm({ ...form, partsAllowance: event.target.value })} placeholder="Parts allowance" className="input" />
              <input type="number" min="0" value={form.warrantyDays} onChange={(event) => setForm({ ...form, warrantyDays: event.target.value })} placeholder="Warranty days" className="input" />
              <textarea value={form.checklist} onChange={(event) => setForm({ ...form, checklist: event.target.value })} placeholder="Checklist (one line per item)" className="input sm:col-span-2 min-h-16" />
              <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setShowTemplateForm(false)} className="btn-secondary text-xs">Cancel</button><button disabled={createTemplate.isPending} className="btn-primary text-xs">Save template</button></div>
            </form>
          )}
          <div className="divide-y divide-gray-100">
            {templates.length ? templates.map((template) => (
              <div key={template._id} className="p-4 flex gap-3 justify-between">
                <div><p className="text-sm font-semibold text-gray-900">{template.name}</p><p className="text-xs text-gray-500 mt-1">{template.estimatedDurationMinutes} min · {money(template.laborCost + template.partsAllowance)} · {template.warrantyDays} day warranty</p></div>
                <button type="button" aria-label={`Delete ${template.name}`} onClick={() => deleteTemplate.mutate(template._id)} className="text-red-600 hover:bg-red-50 rounded-lg p-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            )) : <Empty text="No saved templates yet." />}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-bold text-gray-900 text-sm">Customer history</h2><p className="text-xs text-gray-500 mt-0.5">Only customers from your own assigned repair jobs are shown.</p></div>
          <div className="divide-y divide-gray-100">
            {customers.length ? customers.map((entry) => <div key={entry._id} className="p-4 flex justify-between gap-3"><div><p className="text-sm font-semibold text-gray-900">{entry.customer?.fullName || 'Customer'}</p><p className="text-xs text-gray-500 mt-1">{entry.totalJobs} job{entry.totalJobs === 1 ? '' : 's'} · {entry.completedJobs} completed · last status: {entry.lastJobStatus.replaceAll('_', ' ')}</p></div><p className="text-xs font-bold text-emerald-700 whitespace-nowrap">{money(entry.lifetimeValue)}</p></div>) : <Empty text="Customer history will appear after you accept repair jobs." />}
          </div>
        </section>

        <section className="card overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-gray-100"><h2 className="font-bold text-gray-900 text-sm">Recent invoices</h2><p className="text-xs text-gray-500 mt-0.5">Invoices are generated from final repair costs and confirmed payment records in a repair job.</p></div>
          <div className="divide-y divide-gray-100">
            {invoices.length ? invoices.map((invoice) => <div key={invoice._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><p className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber} · {invoice.owner?.fullName || 'Customer'}</p><p className="text-xs text-gray-500 mt-1">{invoice.repairJob?.repairRequest?.item?.title || 'Repair job'} · issued {new Date(invoice.issuedAt).toLocaleDateString()}</p></div><div className="text-sm font-bold text-gray-900">{money(invoice.subtotal, invoice.currency)} <span className="text-xs text-gray-500 font-medium">due {money(invoice.balanceDue, invoice.currency)}</span></div></div>) : <Empty text="Generate an invoice from a repair job after finalizing its costs." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }) {
  return <div className="card p-4"><Icon className="w-4 h-4 text-primary-600" /><p className="text-xs text-gray-500 mt-3">{label}</p><p className="text-lg font-bold text-gray-900 mt-1">{value}</p></div>;
}

function Empty({ text }) {
  return <div className="p-8 text-center text-xs text-gray-500"><ClipboardList className="w-5 h-5 mx-auto mb-2 text-gray-300" />{text}</div>;
}
