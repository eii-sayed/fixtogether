import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function OrganizationProfileForm() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['my-org-profile'],
    queryFn: () => api.get('/organizations/me/profile').then(r => r.data.data.organization),
    retry: false,
  });

  const [formData, setFormData] = useState({
    organizationName: '',
    description: '',
    website: '',
    organizationType: 'ngo',
  });

  useEffect(() => {
    if (orgData) {
      setFormData({
        organizationName: orgData.organizationName || '',
        description: orgData.description || '',
        website: orgData.registrationInformation?.website || '',
        organizationType: orgData.organizationType || 'ngo',
      });
    }
  }, [orgData]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/organizations/me/profile', {
      organizationName: data.organizationName,
      description: data.description,
      organizationType: data.organizationType,
      registrationInformation: {
        ...orgData?.registrationInformation,
        website: data.website
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-org-profile']);
      toast.success('Organization profile updated!');
      setEditing(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Update failed');
    },
  });

  if (isLoading) return <div className="card card-body flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;

  return (
    <div className="card card-body mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 border-b border-gray-100 pb-2">Organization Settings</h2>

      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Organization Name</label>
              <input 
                value={formData.organizationName} 
                onChange={(e) => setFormData({...formData, organizationName: e.target.value})} 
                className="input" 
                required
              />
            </div>
            <div>
              <label className="label">Organization Type</label>
              <select 
                value={formData.organizationType} 
                onChange={(e) => setFormData({...formData, organizationType: e.target.value})} 
                className="input"
              >
                <option value="ngo">NGO</option>
                <option value="charity">Charity</option>
                <option value="school">School</option>
                <option value="community_center">Community Center</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              className="input w-full min-h-[100px]" 
              placeholder="Describe your organization's mission and what you do..."
            />
          </div>
          
          <div>
            <label className="label">Website</label>
            <input 
              type="url" 
              value={formData.website} 
              onChange={(e) => setFormData({...formData, website: e.target.value})} 
              className="input" 
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setEditing(false)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary min-w-[100px]">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500">Organization Name</p>
              <p className="text-sm font-semibold text-gray-900">{orgData?.organizationName || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Type</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{orgData?.organizationType?.replace('_', ' ') || 'Not set'}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{orgData?.description || 'No description provided.'}</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Website</p>
            {orgData?.registrationInformation?.website ? (
              <a href={orgData.registrationInformation.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-600 hover:underline">
                {orgData.registrationInformation.website}
              </a>
            ) : (
              <p className="text-sm text-gray-900">Not provided</p>
            )}
          </div>

          <div className="flex justify-end mt-2 pt-4 border-t border-gray-100">
            <button onClick={() => setEditing(true)} className="btn-outline text-sm">Edit Organization Info</button>
          </div>
        </div>
      )}
    </div>
  );
}
