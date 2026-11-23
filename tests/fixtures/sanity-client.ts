import {evaluate, parse} from 'groq-js'

// Local fixtures only. The production config never imports this client.
const category = {_id: 'test-category', _type: 'category', title: 'Fiqh', slug: {current: 'fiqh'}}
const reference = {_type: 'reference', _ref: category._id}
// A local image keeps thumbnail and social-image builds independent of the network.
// URL transformation parameters stay in the fragment for this data URL.
const thumbnailUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=#question-thumbnail'
const questions = Array.from({length: 14}, (_, i) => ({
  _id: `test-question-${i + 1}`,
  _type: 'question',
  title: i === 0 ? 'Reading a referenced answer' : i === 2 ? undefined : `Library test question ${i + 1}?`,
  question: i === 1 ? undefined : i === 0
    ? 'How should a referenced answer be read, and how can I follow its sources?\n\nPlease explain how quotations and references relate to the answer.\nالسلام عليكم\n<script>alert("question")</script>'
    : `Library test question ${i + 1}?`,
  slug: {current: `test-question-${i + 1}`},
  summary: 'A local test answer for checking the content library.',
  date: `2026-11-${String(23 - i).padStart(2, '0')}`,
  category: i === 1 ? undefined : reference,
  tags: [{_type: 'reference', _ref: 'test-tag'}],
  thumbnail: i === 0 ? {asset: {_type: 'reference', _ref: 'test-thumbnail'}} : undefined,
  answer: 'This is a local test answer used to verify the reading layout.\n\n> A quotation preserved in the answer.\n\nالحمد لله\n\n## Explanation\n\nA second paragraph with a [source link](https://example.com/source) and a reference.[^1]\n\n## References\n\n[^1]: Example reference for testing footnotes.\n',
}))
const article = {
  _id: 'test-article', _type: 'article', title: 'Existing article',
  slug: {current: 'existing-article'}, date: '2026-10-01', category: reference,
  summary: 'Existing article summary.', content: [
    '## Article heading',
    'Existing article content.',
    '## Faith &amp; Practice',
    '## Faith &amp; Practice',
    '### **Sources** &quot;quoted&quot; &#39;single&#39; &#169; &#x1F4DA; &nbsp; &eacute;',
    '## Literal `\\*` &amp;mdash; &unknown;',
    '## &lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=alert(1)&gt;',
  ].join('\n\n'),
}
const pdf = {
  _id: 'test-pdf', _type: 'pdf', title: 'Existing PDF',
  slug: {current: 'existing-pdf'}, date: '2026-09-01', category: reference,
  summary: 'Existing PDF summary.', pageCount: 1,
  file: {asset: {_type: 'reference', _ref: 'test-file'}},
}
const documents = [
  ...questions, article, pdf,
  {...category, sections: [{
    _key: 'test-section', heading: 'Curated content',
    items: [article, questions[0]].map((item) => ({_type: 'reference', _ref: item._id})),
  }]},
  {_id: 'empty-category', _type: 'category', title: 'Empty category', slug: {current: 'empty'}},
  {_id: 'test-tag', _type: 'tag', title: 'References', slug: {current: 'references'}},
  {_id: 'test-file', _type: 'sanity.fileAsset', url: 'https://example.com/existing.pdf'},
  {_id: 'test-thumbnail', _type: 'sanity.imageAsset', url: thumbnailUrl},
  {_id: 'siteSettings', _type: 'siteSettings', tagline: 'Local content library test.', socialLinks: []},
]

export function createClient() {
  return {
    async fetch(query: string) {
      const result = await evaluate(parse(query), {dataset: documents})
      return result.get()
    },
  }
}
