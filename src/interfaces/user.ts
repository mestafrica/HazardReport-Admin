export interface UserProfile {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    reports: number;
    status: 'Active' | 'Pending' | 'Suspended';
    role: 'admin' | 'user';
    avatar?: string;
    address?: string;
    lastActive?: string;
}

export interface BackendUser {
    _id: string;
    userName: string;
    email: string;
    phoneNumber: string;
    avatar?: string;
    role: 'user' | 'admin';
    isActive?: boolean;
    isVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
    reportsCount?: number;
}

export interface UpdateUserData {
    userName?: string;
    email?: string;
    phoneNumber?: string;
    avatar?: File;
    isActive?: boolean;
    isVerified?: boolean;
}

export interface CreateUserData {
    userName: string;
    email: string;
    phoneNumber: string;
    password: string;
    avatar?: File;
    role?: 'user' | 'admin';
}
