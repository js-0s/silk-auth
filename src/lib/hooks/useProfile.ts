import { useAuth } from '@/contexts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PROFILE_QUERY_KEY = 'profile';

interface IUpdateUserProfileApi {
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  recipientWallet?: string;
}
interface IUserProfileApi {
  id: number;
  address: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  username: string;
  bio: string;
}

async function updateUserProfile(
  variables: IUpdateUserProfileApi,
): Promise<IUpdateUserProfileApi> {
  const response = await fetch(`/api/users/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(variables),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user profile');
  }
  const data = await response.json();
  return data.user;
}
async function fetchUserProfile(): Promise<IUserProfileApi> {
  const response = await fetch(`/api/users/me`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user profile');
  }
  const data = await response.json();
  return data;
}

export function useUserProfile() {
  const { authenticated } = useAuth();
  return useQuery({
    queryKey: [PROFILE_QUERY_KEY],
    queryFn: fetchUserProfile,
    enabled: authenticated,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] });
    },
  });
}
