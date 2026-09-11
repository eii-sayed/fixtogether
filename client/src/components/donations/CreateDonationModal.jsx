import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Heart,
  Package,
  Plus,
  Truck,
  MapPin,
  Building,
  Sparkles,
  Info,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function CreateDonationModal({
  open,
  onClose,
  preselectedNeed = null,
  preselectedItem = null,
  onSuccess = null,
}) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState(preselectedItem ? 'existing' : 'new');
  const [selectedItemId, setSelectedItemId] = useState(preselectedItem?._id || '');
  const [selectedNeedId, setSelectedNeedId] = useState(preselectedNeed?._id || '');

  // Form State for new item specs
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('good');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  // Handover & Logistics State
  const [preferredHandover, setPreferredHandover] = useState('either');
  const [estimatedWeight, setEstimatedWeight] = useState(2);
  const [city, setCity] = useState('Dhaka');
  const [approximateArea, setApproximateArea] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Synchronize props
  useEffect(() => {
    if (preselectedItem) {
      setMode('existing');
      setSelectedItemId(preselectedItem._id);
    }
  }, [preselectedItem]);

  useEffect(() => {
    if (preselectedNeed) {
      setSelectedNeedId(preselectedNeed._id);
      if (preselectedNeed.category?._id) {
        setCategoryId(preselectedNeed.category._id);
      }
    }
  }, [preselectedNeed]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 60000,
    enabled: open,
  });

  // Fetch user's registered items
  const { data: myItemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['my-items-donation-modal'],
    queryFn: () => api.get('/items?limit=50').then((r) => r.data.data),
    enabled: open,
  });

  // Fetch active community needs to fulfill
  const { data: needsData } = useQuery({
    queryKey: ['community-needs-options'],
    queryFn: () => api.get('/donations/needs?limit=20').then((r) => r.data.data),
    enabled: open,
  });

  const categories = categoriesData?.categories || [];
  const myItems = myItemsData?.items || [];
  const needs = needsData?.needs || [];

  const selectedNeed =
    preselectedNeed || needs.find((n) => n._id === selectedNeedId) || null;
  const selectedItem =
    myItems.find((i) => i._id === selectedItemId) || preselectedItem || null;

  // Donation Submission Mutation
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/donations', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['owner-donations']);
      queryClient.invalidateQueries(['donation-offers']);
      queryClient.invalidateQueries(['community-needs']);
      queryClient.invalidateQueries(['my-items']);
      toast.success(
        res.data?.data?.donation?.selectedOrganization
          ? 'Donation offer created and matched with organization!'
          : 'Donation offer published to the community network!'
      );
      if (onSuccess) onSuccess(res.data?.data?.donation);
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create donation offer');
    },
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      matchingNeedId: selectedNeedId || undefined,
      preferredHandover,
      estimatedWeight: Number(estimatedWeight) || 1,
      pickupLocation: {
        approximateArea: approximateArea.trim() || 'Central',
        city: city.trim() || 'Dhaka',
      },
      description: handoverNotes.trim() || description.trim(),
    };

    if (mode === 'existing') {
      if (!selectedItemId) {
        toast.error('Please select an item from your registered inventory.');
        return;
      }
      payload.itemId = selectedItemId;
    } else {
      if (!title.trim()) {
        toast.error('Please provide a title for the donation.');
        return;
      }
      if (!categoryId) {
        toast.error('Please select an item category.');
        return;
      }
      payload.title = title.trim();
      payload.category = categoryId;
      payload.subcategory = subcategory.trim() || undefined;
      payload.brand = brand.trim() || undefined;
      payload.model = model.trim() || undefined;
      payload.itemCondition = condition;
      payload.images = imageUrl.trim() ? [{ url: imageUrl.trim(), isPrimary: true }] : [];
      payload.description = description.trim() || title.trim();
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 via-white to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-xs">
              <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {preselectedNeed ? 'Donate to Community Need' : 'Offer Item for Donation'}
              </h2>
              <p className="text-xs text-gray-500">
                Direct hardware reuse for certified schools, non-profits, and repair hubs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Need Callout Banner */}
          {selectedNeed ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900">
                  Target Community Need
                </span>
                <span className="text-xs font-semibold text-indigo-700">
                  Urgency: {selectedNeed.urgency?.toUpperCase()}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900">{selectedNeed.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-2">{selectedNeed.description}</p>
              <div className="text-[11px] text-indigo-800 flex items-center gap-2 pt-1">
                <span>Beneficiary: {selectedNeed.beneficiaryContext || 'Community initiative'}</span>
                <span>•</span>
                <span>Requested: {selectedNeed.quantityRequested} items</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Fulfill a Community Need (Optional)
              </label>
              <select
                value={selectedNeedId}
                onChange={(e) => setSelectedNeedId(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="">-- Direct donation / Open community pool --</option>
                {needs.map((n) => (
                  <option key={n._id} value={n._id}>
                    {n.title} ({n.organization?.organizationName || 'Non-profit'}) - {n.urgency} urgency
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode Switcher */}
          {!preselectedItem && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'existing'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Package className="w-4 h-4" /> From My Inventory ({myItems.length})
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'new'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Plus className="w-4 h-4" /> Donate New / Unregistered Item
              </button>
            </div>
          )}

          {/* Mode A: Select Existing Registered Item */}
          {mode === 'existing' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">
                Choose an item to donate <span className="text-red-500">*</span>
              </label>
              {itemsLoading ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading your items...</div>
              ) : myItems.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                  <p>You do not have any registered items yet.</p>
                  <button
                    type="button"
                    onClick={() => setMode('new')}
                    className="font-bold underline text-amber-900"
                  >
                    Switch to donating a new item directly →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {myItems.map((item) => {
                    const isSelected = selectedItemId === item._id;
                    return (
                      <div
                        key={item._id}
                        onClick={() => setSelectedItemId(item._id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {item.images?.length > 0 ? (
                            <img
                              src={item.images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {item.category?.name || 'Item'} • {item.condition}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-pink-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mode B: Enter Item Details Inline */}
          {mode === 'new' && (
            <div className="space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Item Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude 7490 Laptop or Philips Steam Iron"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Condition <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="input text-xs w-full"
                  >
                    <option value="new">Brand New / Sealed</option>
                    <option value="good">Good (Fully functional, light cosmetic wear)</option>
                    <option value="fair">Fair (Working, visible wear or minor glitch)</option>
                    <option value="poor">Poor (Needs minor repair or cleaning)</option>
                    <option value="broken">Broken (Requires technician repair before reuse)</option>
                    <option value="for_parts">For Parts / E-waste Recycling</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Dell, Sony, LG"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Model / Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. Core i5, 8GB RAM"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="input text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Photo Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Item Description & Operational Status
                </label>
                <textarea
                  rows={2}
                  placeholder="Mention any known quirks, cosmetic condition, included cables or adapters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input text-xs w-full"
                />
              </div>
            </div>
          )}

          {/* Handover Logistics & Preferences */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-gray-500" /> Handover Logistics & Preferences
            </h4>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Preferred Handover Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'either', label: 'Any / Flexible', desc: 'Dropoff or Pickup' },
                  { id: 'dropoff', label: 'Drop-off at Hub', desc: 'You visit drop-off location' },
                  { id: 'pickup', label: 'Courier Pickup', desc: 'Org picks up from your area' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPreferredHandover(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      preferredHandover === opt.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs">{opt.label}</p>
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Estimated Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={estimatedWeight}
                  onChange={(e) => setEstimatedWeight(e.target.value)}
                  className="input text-xs w-full"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Used for verified carbon & e-waste diversion metrics
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Location / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mirpur, Dhaka"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input text-xs w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Pickup Address / Handover Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Near Mirpur 10 roundabout, available after 4 PM"
                value={approximateArea}
                onChange={(e) => setApproximateArea(e.target.value)}
                className="input text-xs w-full"
              />
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
            className="btn-primary text-xs flex items-center gap-2 shadow-sm"
          >
            {createMutation.isPending ? (
              <>Submitting Offer...</>
            ) : (
              <>
                <Heart className="w-4 h-4 fill-white" /> Complete Donation Offer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
