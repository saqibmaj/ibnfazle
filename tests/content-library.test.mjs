import assert from 'node:assert/strict'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {after, before, test} from 'node:test'
import {build} from 'astro'

let directory
const html = (route) => readFile(path.join(directory, 'dist', route, 'index.html'), 'utf8')

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'ibnfazle-library-test-'))
  await build({
    configFile: './tests/fixtures/astro.config.mjs',
    outDir: path.join(directory, 'dist'),
    cacheDir: path.join(directory, 'cache'),
    logLevel: 'error',
  })
})

after(async () => {
  if (process.env.KEEP_LIBRARY_TEST_OUTPUT) {
    console.log(`Local fixture output: ${directory}`)
    return
  }
  if (directory && path.dirname(directory) === path.resolve(tmpdir()) && path.basename(directory).startsWith('ibnfazle-library-test-')) {
    await rm(directory, {recursive: true, force: true})
  }
})

test('questions library defaults to Q&A and generates a second page', async () => {
  const first = await html('questions')
  const second = await html('questions/page/2')
  assert.match(first, /aria-pressed="true"[^>]*data-library-type="question"/)
  assert.match(first, /href="\/questions\/page\/2"/)
  assert.match(first, /14 items/)
  assert.equal((first.match(/<li data-library-item(?! hidden)/g) || []).length, 12)
  assert.equal((second.match(/<li data-library-item(?! hidden)/g) || []).length, 2)
  assert.match(first, /data-type="article"/)
  assert.match(first, /data-type="pdf"/)
})

test('question detail renders headings, paragraphs, footnotes, and canonical social metadata', async () => {
  const page = await html('questions/test-question-1')
  assert.match(page, /<h1 class="article-title">Reading a referenced answer<\/h1>/)
  assert.match(page, /<title>Reading a referenced answer \| Thaqib ibn Fazle<\/title>/)
  assert.match(page, /id="qa-question-heading">The Question<\/h2>/)
  assert.match(page, /dir="auto">How should a referenced answer be read, and how can I follow its sources\?<\/p>/)
  assert.match(page, /السلام عليكم/)
  assert.match(page, /&lt;script&gt;alert\(/)
  assert.doesNotMatch(page, /<script>alert\("question"\)/)
  assert.match(page, /id="qa-answer-heading">The Answer<\/h2>/)
  assert.ok(page.indexOf('class="article-meta"') < page.indexOf('id="qa-question-heading"'))
  assert.ok(page.indexOf('id="qa-question-heading"') < page.indexOf('id="qa-answer-heading"'))
  assert.match(page, /<blockquote>\s*<p>A quotation preserved in the answer\.<\/p>/)
  assert.match(page, /الحمد لله/)
  assert.match(page, /aria-label="Answer"/)
  assert.match(page, /<h2 id="explanation">Explanation<\/h2>/)
  assert.match(page, /<h2 id="references">References<\/h2>/)
  assert.match(page, /class="footnotes/)
  assert.match(page, /href="https:\/\/example.com\/source"/)
  assert.match(page, /href="https:\/\/ibnfazle.com\/questions\/test-question-1"/)
  assert.match(page, /\/og\/questions\/test-question-1.png/)
  assert.doesNotMatch(page, /class="article-thumbnail"/)
  assert.match(page, /class="article-shell article-shell--with-toc article-shell--question"/)
  const withoutThumbnail = await html('questions/test-question-2')
  assert.match(withoutThumbnail, /Library test question 2\?/)
  assert.doesNotMatch(withoutThumbnail, /class="article-thumbnail"/)
  assert.match(withoutThumbnail, /class="article-shell article-shell--with-toc article-shell--question"/)
  assert.match(withoutThumbnail, /class="content-row__media"><img[^>]*#question-thumbnail/)
  assert.match(withoutThumbnail, /dir="auto">Library test question 2\?<\/p>/)
  const withoutTitle = await html('questions/test-question-3')
  assert.match(withoutTitle, /<h1 class="article-title">Library test question 3\?<\/h1>/)
})

test('Q&A cards share thumbnail and placeholder media across listings and curated sections', async () => {
  const page = await html('fiqh')
  assert.match(page, /Curated content/)
  assert.match(page, /href="\/questions\/test-question-1"/)
  for (const listing of [page, await html('questions')]) {
    const cards = listing.match(/<a class="content-row"[^>]*data-type="question"[\s\S]*?<\/a>/g) || []
    assert.ok(cards.length > 0)
    for (const card of cards) {
      assert.match(card, /class="content-row__media"/)
      if (card.includes('data-id="test-question-1"')) {
        assert.match(card, /<h3 class="content-row__title">Reading a referenced answer<\/h3>/)
        assert.match(card, /<img[^>]*src="data:image\/png;base64,[^"]+#question-thumbnail\?w=960&amp;h=540&amp;fit=crop&amp;auto=format"[^>]*loading="lazy"/)
      } else {
        assert.match(card, /class="content-row__placeholder" aria-hidden="true"/)
      }
    }
  }
  const emptyCategory = await html('empty')
  assert.match(emptyCategory, /<p class="library-empty" data-library-empty>/)
})

test('existing article and PDF routes retain their content and download', async () => {
  assert.match(await html('fiqh/existing-article'), /Existing article content/)
  assert.doesNotMatch(await html('fiqh/existing-article'), /qa-question-heading|qa-answer-heading/)
  const pdf = await html('fiqh/existing-pdf')
  assert.match(pdf, /Download PDF/)
  assert.match(pdf, /href="https:\/\/example.com\/existing.pdf"/)
  const home = await html('')
  const hero = home.match(/<a class="hero-feature"[\s\S]*?<\/a>/)?.[0]
  assert.ok(hero)
  assert.match(hero, /href="\/questions\/test-question-1"/)
  assert.match(hero, /class="hero-feature__media"/)
  assert.match(hero, /<img[^>]*src="data:image\/png;base64,[^"]+#question-thumbnail[^>]*loading="eager"/)
  const sitemap = await readFile(path.join(directory, 'dist', 'sitemap-0.xml'), 'utf8')
  assert.match(sitemap, /https:\/\/ibnfazle.com\/questions\/test-question-1/)
  assert.doesNotMatch(sitemap, /\/fiqh\/test-question-1/)
})

test('TOC labels decode entities once, preserve anchors, and escape unsafe text', async () => {
  const page = await html('fiqh/existing-article')
  const tocs = page.match(/<nav\b[^>]*aria-label="Table of contents"[\s\S]*?<\/nav>/g) || []
  assert.equal(tocs.length, 2, 'desktop and mobile TOCs should render')
  for (const toc of tocs) {
    assert.match(toc, /href="#faith-amp-practice"[^>]*>\s*Faith &amp; Practice\s*<\/a>/)
    assert.match(toc, /href="#faith-amp-practice-2"/)
    assert.match(toc, /Sources &quot;quoted&quot; &#39;single&#39; © 📚 \u00a0 é/)
    assert.match(toc, /Literal \\\* &amp;mdash; &amp;unknown;/)
    assert.match(toc, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &lt;img src=x onerror=alert\(1\)&gt;/)
    assert.doesNotMatch(toc, /<script\b|<img\b|&amp;amp;/)
    for (const [, id] of toc.matchAll(/data-toc-link="([^"]+)"/g)) {
      assert.ok(page.includes(`id="${id}"`), `TOC anchor ${id} should target a heading`)
    }
  }
  assert.match(page, /<h2 id="faith-amp-practice">Faith &amp; Practice<\/h2>/)
})
