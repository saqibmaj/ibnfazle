import {createClient} from '@sanity/client'
import {defineQuery} from 'groq'
import type {ContentType} from './content-types'

export const DEFAULT_AUTHOR = 'Thaqib ibn Fazle'

export type Taxonomy = {
  title: string
  slug: string
}

export type ContentItem = {
  _id: string
  type: ContentType
  title: string
  slug: string
  summary: string
  date: string
  category: Taxonomy | null
  tags: Taxonomy[]
  href: string
  readTime?: number
  pageCount?: number
  author: string
  content?: string
  question?: string
  fileUrl?: string
  imageUrl?: string
}

export type SocialLink = {
  platform: 'instagram' | 'youtube' | 'discord' | string
  url: string
}

export type SiteSettings = {
  tagline: string
  socialLinks: SocialLink[]
}

export type ClusterSection = {
  _key: string
  heading: string
  items: ContentItem[]
}

export type CategoryPage = Taxonomy & {
  sections: ClusterSection[]
}

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION || '2026-08-01'

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
})

const categoryProjection = `{
  title,
  "slug": slug.current
}`

const tagProjection = `{
  title,
  "slug": slug.current
}`

function imageUrl(url?: string, width = 800) {
  if (!url) return undefined
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}w=${width}&h=${Math.round((width * 9) / 16)}&fit=crop&auto=format`
}

function readTime(markdown: string): number {
  const words = markdown
    .replace(/[#*\`\[\]()_]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function mapArticle(doc: any): ContentItem {
  const categorySlug = doc.category?.slug
  return {
    _id: doc._id,
    type: 'article',
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary,
    date: doc.date,
    category: doc.category ?? null,
    tags: doc.tags ?? [],
    href: categorySlug ? `/${categorySlug}/${doc.slug}` : `/`,
    readTime: readTime(doc.content || ''),
    author: DEFAULT_AUTHOR,
    content: doc.content,
    imageUrl: imageUrl(doc.imageUrl, 960),
  }
}

function mapPdf(doc: any): ContentItem {
  const categorySlug = doc.category?.slug
  return {
    _id: doc._id,
    type: 'pdf',
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary,
    date: doc.date,
    category: doc.category ?? null,
    tags: doc.tags ?? [],
    href: categorySlug ? `/${categorySlug}/${doc.slug}` : `/`,
    pageCount: doc.pageCount ?? undefined,
    author: DEFAULT_AUTHOR,
    fileUrl: doc.fileUrl || undefined,
    imageUrl: imageUrl(doc.imageUrl, 960),
  }
}

function mapQuestion(doc: any): ContentItem {
  return {
    _id: doc._id,
    type: 'question',
    title: doc.title?.trim() || doc.question,
    slug: doc.slug,
    summary: doc.summary || '',
    date: doc.date,
    category: doc.category ?? null,
    tags: doc.tags ?? [],
    href: `/questions/${doc.slug}`,
    readTime: readTime(doc.answer || ''),
    author: DEFAULT_AUTHOR,
    content: doc.answer,
    // Older entries used the title as the full question.
    question: doc.question?.trim() ? doc.question : doc.title,
    imageUrl: imageUrl(doc.imageUrl, 960),
  }
}

function mapContent(doc: any): ContentItem {
  if (doc._type === 'question') return mapQuestion(doc)
  return doc._type === 'pdf' ? mapPdf(doc) : mapArticle(doc)
}

function byDateDesc(a: ContentItem, b: ContentItem) {
  return b.date.localeCompare(a.date)
}

const articleFields = `
  _id,
  title,
  "slug": slug.current,
  summary,
  date,
  content,
  "imageUrl": thumbnail.asset->url,
  category->${categoryProjection},
  "tags": tags[]->${tagProjection}
`

const pdfFields = `
  _id,
  title,
  "slug": slug.current,
  summary,
  date,
  pageCount,
  "fileUrl": file.asset->url,
  "imageUrl": thumbnail.asset->url,
  category->${categoryProjection},
  "tags": tags[]->${tagProjection}
`

const questionFields = `
  _id,
  title,
  question,
  "slug": slug.current,
  summary,
  date,
  answer,
  "imageUrl": thumbnail.asset->url,
  category->${categoryProjection},
  "tags": tags[]->${tagProjection}
`

const questionsQuery = defineQuery(`
  *[_type == "question" && defined(slug.current)] | order(date desc) {${questionFields}}
`)

const contentRefFields = `
  _type,
  _id,
  title,
  question,
  "slug": slug.current,
  summary,
  date,
  content,
  answer,
  pageCount,
  "fileUrl": file.asset->url,
  "imageUrl": thumbnail.asset->url,
  category->${categoryProjection},
  "tags": tags[]->${tagProjection}
