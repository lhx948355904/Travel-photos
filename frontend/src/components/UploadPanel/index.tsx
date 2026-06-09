import { useState, useCallback } from 'react'
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
  const [submitting, setSubmitting] = useState(false)

  const beforeUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')
    if (!isImage) {
      message.error('只能上传图片文件')
      return false
    }
    const isLt20M = file.size / 1024 / 1024 < 20
    if (!isLt20M) {
      message.error('图片大小不能超过 20MB')
      return false
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

  const handleUploadAll = async () => {
    if (uploadItems.length === 0) return

    try {
      const cred = await getCosCredential()

      const newItems = [...uploadItems]

      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i]
        if (item.url) continue

        newItems[i] = { ...item, uploading: true, percent: 0 }
        setUploadItems([...newItems])

        const ext = item.file.name.split('.').pop() || 'jpg'
        const key = `${cred.allowPrefix.replace('/*', '')}/${Date.now()}_${i}.${ext}`

        try {
          const url = await uploadFile(cred, item.file, key, (percent) => {
            newItems[i] = { ...newItems[i], percent }
            setUploadItems([...newItems])
          })

          const img = new Image()
          img.src = URL.createObjectURL(item.file)
          await new Promise<void>((resolve) => {
            img.onload = () => {
              newItems[i] = {
                ...newItems[i],
                url,
                thumbUrl: getThumbnailUrl(url, 600),
                cosKey: key,
                width: img.width,
                height: img.height,
                orientation: getOrientation(img.width, img.height),
                uploading: false,
              }
              resolve()
            }
          })
        } catch (err) {
          message.error(`上传失败: ${item.file.name}`)
          newItems[i] = { ...newItems[i], uploading: false }
        }
      }

      setUploadItems([...newItems])
    } catch (err: any) {
      message.error('获取上传凭证失败')
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
    const uploadedItems = uploadItems.filter((item) => item.url)

    if (uploadedItems.length === 0 && !editingLocation) {
      message.error('请至少上传一张照片')
      return
    }

    setSubmitting(true)
    try {
      const photos: PhotoUploadInfo[] = uploadedItems.map((item) => ({
        cosKey: item.cosKey!,
        url: item.url!,
        thumbUrl: item.thumbUrl!,
        width: item.width!,
        height: item.height!,
        orientation: item.orientation as any,
        fileSize: item.fileSize!,
        shotDate: item.shotDate,
      }))

      if (editingLocation) {
        if (photos.length > 0) {
          await addPhotos(editingLocation.id, photos)
        }
        await updateLocation(editingLocation.id, {
          name: values.name,
          description: values.description,
          travelDate: values.travelDate?.format('YYYY-MM-DD'),
        })
        message.success('更新成功')
      } else {
        await createLocation({
          name: values.name,
          description: values.description,
          longitude: values.longitude,
          latitude: values.latitude,
          travelDate: values.travelDate?.format('YYYY-MM-DD'),
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
    onClose()
  }

  const uploadProps: UploadProps = {
    beforeUpload,
    showUploadList: false,
    multiple: true,
    accept: 'image/*,.heic',
  }

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
      <Form form={form} layout="vertical" initialValues={{ longitude: initialLng, latitude: initialLat, name: initialName }}>
        <Form.Item name="name" label="地点名称" rules={[{ required: true }]}>
          <Input placeholder="请输入地点名称" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="longitude" label="经度" rules={[{ required: true }]}>
              <Input type="number" placeholder="经度" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="latitude" label="纬度" rules={[{ required: true }]}>
              <Input type="number" placeholder="纬度" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="travelDate" label="旅行日期">
          <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
        </Form.Item>

        <Form.Item name="description" label="地点描述">
          <Input.TextArea rows={3} placeholder="描述一下这个地方..." />
        </Form.Item>

        <Form.Item label="上传照片">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {uploadItems.map((item, index) => (
              <div
                key={index}
                className={`upload-preview-item ${coverIndex === index ? 'selected' : ''}`}
                style={{ width: 100, height: 100, position: 'relative' }}
                onClick={() => setCoverIndex(index)}
              >
                {item.url ? (
                  <img
                    src={item.thumbUrl || item.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: '#999',
                    }}
                  >
                    {item.uploading ? `${item.percent}%` : '待上传'}
                  </div>
                )}
                {coverIndex === index && <span className="cover-badge">封面</span>}
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  style={{ position: 'absolute', top: 0, right: 0, padding: 2 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(index)
                  }}
                />
              </div>
            ))}
            <Upload {...uploadProps}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  border: '2px dashed #d9d9d9',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.3s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1890ff')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#d9d9d9')}
              >
                <PlusOutlined style={{ fontSize: 20, color: '#999' }} />
              </div>
            </Upload>
          </div>
          {uploadItems.some((item) => !item.url) && (
            <Button icon={<UploadOutlined />} onClick={handleUploadAll}>
              开始上传
            </Button>
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default UploadPanel
