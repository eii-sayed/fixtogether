import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { PageLoader } from '../ui';

export default function TechnicianProfileForm() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: techData, isLoading } = useQuery({
    queryKey: ['my-technician-profile'],
    queryFn: () => api.get('/technicians/me/profile').then(r => r.data.data.technician),
    retry: false, // In case it doesn't exist yet
  });

  const [formData, setFormData] = useState({
    biography: '',
    yearsOfExperience: 0,
    maximumServiceDistance: 25,
  });

  useEffect(() => {
    if (techData) {
      setFormData({
        biography: techData.biography || '',
        yearsOfExperience: techData.yearsOfExperience || 0,
        maximumServiceDistance: techData.maximumServiceDistance || 25,
      });
    }
  }, [techData]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/technicians/me/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-technician-profile']);
      toast.success('Technician profile updated!');
      setEditing(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Update failed');
    },
  });

  if (isLoading) return <div className="card card-body flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;

  return (
    <div className="card card-body mt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5 border-b border-gray-100 pb-2">Technician Settings</h2>

      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }} className="space-y-5">
          <div>
            <label className="label">Biography</label>
            <textarea 
              value={formData.biography} 
              onChange={(e) => setFormData({...formData, biography: e.target.value})} 
              className="input w-full min-h-[100px]" 
              placeholder="Tell customers about your experience and expertise..."
            />
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Years of Experience</label>
              <input 
                type="number" 
                min="0"
                value={formData.yearsOfExperience} 
                onChange={(e) => setFormData({...formData, yearsOfExperience: Number(e.target.value)})} 
                className="input" 
              />
            </div>
            <div>
              <label className="label">Max Service Distance (km)</label>
              <input 
                type="number" 
                min="1"
                max="500"
                value={formData.maximumServiceDistance} 
                onChange={(e) => setFormData({...formData, maximumServiceDistance: Number(e.target.value)})} 
                className="input" 
              />
            </div>
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
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Biography</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{techData?.biography || 'No biography added yet.'}</p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs font-medium text-gray-500">Years of Experience</p>
              <p className="text-sm font-semibold text-gray-900">{techData?.yearsOfExperience || 0} years</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Service Radius</p>
              <p className="text-sm font-semibold text-gray-900">{techData?.maximumServiceDistance || 25} km</p>
            </div>
          </div>

          <div className="flex justify-end mt-2 pt-4 border-t border-gray-100">
            <button onClick={() => setEditing(true)} className="btn-outline text-sm">Edit Technician Info</button>
          </div>
        </div>
      )}
    </div>
  );
}
