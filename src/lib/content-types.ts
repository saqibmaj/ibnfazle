export const CONTENT_TYPES = [
  {value: 'all', label: 'All'},
  {value: 'article', label: 'Articles'},
  {value: 'pdf', label: 'PDFs'},
  {value: 'question', label: 'Q&A'},
] as const

export type ContentType = Exclude<(typeof CONTENT_TYPES)[number]['value'], 'all'>
export type ContentFilter = (typeof CONTENT_TYPES)[number]['value']

export const CONTENT_LABELS: Record<ContentType, string> = {
  article: 'ARTICLE',
  pdf: 'PDF',
  question: 'Q&A',
}
