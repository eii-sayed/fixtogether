import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  X,
  User,
  Phone,
  MapPin,
  Globe,
  Loader2,
  Camera,
  Briefcase,
  Building,
  Shield,
} from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  bio: z.string().trim().max(500, 'Bio cannot exceed 500 characters').optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  serviceArea: z.string().trim().max(200).optional().or(z.literal('')),
  preferredLanguage: z.enum(['en', 'bn']).default('en'),
  preferredContactMethod: z.enum(['in_app', 'email', 'phone']).default('in_app'),

  // Technician fields
  professionalName: z.string().trim().max(100).optional().or(z.literal('')),
  technicianBio: z.string().trim().max(2000).optional().or(z.literal('')),
  yearsOfExperience: z.coerce.number().min(0).max(60).optional(),
  minimumServiceCharge: z.coerce.number().min(0).optional(),
  warrantyPolicy: z.string().trim().max(1000).optional().or(z.literal('')),

  // Organization fields
  organizationName: z.string().trim().max(200).optional().or(z.literal('')),
  organizationType: z.string().optional().or(z.literal('')),
  organizationDescription: z.string().trim().max(3000).optional().or(z.literal('')),
  donationInstructions: z.string().trim().max(2000).optional().or(z.literal('')),
  recyclingInstructions: z.string().trim().max(2000).optional().or(z.literal('')),
  pickupAvailable: z.boolean().optional(),
  dropoffAvailable: z.boolean().optional(),
});

