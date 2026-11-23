import {article} from './documents/article'
import {category} from './documents/category'
import {pdf} from './documents/pdf'
import {question} from './documents/question'
import {siteSettings} from './documents/site-settings'
import {tag} from './documents/tag'
import {clusterSection} from './objects/cluster-section'
import {socialLink} from './objects/social-link'

export const schemaTypes = [
  // Documents
  article,
  pdf,
  question,
  category,
  tag,
  siteSettings,
  // Objects
  clusterSection,
  socialLink,
]
