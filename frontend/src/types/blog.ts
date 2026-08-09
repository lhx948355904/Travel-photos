export type BlogStatus = 'DRAFT' | 'PUBLISHED'

export interface BlogTaxonomy {
  id: number
  name: string
  slug: string
  postCount?: number | null
}

export interface BlogHeading {
  id: string
  text: string
  level: number
}

export interface BlogPostSummary {
  id: number
  slug: string
  title: string
  excerpt: string
  category: BlogTaxonomy | null
  tags: BlogTaxonomy[]
  coverAssetId: number | null
  coverUrl: string | null
  status: BlogStatus
  publishedAt: string | null
  updatedAt: string
  readingTimeMinutes: number
}

export interface BlogPostDetail {
  post: BlogPostSummary
  contentMarkdown: string
  headings: BlogHeading[]
  relatedPosts: BlogPostSummary[]
}

export interface BlogPage<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface BlogPostInput {
  title: string
  slug?: string
  excerpt: string
  contentMarkdown: string
  categoryName: string
  tagNames: string[]
  coverAssetId: number | null
}

export interface BlogAsset {
  id: number
  url: string
  originalName: string
  contentType: string
  width: number | null
  height: number | null
}
