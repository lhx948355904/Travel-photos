import { useEffect, useRef, useState } from "react";
import { Button, DatePicker, Form, Input, message, Modal, Upload } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd/es/upload";
import dayjs from "dayjs";
import { useExif } from "./useExif";
import { uploadToCos } from "../../api/cos";
import { addPhotos, createLocation, updateLocation } from "../../api/location";
import { getOrientation, getThumbnailUrl } from "../../utils/image";
import type { Location, PhotoUploadInfo } from "../../types";

interface UploadPanelProps {
  open: boolean;
  onClose: () => void;
  initialLng?: number;
  initialLat?: number;
  initialName?: string;
  editingLocation?: Location | null;
  onSuccess: (location?: { name: string; lng: number; lat: number }) => void;
}

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  url?: string;
  thumbUrl?: string;
  cosKey?: string;
  width?: number;
  height?: number;
  orientation?: string;
  fileSize?: number;
  shotDate?: string;
  uploading?: boolean;
  percent?: number;
  error?: string;
}

const createUploadId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isHeicFile = (file: File) => {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type.includes("heic") ||
    type.includes("heif")
  );
};

const convertHeicToJpeg = async (file: File) => {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const convertedName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([blob], convertedName, { type: "image/jpeg" });
};

const readImageMeta = (
  file: File,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };
    img.src = objectUrl;
  });
};

