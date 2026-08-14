import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Camera, User, Mail, Phone, Calendar, Shield } from 'lucide-react';
import { StatusBadge } from '../ui';

export default function BasicProfileForm({ profileData }) {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profileData?.fullName || '');
  const [phone, setPhone] = useState(profileData?.phone || '');
  const [previewImage, setPreviewImage] = useState(profileData?.profileImage?.url || null);
  const fileInputRef = useRef(null);

  const updateMutation = useMutation({
    mutationFn: async (formData) => {
      return api.patch('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['my-profile']);
      updateUser(res.data.data.user);
      toast.success('Profile updated successfully!');
      setEditing(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Update failed');
    },
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('phone', phone);
    
    if (fileInputRef.current?.files[0]) {
      formData.append('profileImage', fileInputRef.current.files[0]);
    }
    
    updateMutation.mutate(formData);
  };

  return (
    <div className="card card-body">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 border-b border-gray-100 pb-2">Basic Information</h2>
      
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center border-4 border-white shadow-sm">
            {previewImage ? (
              <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>
          {editing && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-700 hover:text-primary-600 hover:border-primary-100 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp" 
            onChange={handleImageChange} 
          />
        </div>
        <div className="text-center sm:text-left mt-2">
          <h2 className="text-xl font-bold text-gray-900">{profileData?.fullName}</h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
            <span className="badge-green capitalize">{profileData?.role}</span>
            <StatusBadge status={profileData?.accountStatus} />
          </div>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </div>
          </div>
          
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setEditing(false); setPreviewImage(profileData?.profileImage?.url || null); }} className="btn-outline">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary min-w-[100px]">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Mail className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500">Email Address</p>
              <p className="text-sm font-semibold text-gray-900">{profileData?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Phone className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500">Phone Number</p>
              <p className="text-sm font-semibold text-gray-900">{profileData?.phone || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500">Member Since</p>
              <p className="text-sm font-semibold text-gray-900">{new Date(profileData?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Shield className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-500">Email Status</p>
              <p className={`text-sm font-semibold ${profileData?.emailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                {profileData?.emailVerified ? 'Verified' : 'Unverified'}
              </p>
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end mt-2">
            <button onClick={() => setEditing(true)} className="btn-outline text-sm">Edit Basic Info</button>
          </div>
        </div>
      )}
    </div>
  );
}
