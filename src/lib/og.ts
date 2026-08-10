import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import path from 'node:path'
import {Resvg} from '@resvg/resvg-js'
import satori from 'satori'
import type {ContentItem} from './sanity'
import {DEFAULT_AUTHOR} from './sanity'

const require = createRequire(import.meta.url)
const assetsDir = path.join(process.cwd(), 'src', 'assets')

const WIDTH = 1200
const HEIGHT = 630
const HERO_HEIGHT = 370

const COLORS = {
  bg: '#f7f3ec',
  ink: '#2c2c2c',
  accent: '#3f5f86',
  textMuted: 'rgba(44, 44, 44, 0.6)',
  border: 'rgba(44, 44, 44, 0.12)',
  overlay: 'rgba(20, 24, 32, 0.12)',
  fallbackHero: '#d9d2c6',
} as const

type OgInput = {
  title: string
  category?: string | null
  date?: string | null
  readTime?: number | null
  pageCount?: number | null
  author?: string | null
  thumbnailUrl?: string | null
}

type SatoriNode = {
  type: string
  props: Record<string, unknown>
}

let fontCache: {
  inter: Buffer
  interExt: Buffer
  interBold: Buffer
  interBoldExt: Buffer
  playfair: Buffer
  playfairExt: Buffer
} | null = null
let logoCache: string | null = null
let noiseCache: string | null = null

function fontPath(pkg: string, file: string): string {
  return require.resolve(`${pkg}/files/${file}`)
}

async function loadFonts() {
  if (fontCache) return fontCache

  const [inter, interExt, interBold, interBoldExt, playfair, playfairExt] = await Promise.all([
    readFile(fontPath('@fontsource/inter', 'inter-latin-400-normal.woff')),
    readFile(fontPath('@fontsource/inter', 'inter-latin-ext-400-normal.woff')),
    readFile(fontPath('@fontsource/inter', 'inter-latin-500-normal.woff')),
    readFile(fontPath('@fontsource/inter', 'inter-latin-ext-500-normal.woff')),
    readFile(fontPath('@fontsource/playfair-display', 'playfair-display-latin-500-normal.woff')),
    readFile(
      fontPath('@fontsource/playfair-display', 'playfair-display-latin-ext-500-normal.woff'),
    ),
  ])

  fontCache = {inter, interExt, interBold, interBoldExt, playfair, playfairExt}
  return fontCache
}

async function loadLogoDataUri(): Promise<string> {
  if (logoCache) return logoCache

  const svg = await readFile(path.join(assetsDir, 'logo.svg'))
  const resvg = new Resvg(svg, {
    fitTo: {mode: 'width', value: 220},
  })
  const png = resvg.render().asPng()
  logoCache = `data:image/png;base64,${Buffer.from(png).toString('base64')}`
  return logoCache
}

async function loadNoiseDataUri(): Promise<string> {
  if (noiseCache) return noiseCache
  const bytes = await readFile(path.join(assetsDir, 'noise.png'))
  noiseCache = `data:image/png;base64,${bytes.toString('base64')}`
  return noiseCache
}

