import { forwardRef } from 'react'
import { INPUT_AUTOCOMPLETE } from '../../utils/form'

const FormInput = forwardRef(function FormInput({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      autoComplete={INPUT_AUTOCOMPLETE}
      className={`form-input ${className}`}
      {...props}
    />
  )
})

export default FormInput
