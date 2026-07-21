import { useEffect } from 'react'

export const APP_TITLE = 'YORA WEALTH'

export const PAGE_TITLES = {
  '/overview': 'Overview',
  '/mutual-fund': 'Mutual Fund',
  '/stocks': 'Stocks',
  '/capital-gains': 'Capital Gains',
  '/ppf': 'Public Provident Fund',
  '/transactions/bank': 'Bank Transactions',
  '/calculators': 'Calculators',
  '/market-data': 'Market Data',
  '/login': 'Login',
}

export function formatPageTitle(pageTitle) {
  if (!pageTitle) {
    return APP_TITLE
  }

  return `${APP_TITLE} - ${pageTitle}`
}

export function usePageTitle(pageTitle) {
  useEffect(() => {
    document.title = formatPageTitle(pageTitle)
  }, [pageTitle])
}
