import { LocationData, Attachment } from './attachment';

export interface Announcement {
    id: number;
    title: string;
    detail: string;
    date: string;
    time: string;
    category: string;
    status: string;
    location?: LocationData;
    attachments?: Attachment[];
}

export interface CreateAnnouncementData {
    title: string;
    detail: string;
    category: 'Alert' | 'Info' | 'Update';
    status: 'Pinned' | 'Active' | 'Archived';
    pinToFeed: boolean;
    location?: LocationData;
}

export interface UpdateAnnouncementData extends Partial<CreateAnnouncementData> {
    keepAttachments?: boolean;
}