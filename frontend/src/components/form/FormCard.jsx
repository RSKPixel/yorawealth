import { INPUT_AUTOCOMPLETE } from '../../utils/form'

function FormCard({ children, onSubmit, className = '' }) {
  return (
    <form
      noValidate
      onSubmit={onSubmit}
      autoComplete={INPUT_AUTOCOMPLETE}
      className={`form-card ${className}`}
    >
      {children}
    </form>
  )
}

export default FormCard
