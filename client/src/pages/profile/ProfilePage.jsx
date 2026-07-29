import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, StatusBadge } from '../../components/ui';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar, Shield, Edit2, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/users/me').then(r => r.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch('/users/me', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['my-profile']);
      updateUser(res.data.data.user);
      toast.success('Profile updated!');
      setEditing(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  if (isLoading) return <PageLoader />;
  const p = profileData?.user;

  return (
    <div className="page-container max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="card card-body">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{p?.fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-green capitalize">{p?.role}</span>
              <StatusBadge status={p?.accountStatus} />
            </div>
          </div>
        </div>

        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ fullName, phone }); }} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-outline">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{p?.email}</span>
            </div>
            {p?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{p.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">Joined {new Date(p?.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">Email {p?.emailVerified ? 'verified' : 'not verified'}</span>
            </div>
            <button onClick={() => setEditing(true)} className="btn-outline"><Edit2 className="w-4 h-4" /> Edit Profile</button>
          </div>
        )}
      </div>
    </div>
  );
}
