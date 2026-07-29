import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'good', 'fair', 'poor', 'broken', 'for_parts']),
  brand: z.string().optional(),
  model: z.string().optional(),
  approximateAgeValue: z.coerce.number().min(0).optional(),
  approximateAgeUnit: z.enum(['days', 'months', 'years']).optional(),
  ownershipDeclaration: z.boolean().refine(val => val === true, 'You must declare ownership'),
});

const conditions = [
  { value: 'new', label: 'New', desc: 'Unused, in original packaging' },
  { value: 'good', label: 'Good', desc: 'Working, minor cosmetic wear' },
  { value: 'fair', label: 'Fair', desc: 'Working, visible wear' },
  { value: 'poor', label: 'Poor', desc: 'Partially working, significant wear' },
  { value: 'broken', label: 'Broken', desc: 'Not working at all' },
  { value: 'for_parts', label: 'For Parts', desc: 'Only useful for spare parts' },
];

export default function NewItemPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data.categories),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { condition: 'broken', approximateAgeUnit: 'years', ownershipDeclaration: false },
  });

  const selectedCondition = watch('condition');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        title: data.title, category: data.category, condition: data.condition,
        brand: data.brand || undefined, model: data.model || undefined,
        ownershipDeclaration: data.ownershipDeclaration,
      };
      if (data.approximateAgeValue) {
        payload.approximateAge = { value: data.approximateAgeValue, unit: data.approximateAgeUnit };
      }
      const { data: resp } = await api.post('/items', payload);
      toast.success('Item added successfully!');
      navigate(`/repair-requests/new?item=${resp.data.item._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const parentCategories = categories?.filter(c => !c.parent) || [];

  return (
    <div className="page-container max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Item</h1>

      <div className="card card-body">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="label" htmlFor="title">Item Title *</label>
            <input {...register('title')} id="title" className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g., Samsung Galaxy S21 - Cracked Screen" />
            {errors.title && <p className="error-text">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="category">Category *</label>
              <select {...register('category')} id="category" className={`input ${errors.category ? 'input-error' : ''}`}>
                <option value="">Select category</option>
                {parentCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              {errors.category && <p className="error-text">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="brand">Brand</label>
              <input {...register('brand')} id="brand" className="input" placeholder="e.g., Samsung" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="model">Model</label>
              <input {...register('model')} id="model" className="input" placeholder="e.g., Galaxy S21" />
            </div>
            <div>
              <label className="label">Approximate Age</label>
              <div className="flex gap-2">
                <input {...register('approximateAgeValue')} type="number" className="input w-20" placeholder="0" />
                <select {...register('approximateAgeUnit')} className="input flex-1">
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Condition *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {conditions.map((c) => (
                <label key={c.value}
                  className={`flex flex-col p-3 border-2 rounded-xl cursor-pointer transition-all ${selectedCondition === c.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input {...register('condition')} type="radio" value={c.value} className="sr-only" />
                  <span className={`text-sm font-medium ${selectedCondition === c.value ? 'text-primary-700' : 'text-gray-700'}`}>{c.label}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{c.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input {...register('ownershipDeclaration')} type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700">I declare that I am the rightful owner of this item and have the authority to submit it for repair, donation, or recycling. *</span>
            </label>
            {errors.ownershipDeclaration && <p className="error-text mt-1">{errors.ownershipDeclaration.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Item & Continue to Repair Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
