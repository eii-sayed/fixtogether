import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  Recycle,
  Layers,
  Clock,
} from 'lucide-react';

export default function NewDonationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const preselectedItemId = searchParams.get('item');
  const preselectedNeedId = searchParams.get('need');

  const [mode, setMode] = useState(preselectedItemId ? 'existing' : 'new');
  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId || '');
  const [selectedNeedId, setSelectedNeedId] = useState(preselectedNeedId || '');

  // Form State for new item specs
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('good');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  // Logistics State
  const [preferredHandover, setPreferredHandover] = useState('either');
  const [estimatedWeight, setEstimatedWeight] = useState(2);
  const [city, setCity] = useState('Dhaka');
  const [approximateArea, setApproximateArea] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
    staleTime: 60000,
  });

  // Fetch registered items
  const { data: myItemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['my-items-donation-page'],
    queryFn: () => api.get('/items?limit=50').then((r) => r.data.data),
  });

  // Fetch community needs
  const { data: needsData } = useQuery({
    queryKey: ['community-needs-options'],
    queryFn: () => api.get('/donations/needs?limit=20').then((r) => r.data.data),
  });

  const categories = categoriesData?.categories || [];
  const myItems = myItemsData?.items || [];
  const needs = needsData?.needs || [];

  const selectedNeed = needs.find((n) => n._id === selectedNeedId);
  const selectedItem = myItems.find((i) => i._id === selectedItemId);

  // If preselectedNeed exists and has category, auto-set category
  useEffect(() => {
    if (selectedNeed?.category?._id && !categoryId) {
      setCategoryId(selectedNeed.category._id);
    }
  }, [selectedNeed]);

  // Create Mutation
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
          : 'Donation offer published to community network!'
      );
      navigate('/donations');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit donation offer');
    },
  });

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
        toast.error('Please enter an item title.');
        return;
      }
      if (!categoryId) {
        toast.error('Please select a category.');
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/donations" className="hover:text-gray-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Donations
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Make a Donation</span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-pink-200 text-pink-200" />
            <span>Circular Hardware Reuse Program</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Give Unused Hardware a Second Life
          </h1>
          <p className="text-sm text-pink-100/90 leading-relaxed">
            Your electronics, appliances, and tools are inspected, matched, and routed to verified
            schools, vocational hubs, and non-profits across the country.
          </p>
        </div>
        <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-8 opacity-15 pointer-events-none">
          <Recycle className="w-48 h-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Donation Form (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            {/* Target Community Need Banner if selected */}
            {selectedNeed ? (
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                    Fulfilling Organization Need
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedNeedId('')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Change Need
                  </button>
                </div>
                <h3 className="text-sm font-bold text-gray-900">{selectedNeed.title}</h3>
                <p className="text-xs text-gray-600 line-clamp-2">{selectedNeed.description}</p>
                <div className="text-[11px] text-indigo-800 flex items-center gap-3 pt-1">
                  <span>Organization: {selectedNeed.organization?.organizationName || 'Non-profit'}</span>
                  <span>•</span>
                  <span>Min condition: {selectedNeed.minimumCondition}</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Fulfill a Posted Community Need (Optional)
                </label>
                <select
                  value={selectedNeedId}
                  onChange={(e) => setSelectedNeedId(e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="">-- Open community pool (Auto-match with top organization) --</option>
                  {needs.map((n) => (
                    <option key={n._id} value={n._id}>
                      {n.title} ({n.organization?.organizationName || 'Non-profit'}) - {n.urgency} urgency
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Switcher */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Item Source</label>
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
                  <Plus className="w-4 h-4" /> Enter Item Details
                </button>
              </div>
            </div>

            {/* Mode A: Existing Item */}
            {mode === 'existing' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700">
                  Select Registered Item <span className="text-red-500">*</span>
                </label>
                {itemsLoading ? (
                  <div className="p-4 text-center text-xs text-gray-400">Loading your items...</div>
                ) : myItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                    <p>No registered items in your inventory.</p>
                    <button
                      type="button"
                      onClick={() => setMode('new')}
                      className="font-bold underline text-amber-900"
                    >
                      Enter item details directly →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
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

            {/* Mode B: New Item Inline */}
            {mode === 'new' && (
              <div className="space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Item Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lenovo ThinkPad T480 or HP LaserJet Printer"
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
                      <option value="fair">Fair (Working, visible wear)</option>
                      <option value="poor">Poor (Needs minor fix or thorough cleaning)</option>
                      <option value="broken">Broken (Needs technician repair before reuse)</option>
                      <option value="for_parts">For Parts / Raw E-waste Recycling</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Brand</label>
                    <input
                      type="text"
                      placeholder="e.g. Dell, Samsung, Apple"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="input text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Model / Specs</label>
                    <input
                      type="text"
                      placeholder="e.g. Core i5, 8GB RAM, 256GB SSD"
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
                    Description & Included Accessories
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Included power adapters, cables, remote controls, or functional history..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input text-xs w-full"
                  />
                </div>
              </div>
            )}

            {/* Handover Logistics */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-gray-500" /> Handover Logistics
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Preferred Handover Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'either', label: 'Flexible / Either', desc: 'Dropoff or Pickup' },
                    { id: 'dropoff', label: 'Drop-off at Hub', desc: 'Visit drop-off location' },
                    { id: 'pickup', label: 'Courier Pickup', desc: 'Org collects from you' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPreferredHandover(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
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
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    City / Division
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka, Chittagong"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Pickup Area / Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhanmondi Road 27, available on weekday afternoons"
                  value={approximateArea}
                  onChange={(e) => setApproximateArea(e.target.value)}
                  className="input text-xs w-full"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <Link to="/donations" className="btn-ghost text-xs text-gray-500">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary text-xs flex items-center gap-2 shadow-sm"
              >
                {createMutation.isPending ? (
                  <>Publishing Donation...</>
                ) : (
                  <>
                    <Heart className="w-4 h-4 fill-white" /> Complete & Submit Offer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar: How It Works & Environmental Impact */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4 bg-gradient-to-br from-white to-gray-50/50">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Donation Journey
            </h3>
            <ul className="space-y-3 text-xs text-gray-600">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div>
                  <strong className="text-gray-900 block">Offer Published</strong>
                  Matching engine pairs your hardware with certified non-profits and repair hubs.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div>
                  <strong className="text-gray-900 block">Handover & Code</strong>
                  You receive a unique confirmation code (e.g. FT-78421) to verify drop-off or pickup.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <div>
                  <strong className="text-gray-900 block">Hub Technical Inspection</strong>
                  Engineers test hardware safety, refurbish if required, and clear any remaining data.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <div>
                  <strong className="text-gray-900 block">Impact Certified</strong>
                  E-waste diversion and beneficiary delivery are logged into your environmental ledger.
                </div>
              </li>
            </ul>
          </div>

          <div className="card p-5 space-y-3 bg-emerald-50/50 border border-emerald-100 text-emerald-950">
            <div className="flex items-center gap-2">
              <Recycle className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Environmental Guarantee
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-emerald-800">
              100% of donated items avoid unmanaged landfills. Items beyond economic repair are safely
              deprecision-recycled with certified e-waste facilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
