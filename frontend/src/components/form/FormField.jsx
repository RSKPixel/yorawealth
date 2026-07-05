function FormField({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="form-label">
        {label}
      </label>
      {children}
    </div>
  )
}

export default FormField
