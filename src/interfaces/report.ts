import { LocationData } from './attachment';

export interface Report {
    id: string;
    title: string;
    location: string;
    name: string;
    date: string;
    time: string;
    status: string;
    category: string;
    attachmentName?: string;
    attachmentUrl?: string;
    locationData?: LocationData;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    reportType?: 'report' | 'announcement';
    announcementId?: number;
}