export default function EditProfileModal({ user, roleProfile, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [avatarPreview, setAvatarPreview] = useState(user?.profileImage?.url || '');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      city: user?.city || '',
      serviceArea: user?.serviceArea || '',
      preferredLanguage: user?.preferredLanguage || 'en',
      preferredContactMethod: user?.preferredContactMethod || 'in_app',

      // Technician
      professionalName: roleProfile?.professionalName || '',
      technicianBio: roleProfile?.biography || '',
      yearsOfExperience: roleProfile?.yearsOfExperience || 0,
      minimumServiceCharge: roleProfile?.minimumServiceCharge || 0,
      warrantyPolicy: roleProfile?.warrantyPolicy || '',

      // Organization
      organizationName: roleProfile?.organizationName || user?.fullName || '',
      organizationType: roleProfile?.organizationType || 'donation_organization',
      organizationDescription: roleProfile?.description || '',
      donationInstructions: roleProfile?.donationInstructions || '',
      recyclingInstructions: roleProfile?.recyclingInstructions || '',
      pickupAvailable: roleProfile?.pickupAvailable ?? false,
      dropoffAvailable: roleProfile?.dropoffAvailable ?? true,
    },
  });

  const bioWatch = watch('bio') || '';

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar image must be under 5MB');
      return;
    }

    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    try {
      // 1. Upload Avatar if selected
      if (selectedAvatarFile) {
        const formData = new FormData();
        formData.append('image', selectedAvatarFile);
        await api.post('/users/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 2. Update Shared User Profile
      const userPayload = {
        fullName: data.fullName,
        phone: data.phone,
        bio: data.bio,
        city: data.city,
        serviceArea: data.serviceArea,
        preferredLanguage: data.preferredLanguage,
        preferredContactMethod: data.preferredContactMethod,
      };
      await api.patch('/users/me', userPayload);

      // 3. Role-specific profile updates
      if (user?.role === 'technician') {
        const techPayload = {
          professionalName: data.professionalName,
          biography: data.technicianBio,
          yearsOfExperience: Number(data.yearsOfExperience),
          minimumServiceCharge: Number(data.minimumServiceCharge),
          warrantyPolicy: data.warrantyPolicy,
        };
        await api.put('/technicians/me/profile', techPayload);
      } else if (user?.role === 'organization') {
        const orgPayload = {
          organizationName: data.organizationName,
          organizationType: data.organizationType,
          description: data.organizationDescription,
          donationInstructions: data.donationInstructions,
          recyclingInstructions: data.recyclingInstructions,
          pickupAvailable: Boolean(data.pickupAvailable),
          dropoffAvailable: Boolean(data.dropoffAvailable),
        };
        await api.put('/organizations/me/profile', orgPayload);
      }

      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries(['my-profile']);
      queryClient.invalidateQueries(['auth-me']);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-2xl bg-white shadow-2xl rounded-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
            <p className="text-xs text-gray-500">Update your public identity and role details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation for technician/organization */}
        {(user?.role === 'technician' || user?.role === 'organization') && (
          <div className="flex border-b border-gray-200 px-6 gap-6 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              General Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roleSpecific')}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'roleSpecific'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {user.role === 'technician' ? (
                <>
                  <Briefcase className="w-4 h-4" /> Professional Profile
                </>
              ) : (
                <>
                  <Building className="w-4 h-4" /> Organization Details
                </>
              )}
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'general' && (
            <>
              {/* Avatar Section */}
              <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-primary-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-primary-700 font-bold text-2xl">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      user?.fullName?.charAt(0) || 'U'
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Change Photo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">Profile Photo</h4>
                  <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, or WebP up to 5MB.</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-outline btn-sm mt-2 text-xs"
                  >
                    <Camera className="w-3.5 h-3.5" /> Upload New Photo
                  </button>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="fullName">
                    Full Name *
                  </label>
                  <input
                    {...register('fullName')}
                    id="fullName"
                    className={`input ${errors.fullName ? 'input-error' : ''}`}
                    placeholder="Rahim Ahmed"
                  />
                  {errors.fullName && <p className="error-text">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    {...register('phone')}
                    id="phone"
                    className={`input ${errors.phone ? 'input-error' : ''}`}
                    placeholder="+880 1700-000000"
                  />
                  {errors.phone && <p className="error-text">{errors.phone.message}</p>}
                </div>
              </div>

              {/* City & Service Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="city">
                    City / District
                  </label>
                  <input
                    {...register('city')}
                    id="city"
                    className="input"
                    placeholder="e.g. Dhaka, Chittagong, Sylhet"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="serviceArea">
                    Neighborhood / Area
                  </label>
                  <input
                    {...register('serviceArea')}
                    id="serviceArea"
                    className="input"
                    placeholder="e.g. Dhanmondi, Gulshan, Mirpur"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label !mb-0" htmlFor="bio">
                    Short Biography
                  </label>
                  <span className="text-[11px] text-gray-400">{bioWatch.length} / 500</span>
                </div>
                <textarea
                  {...register('bio')}
                  id="bio"
                  rows={3}
                  className={`input resize-y text-sm ${errors.bio ? 'input-error' : ''}`}
                  placeholder="Tell the community a little about yourself..."
                />
                {errors.bio && <p className="error-text">{errors.bio.message}</p>}
              </div>

              {/* Language & Preferred Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="preferredLanguage">
                    Preferred Language
                  </label>
                  <select {...register('preferredLanguage')} id="preferredLanguage" className="input">
                    <option value="en">English</option>
                    <option value="bn">বাংলা (Bengali)</option>
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="preferredContactMethod">
                    Preferred Contact Method
                  </label>
                  <select {...register('preferredContactMethod')} id="preferredContactMethod" className="input">
                    <option value="in_app">In-App Chat (Recommended)</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone Call</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {activeTab === 'roleSpecific' && user?.role === 'technician' && (
            <>
              <div>
                <label className="label" htmlFor="professionalName">
                  Professional / Business Display Name
                </label>
                <input
                  {...register('professionalName')}
                  id="professionalName"
                  className="input"
                  placeholder="e.g. Sumon Electronics & Mobile Care"
                />
              </div>

              <div>
                <label className="label" htmlFor="technicianBio">
                  Detailed Professional Bio
                </label>
                <textarea
                  {...register('technicianBio')}
                  id="technicianBio"
                  rows={4}
                  className="input resize-y text-sm"
                  placeholder="Describe your technical expertise, certifications, and repair experience..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="yearsOfExperience">
                    Years of Experience
                  </label>
                  <input
                    {...register('yearsOfExperience')}
                    id="yearsOfExperience"
                    type="number"
                    min={0}
                    className="input"
                    placeholder="e.g. 5"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="minimumServiceCharge">
                    Starting / Inspection Fee (৳)
                  </label>
                  <input
                    {...register('minimumServiceCharge')}
                    id="minimumServiceCharge"
                    type="number"
                    min={0}
                    className="input"
                    placeholder="e.g. 300"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="warrantyPolicy">
                  Warranty & Guarantee Policy
                </label>
                <textarea
                  {...register('warrantyPolicy')}
                  id="warrantyPolicy"
                  rows={2}
                  className="input resize-y text-sm"
                  placeholder="e.g., 30-day warranty on replaced parts and labor for all verified repairs."
                />
              </div>
            </>
          )}

          {activeTab === 'roleSpecific' && user?.role === 'organization' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="organizationName">
                    Organization Name *
                  </label>
                  <input
                    {...register('organizationName')}
                    id="organizationName"
                    className="input"
                    placeholder="e.g. Green Earth Foundation"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="organizationType">
                    Organization Type
                  </label>
                  <select {...register('organizationType')} id="organizationType" className="input">
                    <option value="donation_organization">Charity / Donation Organization</option>
                    <option value="recycling_facility">Recycling Facility</option>
                    <option value="community_center">Community Repair Center</option>
                    <option value="reuse_hub">Reuse Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="organizationDescription">
                  Public Mission & Description
                </label>
                <textarea
                  {...register('organizationDescription')}
                  id="organizationDescription"
                  rows={3}
                  className="input resize-y text-sm"
                  placeholder="Describe your organization's mission, donation distribution, or recycling methods..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="donationInstructions">
                    Donation Instructions
                  </label>
                  <textarea
                    {...register('donationInstructions')}
                    id="donationInstructions"
                    rows={2}
                    className="input resize-y text-sm"
                    placeholder="Guidelines for item donors..."
                  />
                </div>

                <div>
                  <label className="label" htmlFor="recyclingInstructions">
                    Recycling Guidelines
                  </label>
                  <textarea
                    {...register('recyclingInstructions')}
                    id="recyclingInstructions"
                    rows={2}
                    className="input resize-y text-sm"
                    placeholder="Guidelines for e-waste or parts recycling..."
                  />
                </div>
              </div>

              <div className="flex gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input {...register('pickupAvailable')} type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Doorstep Pickup Available</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input {...register('dropoffAvailable')} type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Drop-off Hubs Open</span>
                </label>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary min-w-[120px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
