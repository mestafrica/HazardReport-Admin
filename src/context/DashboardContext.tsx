import React, { createContext, ReactNode, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { apiGetAdminProfile, apiUpdateAdminProfile } from '../services/auth';
import { baseUrl } from '../services/config';
import { apiGetAllReports, apiUpdateReportStatus, apiDeleteReport, apiGetReportStats, apiCreateReport, ReportStats, CreateReportData } from '../services/reports';
import { userApi } from '../services/userApi';
import { announcementApi } from '../services/announcementApi';
import { User, UserProfile, BackendUser } from '../interfaces/user';
import { Report } from '../interfaces/report';
import { Announcement, CreateAnnouncementData, UpdateAnnouncementData } from '../interfaces/announcement';
import { DashboardContextType } from '../interfaces/dashboard';


const INITIAL_REPORTS: Report[] = [];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const loadUserProfileFromStorage = (): UserProfile => {
    const DEFAULT_PROFILE: UserProfile = {
        name: "Admin User",
        email: "admin@ghhazard.com",
        phone: "+233 00 000 0000",
        avatar: "",
    };

    const stored = localStorage.getItem("adminProfile");
    if (stored) {
        try {
            const admin = JSON.parse(stored);
            return {
                name: admin.userName || DEFAULT_PROFILE.name,
                email: admin.email || DEFAULT_PROFILE.email,
                phone: admin.phoneNumber || DEFAULT_PROFILE.phone,
                avatar: admin.avatar || DEFAULT_PROFILE.avatar,
            };
        } catch (e) {
            console.error("Failed to parse admin profile", e);
        }
    }
    return DEFAULT_PROFILE;
};

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
    const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
    const [users, setUsers] = useState<User[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfileFromStorage());
    const [reportStats, setReportStats] = useState<ReportStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

    const refreshData = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setIsLoading(true);
        try {
            const [reportsRes, profileRes, announcementsRes, statsRes] = await Promise.allSettled([
                apiGetAllReports(),
                apiGetAdminProfile(),
                announcementApi.getAllAnnouncements(),
                apiGetReportStats()
            ]);

            if (reportsRes.status === 'fulfilled' && reportsRes.value.data?.hazardReports) {
                const formattedReports: Report[] = reportsRes.value.data.hazardReports.map((r: any) => ({
                    id: r._id,
                    title: r.title || r.hazardtype,
                    location: r.location || `${r.city}, ${r.country}`,
                    name: r.user ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || r.user.userName : "Unknown",
                    date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: r.status,
                    category: r.hazardtype,
                    attachmentUrl: r.images && r.images.length > 0 ? (r.images[0].startsWith('http') ? r.images[0] : `${baseUrl}/${r.images[0]}`) : undefined,
                    locationData: { text: r.location, city: r.city, country: r.country },
                    reportType: r.announcementId ? 'announcement' : 'report',
                    announcementId: r.announcementId
                }));
                setReports(formattedReports);
            }

            if (announcementsRes.status === 'fulfilled' && announcementsRes.value) {
                const formattedAnnouncements: Announcement[] = announcementsRes.value.map((a: any, index: number) => ({
                    id: a._id || a.id || index + 1,
                    title: a.title,
                    detail: a.detail,
                    date: new Date(a.createdAt || a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    time: new Date(a.createdAt || a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    category: a.category?.charAt(0).toUpperCase() + a.category?.slice(1) || 'Info',
                    status: a.status || 'Active',
                    location: a.location,
                    attachments: a.attachments
                }));
                setAnnouncements(formattedAnnouncements);
            }

            if (profileRes.status === 'fulfilled' && profileRes.value.data) {
                const admin = profileRes.value.data;
                const newProfile = {
                    name: admin.userName || admin.name || "Admin User",
                    email: admin.email || "",
                    phone: admin.phoneNumber || admin.phone || "",
                    avatar: admin.avatar ? (admin.avatar.startsWith('http') ? admin.avatar : `${baseUrl}/${admin.avatar}`) : "",
                };
                setUserProfile(newProfile);
                localStorage.setItem("adminProfile", JSON.stringify({ ...admin, ...newProfile }));
            }

            if (statsRes.status === 'fulfilled' && statsRes.value.data) {
                const statsData = statsRes.value.data.stats || statsRes.value.data;
                // Transform backend stats to match frontend interface
                const formattedStats = {
                    totalReports: statsData.totalReports,
                    totalReportsByHazardType: statsData.reportsByHazardType || {},
                    totalReportsByStatus: statsData.reportsByStatus ? 
                        statsData.reportsByStatus.reduce((acc: any, item: any) => {
                            acc[item._id] = item.count;
                            return acc;
                        }, {}) : {},
                    totalReportsByCity: statsData.reportsByCity ? 
                        statsData.reportsByCity.reduce((acc: any, item: any) => {
                            acc[item._id] = item.count;
                            return acc;
                        }, {}) : {},
                    totalReportsByCountry: statsData.reportsByCountry ? 
                        statsData.reportsByCountry.reduce((acc: any, item: any) => {
                            acc[item._id] = item.count;
                            return acc;
                        }, {}) : {},
                    reportsByMonth: statsData.reportsByMonth || [],
                    topReporter: statsData.reportsByUser && statsData.reportsByUser.length > 0 ? 
                        statsData.reportsByUser[0].userDetails?.userName || 'Unknown' : 'Unknown'
                };
                setReportStats(formattedStats);
            }
        } catch (error) {
            console.error("Error refreshing dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                await refreshData();
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            }
        };
        loadData();
    }, []);

    const generateDate = () => {
        const d = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };

    const generateTime = () => {
        const d = new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const addReport = useCallback(async (report: CreateReportData & { images?: File[] }): Promise<Report> => {
        try {
            await apiCreateReport(report, report.images);
            // Refresh to get the actual created report from backend
            await refreshData();
            return {
                id: 'temp',
                title: report.title,
                location: report.location,
                name: 'Admin',
                date: generateDate(),
                time: generateTime(),
                status: 'open',
                category: report.hazardtype
            };
        } catch (error) {
            console.error('Error creating report:', error);
            throw error;
        }
    }, [refreshData]);

    const addAnnouncement = useCallback(async (announcement: CreateAnnouncementData & { attachments?: File[] }): Promise<Announcement> => {
        try {
            const created = await announcementApi.createAnnouncement(announcement, announcement.attachments || []);
            // Refresh to get the actual data from backend
            await refreshData();
            return {
                id: typeof created.id === 'string' ? parseInt(created.id) : (created.id || Date.now()),
                title: created.title,
                detail: created.detail,
                date: generateDate(),
                time: generateTime(),
                category: created.category || announcement.category,
                status: created.status || announcement.status,
                location: created.location,
                attachments: created.attachments
            };
        } catch (error) {
            console.error('Error creating announcement:', error);
            throw error;
        }
    }, [refreshData]);

    const updateReport = useCallback(async (id: string, updates: Partial<Report>) => {
        try {
            // Call API to update report status if status is being updated
            if (updates.status) {
                await apiUpdateReportStatus(id, updates.status);
            }
            // Update local state after successful API call
            setReports(prev => prev.map(report =>
                report.id === id ? { ...report, ...updates } : report
            ));
            // Refresh data to ensure stats are updated across all views
            await refreshData();
        } catch (error) {
            console.error('Error updating report:', error);
            throw error;
        }
    }, [refreshData]);

    const updateAnnouncement = useCallback(async (id: number, updates: Partial<Announcement>) => {
        try {
            // Convert updates to UpdateAnnouncementData format
            const apiUpdates: UpdateAnnouncementData = {};
            if (updates.title) apiUpdates.title = updates.title;
            if (updates.detail) apiUpdates.detail = updates.detail;
            if (updates.category) apiUpdates.category = updates.category as 'Alert' | 'Info' | 'Update';
            if (updates.status) apiUpdates.status = updates.status as 'Pinned' | 'Active' | 'Archived';
            if (updates.location) apiUpdates.location = updates.location;

            // Call API to update announcement
            await announcementApi.updateAnnouncement(String(id), apiUpdates);
            // Update local state after successful API call
            setAnnouncements(prev => prev.map(announcement =>
                announcement.id === id ? { ...announcement, ...updates } : announcement
            ));
        } catch (error) {
            console.error('Error updating announcement:', error);
            throw error;
        }
    }, []);

    const deleteReport = useCallback(async (id: string) => {
        try {
            // Call API to delete report
            await apiDeleteReport(id);
            // Update local state after successful API call
            setReports(prev => prev.filter(report => report.id !== id));
            // Refresh data to ensure stats are updated across all views
            await refreshData();
        } catch (error) {
            console.error('Error deleting report:', error);
            throw error;
        }
    }, [refreshData]);

    const deleteAnnouncement = useCallback(async (id: number) => {
        try {
            // Call API to delete announcement
            await announcementApi.deleteAnnouncement(String(id));
            // Update local state after successful API call
            setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
        } catch (error) {
            console.error('Error deleting announcement:', error);
            throw error;
        }
    }, []);

    const updateUserProfile = useCallback(async (updates: Omit<Partial<UserProfile>, 'avatar'> & { avatar?: File }) => {
        try {
            const formData = new FormData();
            if (updates.name) formData.append('userName', updates.name);
            if (updates.email) formData.append('email', updates.email);
            if (updates.phone) formData.append('phoneNumber', updates.phone);
            if (updates.avatar) formData.append('avatar', updates.avatar);

            const response = await apiUpdateAdminProfile(formData);
            // Refresh profile from backend response to get updated avatar URL from Cloudinary
            const updatedUser = response.data?.user;
            if (updatedUser) {
                const newProfile: UserProfile = {
                    name: updatedUser.userName || updates.name || '',
                    email: updatedUser.email || updates.email || '',
                    phone: updatedUser.phoneNumber || updates.phone || '',
                    avatar: updatedUser.avatar ? (updatedUser.avatar.startsWith('http') ? updatedUser.avatar : `${baseUrl}/${updatedUser.avatar}`) : '',
                };
                setUserProfile(newProfile);
                localStorage.setItem("adminProfile", JSON.stringify({ ...updatedUser, ...newProfile }));
            } else {
                setUserProfile(prev => ({ ...prev, ...updates, avatar: updates.avatar ? undefined : prev.avatar }));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }, []);

    const mapBackendUser = (backendUser: BackendUser): User => {
        const createdAt = backendUser.createdAt ? new Date(backendUser.createdAt) : new Date();
        const isActive = backendUser.isActive ?? true;
        const isVerified = backendUser.isVerified ?? false;
        
        let status: 'Active' | 'Pending' | 'Suspended' = 'Active';
        if (!isActive) {
            status = 'Suspended';
        } else if (!isVerified) {
            status = 'Pending';
        }

        return {
            id: backendUser._id,
            name: backendUser.userName,
            email: backendUser.email,
            phone: backendUser.phoneNumber,
            date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reports: backendUser.reportsCount || 0,
            status,
            role: backendUser.role || 'user',
            avatar: backendUser.avatar ? (backendUser.avatar.startsWith('http') ? backendUser.avatar : `${baseUrl}/${backendUser.avatar}`) : undefined,
            address: undefined,
            lastActive: undefined,
        };
    };

    const refreshUsers = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setIsLoadingUsers(true);
        try {
            const backendUsers = await userApi.getAllUsers();
            if (!Array.isArray(backendUsers)) return;
            const mappedUsers = backendUsers.map(mapBackendUser);
            setUsers(mappedUsers);
        } catch (error: any) {
            console.error('Error fetching users:', error.message);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    const updateUser = useCallback(async (id: string, updates: Partial<User> & { avatar?: File }) => {
        try {
            const backendUpdates: Parameters<typeof userApi.updateUser>[1] = {};
            if (updates.name) backendUpdates.userName = updates.name;
            if (updates.email) backendUpdates.email = updates.email;
            if (updates.phone) backendUpdates.phoneNumber = updates.phone;
            if (updates.status) {
                backendUpdates.isActive = updates.status !== 'Suspended';
                backendUpdates.isVerified = updates.status !== 'Pending';
            }
            if (updates.avatar) backendUpdates.avatar = updates.avatar;

            await userApi.updateUser(id, backendUpdates);
            await refreshUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    }, [refreshUsers]);

    const deleteUser = useCallback(async (id: string) => {
        try {
            await userApi.deleteUser(id);
            await refreshUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    }, [refreshUsers]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        reports,
        announcements,
        users,
        userProfile,
        reportStats,
        addReport,
        addAnnouncement,
        updateReport,
        updateAnnouncement,
        deleteReport,
        deleteAnnouncement,
        updateUserProfile,
        refreshData,
        refreshUsers,
        updateUser,
        deleteUser,
        isLoading,
        isLoadingUsers
    }), [reports, announcements, users, userProfile, reportStats, addReport, addAnnouncement, updateReport, updateAnnouncement, deleteReport, deleteAnnouncement, updateUserProfile, refreshData, refreshUsers, updateUser, deleteUser, isLoading, isLoadingUsers]);

    return (
        <DashboardContext.Provider value={contextValue}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};
