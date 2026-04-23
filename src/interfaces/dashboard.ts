import { Report } from './report';
import { Announcement } from './announcement';
import { User, UserProfile } from './user';
import { ReportStats, CreateReportData } from '../services/reports';
import { CreateAnnouncementData } from './announcement';

export interface DashboardContextType {
    reports: Report[];
    announcements: Announcement[];
    users: User[];
    userProfile: UserProfile;
    reportStats: ReportStats | null;
    addReport: (report: CreateReportData & { images?: File[] }) => Promise<Report>;
    addAnnouncement: (announcement: CreateAnnouncementData & { attachments?: File[] }) => Promise<Announcement>;
    updateReport: (id: string, updates: Partial<Report>) => void;
    updateAnnouncement: (id: number, updates: Partial<Announcement>) => void;
    deleteReport: (id: string) => void;
    deleteAnnouncement: (id: number) => void;
    updateUserProfile: (updates: Omit<Partial<UserProfile>, 'avatar'> & { avatar?: File }) => Promise<void>;
    refreshData: () => Promise<void>;
    refreshUsers: () => Promise<void>;
    updateUser: (id: string, updates: Partial<User> & { avatar?: File }) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    isLoading: boolean;
    isLoadingUsers: boolean;
}
