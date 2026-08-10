import type {APIRoute} from 'astro'
import {getAllContent} from '../../../lib/sanity'
import {renderArticleOgImage} from '../../../lib/og'

export async function getStaticPaths() {
  const items = await getAllContent()
  return items
    .filter((item) => item.category?.slug)
    .map((item) => ({
      params: {
        category: item.category!.slug,
        slug: item.slug,
      },
      props: {item},
    }))
}

export const GET: APIRoute = async ({props}) => {
  const png = await renderArticleOgImage(props.item)
  return new Response(Buffer.from(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
