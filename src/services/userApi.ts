import { apiClient } from './config';
import { BackendUser, UpdateUserData, CreateUserData } from '../interfaces/user';

export type { BackendUser, UpdateUserData, CreateUserData } from '../interfaces/user';

export const userApi = {
  getAllUsers: async (): Promise<BackendUser[]> => {
    const response = await apiClient.get('/api/admin/users');
    return response.data.users;
  },

  getUserById: async (id: string): Promise<BackendUser> => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data.user;
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<BackendUser> => {
    const formData = new FormData();
    
    if (data.userName) formData.append('userName', data.userName);
    if (data.email) formData.append('email', data.email);
    if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
    if (data.avatar) formData.append('avatar', data.avatar);
    if (data.isActive !== undefined) formData.append('isActive', String(data.isActive));
    if (data.isVerified !== undefined) formData.append('isVerified', String(data.isVerified));

    const response = await apiClient.patch(`/api/users/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.user;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },

  createUser: async (data: CreateUserData): Promise<BackendUser> => {
    const formData = new FormData();
    
    formData.append('userName', data.userName);
    formData.append('email', data.email);
    formData.append('phoneNumber', data.phoneNumber);
    formData.append('password', data.password);
    if (data.avatar) formData.append('avatar', data.avatar);
    if (data.role) formData.append('role', data.role);

    const response = await apiClient.post('/api/users/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.user;
  },
};

export default userApi;
