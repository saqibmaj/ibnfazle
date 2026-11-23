import {defineArrayMember, defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons'

export const question = defineType({
  name: 'question',
  title: 'Q&A',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'A short, descriptive heading for the page, library, and social previews.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'question',
      title: 'Full Question',
      type: 'text',
      rows: 5,
      description: 'The complete original question. Preserve its wording and paragraph breaks.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Answer Summary',
      type: 'text',
      rows: 3,
      description: 'A short introduction for the library, search results, and social previews.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      options: {hotspot: true},
      description: 'Optional 16:9 image for listings, question pages, and social previews.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'tag'}]})],
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'text',
      rows: 20,
      description:
        'Markdown, as in articles. Separate paragraphs with a blank line, use ## for headings, and add references with links or footnotes ([^1] and [^1]: Source).',
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {name: 'dateDesc', title: 'Date, Newest', by: [{field: 'date', direction: 'desc'}]},
  ],
  preview: {select: {title: 'title', subtitle: 'date', media: 'thumbnail'}},
})