async function loadThumbnailDataUri(url?: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const sized = url.includes('cdn.sanity.io')
      ? `${url}${url.includes('?') ? '&' : '?'}w=1200&h=740&fit=crop&auto=format`
      : url
    const res = await fetch(sized)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

function formatDate(date?: string | null): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatMetadata(input: OgInput): string | null {
  const parts: string[] = []
  const date = formatDate(input.date)
  if (date) parts.push(date)
  if (input.readTime) parts.push(`${input.readTime} min read`)
  else if (input.pageCount) parts.push(`${input.pageCount} pages`)
  else if (input.author) parts.push(input.author)
  return parts.length > 0 ? parts.join('  •  ') : null
}

function titleFontSize(title: string): number {
  if (title.length > 90) return 42
  if (title.length > 70) return 46
  if (title.length > 50) return 50
  return 54
}

function el(type: string, props: Record<string, unknown>, children?: unknown): SatoriNode {
  return {
    type,
    props: {
      ...props,
      ...(children !== undefined ? {children} : {}),
    },
  }
}

function buildTemplate(opts: {
  title: string
  category?: string | null
  metadata?: string | null
  thumbnail?: string | null
  logo: string
  noise: string
}): SatoriNode {
  const size = titleFontSize(opts.title)

  const heroChildren = opts.thumbnail
    ? [
        el('img', {
          src: opts.thumbnail,
          width: WIDTH,
          height: HERO_HEIGHT,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          },
        }),
        el('div', {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.overlay,
          },
        }),
      ]
    : []

  const leftChildren: SatoriNode[] = []

  if (opts.category) {
    leftChildren.push(
      el(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.accent,
            color: '#ffffff',
            fontFamily: 'Inter',
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            borderRadius: 999,
            padding: '10px 26px',
            marginBottom: 18,
            height: 46,
          },
        },
        opts.category,
      ),
    )
  }

  leftChildren.push(
    el(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          fontFamily: 'Playfair Display, Inter',
          fontWeight: 500,
          fontSize: size,
          lineHeight: 1.12,
          color: COLORS.ink,
          width: 720,
          lineClamp: 2,
        },
      },
      opts.title,
    ),
  )

  if (opts.metadata) {
    leftChildren.push(
      el(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 18,
            fontFamily: 'Inter',
            fontWeight: 400,
            fontSize: 26,
            color: COLORS.textMuted,
          },
        },
        opts.metadata,
      ),
    )
  }

  return el(
    'div',
    {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.bg,
        borderRadius: 28,
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
      },
    },
    [
      el(
        'div',
        {
          style: {
            width: '100%',
            height: HERO_HEIGHT,
            display: 'flex',
            position: 'relative',
            backgroundColor: COLORS.fallbackHero,
            overflow: 'hidden',
          },
        },
        heroChildren,
      ),
      el(
        'div',
        {
          style: {
            width: '100%',
            flex: 1,
            display: 'flex',
            position: 'relative',
            backgroundColor: COLORS.bg,
            padding: '48px 80px 58px 76px',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          },
        },
        [
          el('img', {
            src: opts.noise,
            width: WIDTH,
            height: HEIGHT - HERO_HEIGHT,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.04,
            },
          }),
          el(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                flex: 1,
                maxWidth: 760,
                position: 'relative',
              },
            },
            leftChildren,
          ),
          el('img', {
            src: opts.logo,
            width: 200,
            height: 200,
            style: {
              width: 200,
              height: 200,
              objectFit: 'contain',
              flexShrink: 0,
              marginLeft: 24,
              position: 'relative',
            },
          }),
        ],
      ),
    ],
  )
}

export function ogImagePath(categorySlug: string, slug: string): string {
  return `/og/${categorySlug}/${slug}.png`
}

export async function renderArticleOgImage(input: OgInput | ContentItem): Promise<Uint8Array> {
  const data: OgInput =
    'type' in input
      ? {
          title: input.title,
          category: input.category?.title,
          date: input.date,
          readTime: input.readTime,
          pageCount: input.pageCount,
          author: input.author || DEFAULT_AUTHOR,
          thumbnailUrl: input.imageUrl,
        }
      : input

  const [fonts, logo, noise, thumbnail] = await Promise.all([
    loadFonts(),
    loadLogoDataUri(),
    loadNoiseDataUri(),
    loadThumbnailDataUri(data.thumbnailUrl),
  ])

  const svg = await satori(
    buildTemplate({
      title: data.title,
      category: data.category ? data.category.toUpperCase() : null,
      metadata: formatMetadata(data),
      thumbnail,
      logo,
      noise,
    }) as any,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {name: 'Inter', data: fonts.inter, weight: 400, style: 'normal'},
        {name: 'Inter', data: fonts.interExt, weight: 400, style: 'normal'},
        {name: 'Inter', data: fonts.interBold, weight: 500, style: 'normal'},
        {name: 'Inter', data: fonts.interBoldExt, weight: 500, style: 'normal'},
        {name: 'Playfair Display', data: fonts.playfair, weight: 500, style: 'normal'},
        {name: 'Playfair Display', data: fonts.playfairExt, weight: 500, style: 'normal'},
      ],
    },
  )

  const resvg = new Resvg(svg, {
    fitTo: {mode: 'width', value: WIDTH},
    font: {loadSystemFonts: false},
  })
  return resvg.render().asPng()
}
