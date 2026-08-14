import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader } from '../../components/ui';
import BasicProfileForm from '../../components/profile/BasicProfileForm';
import TechnicianProfileForm from '../../components/profile/TechnicianProfileForm';
import OrganizationProfileForm from '../../components/profile/OrganizationProfileForm';

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/users/me').then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your personal information and settings</p>
      </div>

      <BasicProfileForm profileData={profileData?.user} />

      {user?.role === 'technician' && <TechnicianProfileForm />}
      {user?.role === 'organization' && <OrganizationProfileForm />}
    </div>
  );
}
