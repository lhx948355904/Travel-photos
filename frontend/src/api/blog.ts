import request from './request'
import type {
  BlogAsset,
  BlogPage,
  BlogPostDetail,
  BlogPostInput,
  BlogPostSummary,
  BlogStatus,
  BlogTaxonomy,
} from '../types/blog'

export interface BlogListParams {
  page?: number
  pageSize?: number
  q?: string
  category?: string
  tag?: string
}

export const getBlogPosts = (params: BlogListParams) =>
  request.get<never, BlogPage<BlogPostSummary>>('/blog/posts', { params })

export const getBlogPost = (slug: string) =>
  request.get<never, BlogPostDetail>(`/blog/posts/${encodeURIComponent(slug)}`)

export const getBlogCategories = () =>
  request.get<never, BlogTaxonomy[]>('/blog/categories')

export const getBlogTags = () => request.get<never, BlogTaxonomy[]>('/blog/tags')

export const getAdminBlogPosts = (params: BlogListParams & { status?: BlogStatus | '' }) =>
  request.get<never, BlogPage<BlogPostSummary>>('/admin/blog/posts', { params })

export const getAdminBlogPost = (id: number) =>
  request.get<never, BlogPostDetail>(`/admin/blog/posts/${id}`)

export const createBlogDraft = (input: BlogPostInput) =>
  request.post<never, BlogPostDetail>('/admin/blog/posts', input)

export const saveBlogDraft = (id: number, input: BlogPostInput) =>
  request.put<never, BlogPostDetail>(`/admin/blog/posts/${id}`, input)

export const publishBlogPost = (id: number, input: BlogPostInput) =>
  request.post<never, BlogPostDetail>(`/admin/blog/posts/${id}/publish`, input)

export const unpublishBlogPost = (id: number) =>
  request.post<never, BlogPostDetail>(`/admin/blog/posts/${id}/unpublish`)

export const deleteBlogPost = (id: number) =>
  request.delete<never, void>(`/admin/blog/posts/${id}`)

export const uploadBlogAsset = (file: File, onProgress?: (percent: number) => void) => {
  const data = new FormData()
  data.append('file', file)
  return request.post<never, BlogAsset>('/admin/blog/assets', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })
}
