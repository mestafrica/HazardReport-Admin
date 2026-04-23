import { AxiosResponse } from "axios";
import { apiClient } from "./config";

export const apiAdminLogin = async (
  payload: object
): Promise<AxiosResponse> => {
  try {
    return await apiClient.post("/api/admin/signin", payload);
  } catch (error: any) {
    if (!error.response) {
      throw new Error("Cannot connect to server. Please make sure the backend is running on port 3001.");
    }
    throw new Error(error.response?.data?.message || "Login failed. Please check your credentials.");
  }
};
export const apiGetAdminProfile = async (): Promise<AxiosResponse> => {
  try {
    return await apiClient.get("/api/admin/profile");
  } catch (error) {
    throw new Error(`Failed to fetch admin profile: ${error}`);
  }
};

export const apiUpdateAdminProfile = async (
  payload: any
): Promise<AxiosResponse> => {
  try {
    // If payload is FormData (for avatar upload), axios handles it
    return await apiClient.patch("/api/admin/profile", payload, {
      headers: {
        "Content-Type": payload instanceof FormData ? "multipart/form-data" : "application/json",
      },
    });
  } catch (error) {
    throw new Error(`Failed to update admin profile: ${error}`);
  }
};
