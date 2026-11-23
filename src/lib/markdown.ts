import MarkdownIt from 'markdown-it'
import markdownItFootnote from 'markdown-it-footnote'

export type TocItem = {
  id: string
  text: string
  level: number
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
}).use(markdownItFootnote)

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

export function renderMarkdown(source: string): {html: string; toc: TocItem[]} {
  let html = md.render(source || '')
  const toc: TocItem[] = []
  const used = new Map<string, number>()

  html = html.replace(/<h([1-3])>([\s\S]*?)<\/h\1>/g, (_match, level, inner) => {
    const encodedText = stripTags(inner)
    // Decode once, after stripping markup. TOC labels remain plain text and are
    // escaped by Astro; leave literal backslashes and existing anchor IDs intact.
    const text = encodedText.replace(/&(?:#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi,
      (entity) => md.utils.unescapeAll(entity))
    let id = slugify(encodedText) || `section-${toc.length + 1}`
    const count = used.get(id) || 0
    used.set(id, count + 1)
    if (count > 0) id = `${id}-${count + 1}`
    toc.push({id, text, level: Number(level)})
    return `<h${level} id="${id}">${inner}</h${level}>`
  })

  // Keep wide tables scrollable without breaking the article column.
  html = html.replace(/<table[\s\S]*?<\/table>/g, (table) => {
    return `<div class="table-scroll">${table}</div>`
  })

  return {html, toc}
}
