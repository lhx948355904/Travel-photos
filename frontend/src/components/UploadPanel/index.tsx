import { useEffect, useState } from 'react'
import {
  Modal,
  Upload,
  Button,
  Input,
  Form,
  DatePicker,
  message,
  Row,
  Col,
} from 'antd'
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd/es/upload'
import dayjs from 'dayjs'
import { useExif } from './useExif'
import { getCosCredential } from '../../api/cos'
import { createLocation, addPhotos, updateLocation } from '../../api/location'
import { uploadFile } from '../../utils/cosUpload'
import { getOrientation, getThumbnailUrl } from '../../utils/image'
import type { Location, PhotoUploadInfo } from '../../types'

interface UploadPanelProps {
  open: boolean
  onClose: () => void
  initialLng?: number
  initialLat?: number
  initialName?: string
  editingLocation?: Location | null
  onSuccess: () => void
}

interface UploadItem {
  file: File
  url?: string
  thumbUrl?: string
  cosKey?: string
  width?: number
  height?: number
  orientation?: string
  fileSize?: number
  shotDate?: string
  uploading?: boolean
  percent?: number
}

const readImageMeta = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: 0, height: 0 })
    }
    img.src = objectUrl
  })
}

const UploadPanel = ({
  open,
  onClose,
  initialLng,
  initialLat,
  initialName,
  editingLocation,
  onSuccess,
}: UploadPanelProps) => {
  const [form] = Form.useForm()
  const { readExif } = useExif()
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [coverIndex, setCoverIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    if (editingLocation) {
      form.setFieldsValue({
        name: editingLocation.name,
        longitude: editingLocation.longitude,
        latitude: editingLocation.latitude,
        travelDate: editingLocation.travelDate ? dayjs(editingLocation.travelDate) : undefined,
        description: editingLocation.description,
      })
      return
    }

    form.setFieldsValue({
      name: initialName,
      longitude: initialLng,
      latitude: initialLat,
      travelDate: undefined,
      description: undefined,
    })
  }, [editingLocation, form, initialLat, initialLng, initialName, open])

  const beforeUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')
    if (!isImage) {
      message.error('只能上传图片文件')
      return Upload.LIST_IGNORE
    }

    const isLt20M = file.size / 1024 / 1024 < 20
    if (!isLt20M) {
      message.error('图片大小不能超过 20MB')
      return Upload.LIST_IGNORE
    }

    const exifData = await readExif(file)
    setUploadItems((prev) => [
      ...prev,
      {
        file,
        shotDate: exifData.shotDate,
        fileSize: file.size,
      },
    ])

    if (exifData.longitude && exifData.latitude && !form.getFieldValue('longitude')) {
      form.setFieldsValue({
        longitude: exifData.longitude,
        latitude: exifData.latitude,
      })
    }

    if (exifData.shotDate && !form.getFieldValue('travelDate')) {
      form.setFieldValue('travelDate', dayjs(exifData.shotDate))
    }

    return false
  }

  const uploadPendingItems = async (items: UploadItem[]) => {
    const pendingCount = items.filter((item) => !item.url).length
    if (pendingCount === 0) return items

    const cred = await getCosCredential()
    const nextItems = [...items]

    for (let i = 0; i < nextItems.length; i++) {
      const item = nextItems[i]
      if (item.url) continue

      nextItems[i] = { ...item, uploading: true, percent: 0 }
      setUploadItems([...nextItems])

      const ext = item.file.name.split('.').pop() || 'jpg'
      const key = `${cred.allowPrefix.replace('/*', '')}/${Date.now()}_${i}.${ext}`

      try {
        const url = await uploadFile(cred, item.file, key, (percent) => {
          nextItems[i] = { ...nextItems[i], percent }
          setUploadItems([...nextItems])
        })
        const meta = await readImageMeta(item.file)

        nextItems[i] = {
          ...nextItems[i],
          url,
          thumbUrl: getThumbnailUrl(url, 600),
          cosKey: key,
          width: meta.width,
          height: meta.height,
          orientation: getOrientation(meta.width, meta.height),
          uploading: false,
          percent: 100,
        }
        setUploadItems([...nextItems])
      } catch (err: any) {
        nextItems[i] = { ...nextItems[i], uploading: false }
        setUploadItems([...nextItems])
        throw new Error(err.message || `上传失败：${item.file.name}`)
      }
    }

    return nextItems
  }

  const handleUploadAll = async () => {
    if (uploadItems.length === 0) {
      message.warning('请先选择照片')
      return
    }

    setUploading(true)
    try {
      const nextItems = await uploadPendingItems(uploadItems)
      setUploadItems(nextItems)
      message.success('上传完成')
    } catch (err: any) {
      message.error(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (index: number) => {
    setUploadItems((prev) => prev.filter((_, i) => i !== index))
    if (coverIndex === index) {
      setCoverIndex(0)
    } else if (coverIndex > index) {
      setCoverIndex(coverIndex - 1)
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()

    setSubmitting(true)
    try {
      const uploadedItems = await uploadPendingItems(uploadItems)
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
        }))

      if (photos.length === 0 && !editingLocation) {
        message.error('请至少上传一张照片')
        return
      }

      const payload = {
        name: values.name,
        description: values.description,
        longitude: Number(values.longitude),
        latitude: Number(values.latitude),
        travelDate: values.travelDate?.format('YYYY-MM-DD'),
      }

      if (editingLocation) {
        if (photos.length > 0) {
          await addPhotos(editingLocation.id, photos)
        }
        await updateLocation(editingLocation.id, payload)
        message.success('更新成功')
      } else {
        await createLocation({
          ...payload,
          coverIndex,
          photos,
        })
        message.success('创建成功')
      }

      onSuccess()
      handleClose()
    } catch (err: any) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    form.resetFields()
    setUploadItems([])
    setCoverIndex(0)
    setUploading(false)
    onClose()
  }

  const uploadProps: UploadProps = {
    beforeUpload,
    showUploadList: false,
    multiple: true,
    accept: 'image/*,.heic',
  }

  const hasPendingFiles = uploadItems.some((item) => !item.url)

  return (
    <Modal
      title={editingLocation ? '编辑地点' : '添加地点'}
      open={open}
      onCancel={handleClose}
      width={720}
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
          {editingLocation ? '保存' : '创建'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="地点名称" rules={[{ required: true, message: '请输入地点名称' }]}>
          <Input placeholder="请输入地点名称" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="longitude" label="经度" rules={[{ required: true, message: '请输入经度' }]}>
              <Input type="number" placeholder="经度" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="latitude" label="纬度" rules={[{ required: true, message: '请输入纬度' }]}>
              <Input type="number" placeholder="纬度" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="travelDate" label="旅行日期">
          <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
        </Form.Item>

        <Form.Item name="description" label="地点描述">
          <Input.TextArea rows={3} placeholder="描述一下这个地方" />
        </Form.Item>

        <Form.Item label="上传照片">
          <div className="upload-preview-list">
            {uploadItems.map((item, index) => (
              <div
                key={`${item.file.name}-${index}`}
                className={`upload-preview-item ${coverIndex === index ? 'selected' : ''}`}
                onClick={() => setCoverIndex(index)}
              >
                {item.url ? (
                  <img src={item.thumbUrl || item.url} alt="" />
                ) : (
                  <div className="upload-waiting">
                    {item.uploading ? `${item.percent || 0}%` : '待上传'}
                  </div>
                )}
                {coverIndex === index && <span className="cover-badge">封面</span>}
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  className="upload-remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(index)
                  }}
                />
              </div>
            ))}
            <Upload {...uploadProps}>
              <div className="upload-add">
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
  )
}

export default UploadPanel
