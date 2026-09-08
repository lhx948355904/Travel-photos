import { Button, Popover } from 'antd'
import { useState, type ReactNode } from 'react'
import { MAX_IMAGE_DIMENSION } from './imageSize'

interface Props {
  children: ReactNode
  alt: string
  width?: number
  height?: number
  onApply: (width?: number, height?: number) => void
}

const ImageSizeEditor = ({ children, alt, width, height, onApply }: Props) => {
  const [open, setOpen] = useState(false)
  return <Popover open={open} onOpenChange={setOpen} trigger="click" title="图片尺寸" content={
    <form key={`${open}-${width}-${height}`} className="blog-image-size-form" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      onApply(Number(data.get('width')) || undefined, Number(data.get('height')) || undefined)
      setOpen(false)
    }}>
      <div className="blog-image-size-fields">
        <label>宽度（px）<input name="width" aria-label="图片宽度" type="number" min="1" max={MAX_IMAGE_DIMENSION} step="1" defaultValue={width} placeholder="自动" /></label>
        <label>高度（px）<input name="height" aria-label="图片高度" type="number" min="1" max={MAX_IMAGE_DIMENSION} step="1" defaultValue={height} placeholder="自动" /></label>
      </div>
      <p>只填一项时等比例缩放；同时填写时完整容纳图片，不裁剪。长图可只设高度，如 400px。</p>
      <div className="blog-image-size-actions">
        <Button onClick={() => { onApply(); setOpen(false) }}>恢复自动</Button>
        <Button type="primary" htmlType="submit">应用尺寸</Button>
      </div>
    </form>
  }>
    <span role="button" tabIndex={0} className="blog-editable-image" aria-label={`设置图片尺寸：${alt || '图片'}`}
      onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setOpen(true) }
      }}>
      {children}
    </span>
  </Popover>
}

export default ImageSizeEditor
