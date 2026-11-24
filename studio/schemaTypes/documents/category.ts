import {defineArrayMember, defineField, defineType} from 'sanity'
import {TagsIcon} from '@sanity/icons'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagsIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.custom((slug) =>
        slug?.current === 'questions' ? 'The questions slug is reserved for the Q&A library.' : true,
      ),
    }),
    defineField({
      name: 'sections',
      title: 'Cluster Sections',
      type: 'array',
      description:
        'Customizable sections on this category page (e.g. Tahara, Salah), each with its own heading and linked content.',
      of: [defineArrayMember({type: 'clusterSection'})],
    }),
  ],
  orderings: [
    {
      name: 'title',
      title: 'Title',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
    },
  },
})
