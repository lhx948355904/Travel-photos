import request from "./request";
import type { CosUploadResult } from "../types";

interface UploadOptions {
  onProgress?: (percent: number) => void;
  timeout?: number;
}

const createUploadConfig = (options: UploadOptions) => ({
  timeout: options.timeout ?? 120000,
  onUploadProgress: (event: any) => {
    if (!event.total) return;
    const percent = Math.min(
      80,
      Math.max(1, Math.round((event.loaded / event.total) * 80)),
    );
    options.onProgress?.(percent);
  },
});

const createUploadFormData = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

const isNetworkError = (error: any) => {
  return (
    error?.code === "ERR_NETWORK" ||
    error?.message === "Network Error" ||
    error?.message?.includes("网络连接失败")
  );
};

const getLocalBackendUploadUrl = () => {
  if (typeof window === "undefined") return null;
  const { hostname, protocol } = window.location;
  if (!["localhost", "127.0.0.1"].includes(hostname)) return null;
  const backendHost = hostname === "localhost" ? "127.0.0.1" : hostname;
  return `${protocol}//${backendHost}:8080/api/cos/upload`;
};

export const uploadToCos = (
  file: File,
  options: UploadOptions = {},
): Promise<CosUploadResult> => {
  const config = createUploadConfig(options);
  const postUpload = (url: string) => {
    return request.post(
      url,
      createUploadFormData(file),
      config,
    ) as Promise<CosUploadResult>;
  };

  return postUpload("/cos/upload").catch((error) => {
    const fallbackUrl = getLocalBackendUploadUrl();
    if (!fallbackUrl || !isNetworkError(error)) {
      return Promise.reject(error);
    }
    options.onProgress?.(1);
    return postUpload(fallbackUrl);
  });
};
