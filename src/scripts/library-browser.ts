import {CONTENT_TYPES, type ContentFilter} from '../lib/content-types'
import {PAGE_SIZE, paginate} from '../lib/pagination'

export function initLibraryBrowser(root: HTMLElement) {
  const search = root.querySelector<HTMLInputElement>('[data-library-search]')!
  const count = root.querySelector<HTMLElement>('[data-library-count]')!
  const empty = root.querySelector<HTMLElement>('[data-library-empty]')!
  const pagination = root.querySelector<HTMLElement>('[data-library-pagination]')!
  const curated = root.querySelector<HTMLElement>('[data-library-curated]')
  const label = root.querySelector<HTMLElement>('[data-library-label]')!
  const heading = label.querySelector<HTMLElement>('.section-label__title')!
  const defaultHeading = heading.textContent || ''
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-library-type]'))
  const categories = Array.from(root.querySelectorAll<HTMLAnchorElement>('[aria-label="Categories"] a'))
  const hero = document.querySelector<HTMLElement>('.library-hero')
  const defaultType = root.dataset.defaultType as ContentFilter
  const basePath = root.dataset.basePath || '/'
  const initialPage = Number(root.dataset.page) || 1
  const excludedIds = new Set<string>(JSON.parse(root.dataset.excludedIds || '[]'))
  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-library-item]')).map((li) => {
    const row = li.querySelector<HTMLElement>('.content-row')!
    return {
      li,
      id: row.dataset.id,
      type: row.dataset.type,
      text: [row.dataset.title, row.dataset.question, row.dataset.summary, row.dataset.categoryLabel, row.dataset.tags]
        .filter(Boolean).join(' ').toLowerCase(),
    }
  })
  let selectedType = defaultType
  let currentPage = initialPage

  function isFiltered() {
    return selectedType !== defaultType || Boolean(search.value.trim())
  }

  function pageUrl(page: number) {
    const url = new URL(basePath, window.location.origin)
    if (selectedType !== defaultType) url.searchParams.set('type', selectedType)
    if (search.value.trim()) url.searchParams.set('q', search.value.trim())
    if (isFiltered()) {
      if (page > 1) url.searchParams.set('p', String(page))
    } else if (page > 1) {
      url.pathname = `${basePath === '/' ? '' : basePath}/page/${page}`
    }
    return `${url.pathname}${url.search}`
  }

  function readUrl() {
    const params = new URLSearchParams(window.location.search)
    const type = params.get('type')
    selectedType = CONTENT_TYPES.some((tab) => tab.value === type) ? type as ContentFilter : defaultType
    search.value = params.get('q') || ''
    const pathPage = window.location.pathname.match(/\/page\/(\d+)$/)?.[1]
    const requestedPage = Number(isFiltered() ? params.get('p') : pathPage || 1)
    currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  }

  function renderPagination(totalPages: number) {
    pagination.replaceChildren()
    if (totalPages <= 1) return
    const nav = document.createElement('nav')
    nav.className = 'pagination'
    nav.setAttribute('aria-label', 'Pagination')

    function pageControl(label: string, page: number, className: string, disabled = false) {
      const current = className === 'pagination__page' && page === currentPage
      const control = document.createElement(disabled || current ? 'span' : 'a')
      control.className = `${className}${disabled ? ' is-disabled' : current ? ' is-current' : ''}`
      control.textContent = label
      if (disabled) control.setAttribute('aria-disabled', 'true')
      if (current) control.setAttribute('aria-current', 'page')
      if (control instanceof HTMLAnchorElement) {
        control.href = pageUrl(page)
        control.dataset.libraryPage = String(page)
        if (label === 'Previous') control.rel = 'prev'
        if (label === 'Next') control.rel = 'next'
      }
      return control
    }

    nav.append(pageControl('Previous', currentPage - 1, 'pagination__link', currentPage === 1))
    const pages = document.createElement('ol')
    pages.className = 'pagination__pages'
    for (let page = 1; page <= totalPages; page++) {
      const li = document.createElement('li')
      li.append(pageControl(String(page), page, 'pagination__page'))
      pages.append(li)
    }
    nav.append(pages, pageControl('Next', currentPage + 1, 'pagination__link', currentPage === totalPages))
    pagination.append(nav)
  }

  function render() {
    const query = search.value.trim().toLowerCase()
    const matches = rows.filter((row) => {
      // Featured and curated content already appears above the default list.
      if (selectedType === 'all' && !query && excludedIds.has(row.id || '')) return false
      return (selectedType === 'all' || row.type === selectedType) && (!query || row.text.includes(query))
    })
    const result = paginate(matches, currentPage, PAGE_SIZE)
    currentPage = result.page
    const visible = new Set(result.items)
    rows.forEach((row) => { row.li.hidden = !visible.has(row) })
    count.textContent = `${result.total} ${result.total === 1 ? 'item' : 'items'}`
    const showCurated = Boolean(curated) && selectedType === 'all' && !query && currentPage === 1
    if (curated) curated.hidden = !showCurated
    label.hidden = showCurated && result.total === 0
    heading.textContent = isFiltered() ? root.dataset.filteredHeading || defaultHeading : defaultHeading
    empty.hidden = result.total > 0 || showCurated
    empty.textContent = selectedType === 'question' && !query
      ? 'No questions published yet.' : 'No matching content.'
    if (hero) hero.hidden = selectedType !== 'all' || Boolean(query) || currentPage !== 1
    for (const tab of tabs) {
      const active = tab.dataset.libraryType === selectedType
      tab.classList.toggle('is-active', active)
      tab.setAttribute('aria-pressed', String(active))
    }
    for (const link of categories) {
      const url = new URL(link.pathname, window.location.origin)
      if (selectedType !== 'all') url.searchParams.set('type', selectedType)
      if (query) url.searchParams.set('q', search.value.trim())
      link.href = `${url.pathname}${url.search}`
    }
    renderPagination(result.totalPages)
  }

  function update(push = false) {
    render()
    window.history[push ? 'pushState' : 'replaceState'](null, '', pageUrl(currentPage))
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      selectedType = tab.dataset.libraryType as ContentFilter
      currentPage = 1
      update(true)
    })
  }
  search.addEventListener('input', () => { currentPage = 1; update() })
  root.querySelector('[data-library-search-form]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    currentPage = 1
    update()
  })
  pagination.addEventListener('click', (event) => {
    if (!(event instanceof MouseEvent) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-library-page]')
    if (!link) return
    event.preventDefault()
    currentPage = Number(link.dataset.libraryPage)
    update(true)
    heading.setAttribute('tabindex', '-1')
    heading.focus({preventScroll: true})
    root.scrollIntoView({block: 'start'})
  })
  window.addEventListener('popstate', () => { readUrl(); render() })
  readUrl()
  render()
}
