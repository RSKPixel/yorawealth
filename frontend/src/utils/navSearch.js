import { navSections, navTopItems } from '../components/layout/navigation'

function buildSearchWords(label, section, path) {
  const words = [label, section, path.replace(/^\//, '').replace(/-/g, ' ')]
  return words.join(' ').toLowerCase()
}

export function flattenNavItems() {
  const topLevel = navTopItems.map(({ label, path, icon }) => ({
    label,
    path,
    icon,
    section: 'Main',
    searchWords: buildSearchWords(label, 'Main', path),
  }))

  const sectionItems = navSections.flatMap(({ label: section, items }) =>
    items.map(({ label, path, icon }) => ({
      label,
      path,
      icon,
      section,
      searchWords: buildSearchWords(label, section, path),
    })),
  )

  return [...topLevel, ...sectionItems]
}

export function searchNavItems(items, query) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return items

  return items.filter((item) =>
    tokens.every((token) => item.searchWords.includes(token)),
  )
}

export function findSectionLabelForPath(pathname) {
  const section = navSections.find((entry) =>
    entry.items.some(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    ),
  )
  return section?.label ?? null
}
