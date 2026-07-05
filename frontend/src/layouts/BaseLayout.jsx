import { Outlet, useLocation } from 'react-router'
import NightSkyBackground from '../components/layout/NightSkyBackground'
import ShellSidebar from '../components/layout/ShellSidebar'
import ShellHeader from '../components/layout/ShellHeader'
import { SettingsProvider } from '../context/SettingsContext'
import { PAGE_TITLES, usePageTitle } from '../utils/pageTitle'

function BaseLayout() {
  const location = useLocation()
  usePageTitle(PAGE_TITLES[location.pathname])
  const isWidePortfolioPage =
    location.pathname.startsWith('/overview') ||
    location.pathname.startsWith('/mutual-fund') ||
    location.pathname.startsWith('/stocks') ||
    location.pathname.startsWith('/capital-gains')

  return (
    <SettingsProvider>
      <div className="shell relative flex h-screen w-full flex-col overflow-hidden bg-[#0a0a12]">
        <NightSkyBackground />

        <ShellHeader />

        <div className="relative z-10 flex min-h-0 flex-1">
          <ShellSidebar />

          <main className="shell-main">
            <div className={`shell-content${isWidePortfolioPage ? ' shell-content-mf' : ''}`}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SettingsProvider>
  )
}

export default BaseLayout
