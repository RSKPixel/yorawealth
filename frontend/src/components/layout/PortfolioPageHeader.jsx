function PortfolioPageHeader({ title, actions }) {
  return (
    <header className="mf-page-header">
      <div className="mf-page-header-inner">
        <h1 className="mf-page-header-title">{title}</h1>
        {actions ? <div className="mf-page-header-actions">{actions}</div> : null}
      </div>
    </header>
  )
}

export default PortfolioPageHeader
