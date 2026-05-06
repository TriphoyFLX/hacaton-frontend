import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5002/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  birthDate?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  user?: UserProfile;
  errors?: ValidationError[];
  error?: string;
}

export const profileApi = {
  getMyProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/profile');
    return response.data;
  },

  getPublicProfile: async (identifier: string): Promise<UserProfile> => {
    const response = await api.get(`/profile/${identifier}`);
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
    const response = await api.patch('/profile', data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAvatar: async (): Promise<{ message: string }> => {
    const response = await api.delete('/profile/avatar');
    return response.data;
  },

  searchUsers: async (query: string, limit: number = 10): Promise<Array<{
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    bio?: string;
  }>> => {
    const response = await api.get(`/profile/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  },
};

export default profileApi;
