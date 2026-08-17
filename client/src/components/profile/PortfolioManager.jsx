import { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Calendar,
  X,
  Upload,
  CheckCircle,
} from 'lucide-react';

export default function PortfolioManager({ portfolio = [] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data.categories),
  });

  const handleBeforeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBeforeFile(file);
    setBeforePreview(URL.createObjectURL(file));
  };

  const handleAfterChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAfterFile(file);
    setAfterPreview(URL.createObjectURL(file));
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Project title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (category) formData.append('category', category);

      if (beforeFile) formData.append('images', beforeFile);
      if (afterFile) formData.append('images', afterFile);

      await api.post('/technicians/me/portfolio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Portfolio project added!');
      queryClient.invalidateQueries(['my-profile']);
      setModalOpen(false);
      setTitle('');
      setDescription('');
      setCategory('');
      setBeforeFile(null);
      setAfterFile(null);
      setBeforePreview(null);
      setAfterPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add portfolio item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this project from your portfolio?')) return;

    try {
      await api.delete(`/technicians/me/portfolio/${itemId}`);
      toast.success('Project removed');
      queryClient.invalidateQueries(['my-profile']);
    } catch (err) {
      toast.error('Failed to remove project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Repair Portfolio & Showcase</h3>
          <p className="text-xs text-gray-500">
            Showcase your completed repairs to build trust with item owners
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      {/* Projects Grid */}
      {portfolio.length === 0 ? (
        <div className="card card-body text-center py-12 border-dashed">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-gray-800">No portfolio projects yet</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Upload your before and after repair photos to demonstrate your craftsmanship.
          </p>
          <button onClick={() => setModalOpen(true)} className="btn-outline btn-sm mt-4 mx-auto">
            <Plus className="w-4 h-4" /> Add First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolio.map((item) => (
            <div key={item._id} className="card border hover:shadow-md transition-shadow">
              <div className="grid grid-cols-2 gap-1 bg-gray-100 h-44 overflow-hidden">
                <div className="relative h-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {item.beforeImage?.url ? (
                    <img src={item.beforeImage.url} alt="Before repair" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-bold text-gray-400">No Before Photo</span>
                  )}
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Before
                  </span>
                </div>
                <div className="relative h-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {item.afterImage?.url ? (
                    <img src={item.afterImage.url} alt="After repair" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-bold text-gray-400">No After Photo</span>
                  )}
                  <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    After
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-gray-900">{item.title}</h4>
                  <button
                    onClick={() => handleDeleteProject(item._id)}
                    className="p-1.5 text-gray-400 hover:text-danger-600 rounded-lg hover:bg-danger-50"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {item.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                  <span>{item.category?.name || 'General Repair'}</span>
                  <span>{item.completedAt ? new Date(item.completedAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="card w-full max-w-lg bg-white shadow-2xl rounded-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Add Portfolio Project</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div>
                <label className="label">Project Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="e.g., iPhone 13 Screen & Battery Replacement"
                  required
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                  <option value="">Select category</option>
                  {categories?.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Repair Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input resize-y text-sm"
                  placeholder="Describe the issue, diagnostics, parts replaced, and results..."
                />
              </div>

              {/* Before and After Image Uploaders */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Before Photo (Optional)</label>
                  <div
                    onClick={() => beforeInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 overflow-hidden bg-gray-50 text-center p-2"
                  >
                    {beforePreview ? (
                      <img src={beforePreview} alt="Before preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500 font-medium">Upload Before</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={beforeInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBeforeChange}
                  />
                </div>

                <div>
                  <label className="label text-xs">After Photo (Optional)</label>
                  <div
                    onClick={() => afterInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 overflow-hidden bg-gray-50 text-center p-2"
                  >
                    {afterPreview ? (
                      <img src={afterPreview} alt="After preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500 font-medium">Upload After</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={afterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAfterChange}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
