import { AxiosResponse } from "axios";
import { apiClient } from "./config";

export interface CreateReportData {
  title: string;
  hazardtype: string;
  description: string;
  location: string;
  city: string;
  country: string;
}

export interface ReportStats {
  totalReports: number;
  totalReportsByHazardType: Record<string, number>;
  totalReportsByStatus: Record<string, number>;
  totalReportsByCity: Record<string, number>;
  totalReportsByCountry: Record<string, number>;
  reportsByMonth: Array<{ month: string; count: number }>;
  topReporter: string;
}

export const apiGetAllReports = async (): Promise<AxiosResponse> => {
  try {
    return await apiClient.get("/api/admin/reports");
  } catch (error) {
    throw new Error(`Failed to fetch reports: ${error}`);
  }
};

export const apiGetReportStats = async (): Promise<AxiosResponse> => {
  try {
    return await apiClient.get("/api/admin/reports/stats");
  } catch (error) {
    throw new Error(`Failed to fetch report stats: ${error}`);
  }
};

export const apiCreateReport = async (
  data: CreateReportData,
  images?: File[]
): Promise<AxiosResponse> => {
  try {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("hazardtype", data.hazardtype);
    formData.append("description", data.description);
    formData.append("location", data.location);
    formData.append("city", data.city);
    formData.append("country", data.country);

    images?.forEach((file) => {
      formData.append("images", file);
    });

    return await apiClient.post("/hazard/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (error) {
    throw new Error(`Failed to create report: ${error}`);
  }
};

export const apiUpdateReportStatus = async (
  id: string,
  status: string
): Promise<AxiosResponse> => {
  try {
    return await apiClient.patch(`/api/admin/reports/${id}/status`, { status });
  } catch (error) {
    throw new Error(`Failed to update report status: ${error}`);
  }
};

export const apiDeleteReport = async (id: string): Promise<AxiosResponse> => {
  try {
    return await apiClient.delete(`/hazard/delete/${id}`);
  } catch (error) {
    throw new Error(`Failed to delete report: ${error}`);
  }
};