`

async function getArticles(): Promise<ContentItem[]> {
  const docs = await sanity.fetch(
    `*[_type == "article" && defined(slug.current)] | order(date desc) {${articleFields}}`,
  )
  return (docs || []).map(mapArticle)
}

async function getPdfs(): Promise<ContentItem[]> {
  const docs = await sanity.fetch(
    `*[_type == "pdf" && defined(slug.current)] | order(date desc) {${pdfFields}}`,
  )
  return (docs || []).map(mapPdf)
}

async function getQuestions(): Promise<ContentItem[]> {
  const docs = await sanity.fetch(questionsQuery)
  return (docs || []).map(mapQuestion)
}

let allContentCache: Promise<ContentItem[]> | null = null
let categoriesCache: Promise<Taxonomy[]> | null = null
let categoryPagesCache: Promise<CategoryPage[]> | null = null
let siteSettingsCache: Promise<SiteSettings> | null = null
let sectionMembershipCache: Promise<Map<string, string[]>> | null = null

export async function getAllContent(): Promise<ContentItem[]> {
  if (!allContentCache) {
    allContentCache = Promise.all([getArticles(), getPdfs(), getQuestions()]).then(([articles, pdfs, questions]) =>
      [...articles, ...pdfs, ...questions].sort(byDateDesc),
    )
  }
  return allContentCache
}

export async function getCategories(): Promise<Taxonomy[]> {
  if (!categoriesCache) {
    categoriesCache = sanity
      .fetch(`*[_type == "category" && defined(slug.current)] | order(title asc) {
      title,
      "slug": slug.current
    }`)
      .then((docs) => docs || [])
  }
  return categoriesCache
}

export async function getCategoryPages(): Promise<CategoryPage[]> {
  if (!categoryPagesCache) {
    categoryPagesCache = sanity
      .fetch(`*[_type == "category" && defined(slug.current)] | order(title asc) {
    title,
    "slug": slug.current,
    sections[]{
      _key,
      heading,
      "rawItems": items[]->{${contentRefFields}}
    }
  }`)
      .then((docs) =>
        (docs || []).map((doc: any) => ({
          title: doc.title,
          slug: doc.slug,
          sections: (doc.sections || [])
            .filter((section: any) => section?.heading)
            .map((section: any) => ({
              _key: section._key,
              heading: section.heading,
              items: (section.rawItems || [])
                .filter((item: any) => item?.slug)
                .map(mapContent),
            })),
        })),
      )
  }
  return categoryPagesCache
}

/** Map of content id → section keys that include it (across all categories). */
export async function getSectionMembership(): Promise<Map<string, string[]>> {
  if (!sectionMembershipCache) {
    sectionMembershipCache = getCategoryPages().then((pages) => {
      const map = new Map<string, string[]>()
      for (const page of pages) {
        for (const section of page.sections) {
          for (const item of section.items) {
            const existing = map.get(item._id) || []
            existing.push(section._key)
            map.set(item._id, existing)
          }
        }
      }
      return map
    })
  }
  return sectionMembershipCache
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!siteSettingsCache) {
    siteSettingsCache = sanity.fetch(`*[_id == "siteSettings"][0]{
    tagline,
    socialLinks[]{platform, url}
  }`).then((doc) => {
      const allowed = new Set(['instagram', 'youtube', 'discord'])
      return {
        tagline:
          doc?.tagline || 'A digital library of clear, referenced articles clarifying Islam.',
        socialLinks: (doc?.socialLinks || []).filter(
          (l: SocialLink) => l?.platform && l?.url && allowed.has(l.platform),
        ),
      }
    })
  }
  return siteSettingsCache
}

/**
 * Related content: same category → same cluster section → newest remaining.
 */
export function getRelated(
  item: ContentItem,
  catalog: ContentItem[],
  sectionMembership: Map<string, string[]>,
  limit = 3,
): ContentItem[] {
  const others = catalog.filter((c) => c._id !== item._id)
  const categorySlug = item.category?.slug
  const itemSections = new Set(sectionMembership.get(item._id) || [])

  const scored = others.map((c) => {
    let score = 0
    if (categorySlug && c.category?.slug === categorySlug) score += 4
    const otherSections = sectionMembership.get(c._id) || []
    if (otherSections.some((id) => itemSections.has(id))) score += 2
    return {c, score}
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.c.date.localeCompare(a.c.date)
  })

  return scored.slice(0, limit).map((s) => s.c)
}
