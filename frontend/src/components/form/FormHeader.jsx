function FormHeader({ title, children }) {
  return (
    <header className="form-header">
      {title ? <h1 className="form-header-title">{title}</h1> : children}
    </header>
  )
}

export default FormHeader
