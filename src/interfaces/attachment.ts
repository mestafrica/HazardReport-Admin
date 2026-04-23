export interface Attachment {
    url: string;
    filename: string;
    publicId: string;
    format: string;
}

export interface LocationData {
    text: string;
    city?: string;
    country?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}