const UploadPanel = ({
  open,
  onClose,
  initialLng,
  initialLat,
  initialName,
  editingLocation,
  onSuccess,
}: UploadPanelProps) => {
  const [form] = Form.useForm();
  const { readExif } = useExif();
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coordinateSource, setCoordinateSource] =
    useState("待选择地图坐标");
  const uploadItemsRef = useRef<UploadItem[]>([]);
  const watchedLongitude = Form.useWatch("longitude", form);
  const watchedLatitude = Form.useWatch("latitude", form);
  const hasCoordinate =
    Number.isFinite(Number(watchedLongitude)) &&
    Number.isFinite(Number(watchedLatitude));

  useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

  useEffect(() => {
    return () => {
      uploadItemsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editingLocation) {
      form.setFieldsValue({
        name: editingLocation.name,
        longitude: editingLocation.longitude,
        latitude: editingLocation.latitude,
        travelDate: editingLocation.travelDate
          ? dayjs(editingLocation.travelDate)
          : undefined,
        description: editingLocation.description,
      });
      setCoordinateSource("已使用当前地点坐标");
      return;
    }

    form.setFieldsValue({
      name: initialName,
      longitude: initialLng,
      latitude: initialLat,
      travelDate: undefined,
      description: undefined,
    });
    setCoordinateSource(
      initialLng !== undefined && initialLat !== undefined
        ? initialName
          ? "已使用搜索地点坐标"
          : "已记录地图点击坐标"
        : "待选择地图坐标",
    );
  }, [editingLocation, form, initialLat, initialLng, initialName, open]);

  const updateUploadItem = (id: string, patch: Partial<UploadItem>) => {
    setUploadItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const uploadSingleItem = async (id: string, file: File) => {
    updateUploadItem(id, { uploading: true, percent: 0, error: undefined });

    try {
      updateUploadItem(id, { percent: 30 });
      const uploaded = await uploadToCos(file);
      updateUploadItem(id, { percent: 85 });
      const meta = await readImageMeta(file);

      updateUploadItem(id, {
        url: uploaded.url,
        thumbUrl: getThumbnailUrl(uploaded.url, 600),
        cosKey: uploaded.cosKey,
        width: meta.width,
        height: meta.height,
        orientation: getOrientation(meta.width, meta.height),
        uploading: false,
        percent: 100,
        error: undefined,
      });
    } catch (err: any) {
      const error = err.message || "上传失败，请重试";
      updateUploadItem(id, { uploading: false, error });
      message.error(`${file.name} ${error}`);
    }
  };

  const addUploadFile = (file: File, exifSource: File = file) => {
    const id = createUploadId();
    const previewUrl = URL.createObjectURL(file);

    setUploadItems((prev) => [
      ...prev,
      {
        id,
        file,
        previewUrl,
        fileSize: file.size,
      },
    ]);

    void readExif(exifSource).then((exifData) => {
      updateUploadItem(id, { shotDate: exifData.shotDate });

      if (
        exifData.longitude &&
        exifData.latitude &&
        !form.getFieldValue("longitude")
      ) {
        form.setFieldsValue({
          longitude: exifData.longitude,
          latitude: exifData.latitude,
        });
        setCoordinateSource("已从照片 EXIF 读取坐标");
      }

      if (exifData.shotDate && !form.getFieldValue("travelDate")) {
        form.setFieldValue("travelDate", dayjs(exifData.shotDate));
      }
    });

    void uploadSingleItem(id, file);
  };

  const prepareAndAddUploadFile = async (file: File) => {
    if (!isHeicFile(file)) {
      addUploadFile(file);
      return;
    }

    const convertedFile = await convertHeicToJpeg(file);
    addUploadFile(convertedFile, file);
  };

  const beforeUpload = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isImage =
      file.type.startsWith("image/") ||
      lowerName.endsWith(".heic") ||
      lowerName.endsWith(".heif");
    if (!isImage) {
      message.error("只能上传图片文件");
      return Upload.LIST_IGNORE;
    }

    const isLt20M = file.size / 1024 / 1024 < 20;
    if (!isLt20M) {
      message.error("图片大小不能超过 20MB");
      return Upload.LIST_IGNORE;
    }

    void prepareAndAddUploadFile(file).catch((err: any) => {
      message.error(err.message || "HEIC 照片转换失败，请换一张 JPG/PNG 照片");
    });
    return Upload.LIST_IGNORE;
  };

  const uploadPendingItems = async (items: UploadItem[]) => {
    const pendingCount = items.filter((item) => !item.url).length;
    if (pendingCount === 0) return items;

    const nextItems = [...items];

    for (let i = 0; i < nextItems.length; i += 1) {
      const item = nextItems[i];
      if (item.url || item.uploading) continue;

      nextItems[i] = { ...item, uploading: true, percent: 0, error: undefined };
      setUploadItems([...nextItems]);

      try {
        const uploaded = await uploadToCos(item.file);
        nextItems[i] = { ...nextItems[i], percent: 85 };
        setUploadItems([...nextItems]);
        const meta = await readImageMeta(item.file);

        nextItems[i] = {
          ...nextItems[i],
          url: uploaded.url,
          thumbUrl: getThumbnailUrl(uploaded.url, 600),
          cosKey: uploaded.cosKey,
          width: meta.width,
          height: meta.height,
          orientation: getOrientation(meta.width, meta.height),
          uploading: false,
          percent: 100,
        };
        setUploadItems([...nextItems]);
      } catch (err: any) {
        nextItems[i] = {
          ...nextItems[i],
          uploading: false,
          error: err.message || "上传失败",
        };
        setUploadItems([...nextItems]);
        throw new Error(err.message || `上传失败：${item.file.name}`);
      }
    }

    return nextItems;
  };

  const handleUploadAll = async () => {
    const retryableItems = uploadItems.filter(
      (item) => !item.url && !item.uploading,
    );
    if (retryableItems.length === 0) {
      message.warning(
        uploadItems.length > 0 ? "照片仍在上传，请稍等" : "请先选择照片",
      );
      return;
    }

    setUploading(true);
    try {
      const nextItems = await uploadPendingItems(uploadItems);
      setUploadItems(nextItems);
      message.success("上传完成");
    } catch (err: any) {
      message.error(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const item = uploadItems[index];
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
    }

    setUploadItems((prev) => prev.filter((_, i) => i !== index));
    if (coverIndex === index) {
      setCoverIndex(0);
    } else if (coverIndex > index) {
      setCoverIndex(coverIndex - 1);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const longitude = Number(values.longitude);
    const latitude = Number(values.latitude);

    if (uploadItems.some((item) => item.uploading)) {
      message.warning("照片仍在上传，请稍等");
      return;
    }

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      message.error("请先在地图上选择地点，或上传带 GPS 的照片");
      return;
    }

    setSubmitting(true);
    try {
      const uploadedItems = await uploadPendingItems(uploadItems);
      const photos = uploadedItems
        .filter((item) => item.url)
        .map<PhotoUploadInfo>((item) => ({
          cosKey: item.cosKey!,
          url: item.url!,
          thumbUrl: item.thumbUrl!,
          width: item.width || 0,
          height: item.height || 0,
          orientation: item.orientation as any,
          fileSize: item.fileSize!,
          shotDate: item.shotDate,
        }));

      if (photos.length === 0 && !editingLocation) {
        message.error("请至少上传一张照片");
        return;
      }

      const payload = {
        name: values.name,
        description: values.description,
        longitude,
        latitude,
        travelDate: values.travelDate?.format("YYYY-MM-DD"),
      };

      if (editingLocation) {
        if (photos.length > 0) {
          await addPhotos(editingLocation.id, photos);
        }
        await updateLocation(editingLocation.id, payload);
        message.success("更新成功");
      } else {
        await createLocation({
          ...payload,
          coverIndex,
          photos,
        });
        message.success("创建成功");
      }

      onSuccess({
        name: values.name,
        lng: longitude,
        lat: latitude,
      });
      handleClose();
    } catch (err: any) {
      message.error(err.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    uploadItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setUploadItems([]);
    setCoverIndex(0);
    setUploading(false);
    onClose();
  };

  const uploadProps: UploadProps = {
    beforeUpload,
    showUploadList: false,
    multiple: true,
    accept: "image/*,.heic,.heif",
  };

  const hasPendingFiles = uploadItems.some(
    (item) => !item.url && !item.uploading,
  );

  return (
    <Modal
      title={editingLocation ? "编辑地点" : "添加地点"}
      open={open}
      onCancel={handleClose}
      mask={false}
      width={720}
      className="upload-location-modal"
      rootClassName="upload-location-modal-root"
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
        >
          {editingLocation ? "保存" : "创建"}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="地点名称"
          rules={[{ required: true, message: "请输入地点名称" }]}
        >
          <Input placeholder="例如：京都清水寺" />
        </Form.Item>

        <Form.Item
          name="longitude"
          hidden
          rules={[
            {
              required: true,
              message: "请先在地图上选择地点，或上传带 GPS 的照片",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="latitude"
          hidden
          rules={[
            {
              required: true,
              message: "请先在地图上选择地点，或上传带 GPS 的照片",
            },
          ]}
        >
          <Input />
        </Form.Item>

        <div className={`coordinate-status ${hasCoordinate ? "ready" : "pending"}`}>
          <span>{hasCoordinate ? coordinateSource : "待选择地图坐标"}</span>
          <small>
            {hasCoordinate
              ? "坐标会随地点一起保存，用于地图回显。"
              : "点击地图、选择搜索地点，或上传带 GPS 的照片后会自动记录。"}
          </small>
        </div>

        <Form.Item name="travelDate" label="旅行日期">
          <DatePicker style={{ width: "100%" }} placeholder="选择日期" />
        </Form.Item>

        <Form.Item name="description" label="地点描述">
          <Input.TextArea rows={3} placeholder="描述一下这个地方" />
        </Form.Item>

        <Form.Item label="上传照片">
          <div className="upload-preview-list">
            {uploadItems.map((item, index) => (
              <div
                key={item.id}
                className={`upload-preview-item ${
                  coverIndex === index ? "selected" : ""
                }`}
                onClick={() => setCoverIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setCoverIndex(index);
                  }
                }}
              >
                <img src={item.thumbUrl || item.url || item.previewUrl} alt="" />
                {!item.url && (
                  <div className={`upload-status ${item.error ? "error" : ""}`}>
                    {item.error
                      ? "上传失败"
                      : item.uploading
                        ? `${item.percent || 0}%`
                        : "待上传"}
                  </div>
                )}
                {coverIndex === index && <span className="cover-badge">封面</span>}
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  className="upload-remove"
                  aria-label="移除照片"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemove(index);
                  }}
                />
              </div>
            ))}
            <Upload {...uploadProps}>
              <div className="upload-add" aria-label="选择照片">
                <PlusOutlined />
              </div>
            </Upload>
          </div>

          <Button
            icon={<UploadOutlined />}
            onClick={handleUploadAll}
            loading={uploading}
            disabled={!hasPendingFiles}
          >
            开始上传
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UploadPanel;
