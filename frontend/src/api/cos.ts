import request from "./request";
import type { CosCredential, CosUploadResult } from "../types";
import { uploadFile } from "../utils/cosUpload";

interface UploadOptions {
  onProgress?: (percent: number) => void;
  timeout?: number;
}

const createUploadConfig = (options: UploadOptions) => ({
  timeout: options.timeout ?? 0,
  onUploadProgress: (event: any) => {
    if (!event.total) return;
    const percent = Math.min(
      80,
      Math.max(1, Math.round((event.loaded / event.total) * 80)),
    );
    options.onProgress?.(percent);
  },
});

const RESUME_CACHE_KEY = "photo-map-resumable-upload-keys-v1";
const RESUME_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

interface CachedObjectKey {
  key: string;
  createdAt: number;
}

const getCredential = (): Promise<CosCredential> => request.get("/cos/credential");

const getFileFingerprint = (file: File) =>
  [file.name, file.size, file.lastModified, file.type].join(":");

const readResumeCache = (): Record<string, CachedObjectKey> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESUME_CACHE_KEY) || "{}") as Record<string, CachedObjectKey>;
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value?.key && now - value.createdAt < RESUME_CACHE_TTL),
    );
  } catch {
    return {};
  }
};

const writeResumeCache = (cache: Record<string, CachedObjectKey>) => {
  try {
    localStorage.setItem(RESUME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage can be unavailable in private browsing. The current upload still works.
  }
};

const resolveExtension = (file: File) => {
  const match = file.name.toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  return match?.[1] || "jpg";
};

const getOrCreateObjectKey = (file: File, credential: CosCredential) => {
  const fingerprint = getFileFingerprint(file);
  const cache = readResumeCache();
  const existing = cache[fingerprint];
  if (existing?.key && existing.key.startsWith(credential.allowPrefix.replace(/\*+$/, ""))) {
    return { fingerprint, key: existing.key, resumed: true };
  }

  const prefix = credential.allowPrefix.replace(/\*+$/, "");
  const uploadId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `${prefix}${uploadId}.${resolveExtension(file)}`;
  cache[fingerprint] = { key, createdAt: Date.now() };
  writeResumeCache(cache);
  return { fingerprint, key, resumed: false };
};

const clearObjectKey = (fingerprint: string) => {
  const cache = readResumeCache();
  delete cache[fingerprint];
  writeResumeCache(cache);
};

const completeDirectUpload = (cosKey: string, fileSize: number): Promise<CosUploadResult> =>
  request.post("/cos/complete", { cosKey, fileSize });

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
  return getCredential().then(async (credential) => {
    const { fingerprint, key, resumed } = getOrCreateObjectKey(file, credential);
    if (resumed) {
      try {
        const completed = await completeDirectUpload(key, file.size);
        clearObjectKey(fingerprint);
        options.onProgress?.(100);
        return completed;
      } catch {
        // The object is not complete yet. Reusing the same key lets the SDK
        // find its cached UploadId and continue with the missing chunks.
      }
    }
    await uploadFile(credential, getCredential, file, key, options.onProgress);
    options.onProgress?.(97);
    const uploaded = await completeDirectUpload(key, file.size);
    clearObjectKey(fingerprint);
    options.onProgress?.(100);
    return uploaded;
  }).catch((credentialError) => {
    const status = credentialError?.status;
    if (status === 401 || status === 403) {
      return Promise.reject(credentialError);
    }

    // Local development can run without COS credentials. Only fall back when
    // acquiring credentials failed; direct-upload errors keep their resumable task.
    if (!credentialError || !String(credentialError.message || "").includes("COS 配置不完整")) {
      return Promise.reject(credentialError);
    }

    return uploadThroughBackend(file, options);
  });
};

const uploadThroughBackend = (
  file: File,
  options: UploadOptions,
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
