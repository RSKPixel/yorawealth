function FormButton({ children, className = '', type = 'submit', ...props }) {
  return (
    <button type={type} className={`form-button ${className}`} {...props}>
      {children}
    </button>
  )
}

export default FormButton
