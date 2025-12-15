import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Checkbox } from "./checkbox"
import { RadioGroup, RadioGroupItem } from "./radio-group"
import { Switch } from "./switch"
import { AlertCircle, CheckCircle, Info } from "lucide-react"

export interface FormFieldProps {
  label?: string
  description?: string
  error?: string
  success?: string
  warning?: string
  required?: boolean
  optional?: boolean
  className?: string
  children: React.ReactNode
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ 
    label, 
    description, 
    error, 
    success, 
    warning, 
    required, 
    optional, 
    className, 
    children, 
    ...props 
  }, ref) => {
    const hasError = !!error
    const hasSuccess = !!success
    const hasWarning = !!warning

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <Label 
            required={required}
            optional={optional}
            variant={hasError ? "error" : hasSuccess ? "success" : hasWarning ? "warning" : "default"}
          >
            {label}
          </Label>
        )}
        
        {description && (
          <p className="text-sm text-text-muted">{description}</p>
        )}
        
        <div className="relative">
          {children}
        </div>
        
        {(error || success || warning) && (
          <div className="flex items-center gap-2 text-sm">
            {hasError && <AlertCircle className="h-4 w-4 text-error-500" />}
            {hasSuccess && <CheckCircle className="h-4 w-4 text-success-500" />}
            {hasWarning && <Info className="h-4 w-4 text-warning-500" />}
            <span className={
              cn(
                hasError && "text-error-600",
                hasSuccess && "text-success-600",
                hasWarning && "text-warning-600"
              )
            }>
              {error || success || warning}
            </span>
          </div>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

// Form Field Components
export interface FormInputProps extends Omit<FormFieldProps, 'children'> {
  type?: React.InputHTMLAttributes<HTMLInputElement>['type']
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg'
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ 
    label, 
    description, 
    error, 
    success, 
    warning, 
    required, 
    optional, 
    className,
    type = "text",
    placeholder,
    value,
    onChange,
    disabled,
    size = "default",
    ...props 
  }, ref) => {
    return (
      <FormField
        label={label}
        description={description}
        error={error}
        success={success}
        warning={warning}
        required={required}
        optional={optional}
        className={className}
      >
        <Input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          size={size}
          error={!!error}
          success={!!success}
          {...props}
        />
      </FormField>
    )
  }
)
FormInput.displayName = "FormInput"

export interface FormTextareaProps extends Omit<FormFieldProps, 'children'> {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  disabled?: boolean
  rows?: number
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ 
    label, 
    description, 
    error, 
    success, 
    warning, 
    required, 
    optional, 
    className,
    placeholder,
    value,
    onChange,
    disabled,
    rows = 3,
    ...props 
  }, ref) => {
    return (
      <FormField
        label={label}
        description={description}
        error={error}
        success={success}
        warning={warning}
        required={required}
        optional={optional}
        className={className}
      >
        <Textarea
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          rows={rows}
          {...props}
        />
      </FormField>
    )
  }
)
FormTextarea.displayName = "FormTextarea"

export interface FormSelectProps extends Omit<FormFieldProps, 'children'> {
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  options: { value: string; label: string; disabled?: boolean }[]
}

const FormSelect = React.forwardRef<HTMLButtonElement, FormSelectProps>(
  ({ 
    label, 
    description, 
    error, 
    success, 
    warning, 
    required, 
    optional, 
    className,
    placeholder,
    value,
    onValueChange,
    disabled,
    options,
    ...props 
  }, ref) => {
    return (
      <FormField
        label={label}
        description={description}
        error={error}
        success={success}
        warning={warning}
        required={required}
        optional={optional}
        className={className}
      >
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger ref={ref} {...props}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    )
  }
)
FormSelect.displayName = "FormSelect"

export interface FormCheckboxProps extends Omit<FormFieldProps, 'children'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

const FormCheckbox = React.forwardRef<HTMLButtonElement, FormCheckboxProps>(
  ({ 
    label, 
    description, 
    error, 
    success, 
    warning, 
    required, 
    optional, 
    className,
    checked,
    onCheckedChange,
    disabled,
    ...props 
  }, ref) => {
    return (
      <FormField
        label={label}
        description={description}
        error={error}
        success={success}
        warning={warning}
        required={required}
        optional={optional}
        className={className}
      >
        <div className="flex items-center space-x-2">
          <Checkbox
            ref={ref}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            {...props}
          />
          {label && (
            <Label 
              htmlFor={props.id}
              className="text-sm font-normal cursor-pointer"
            >
              {label}
            </Label>
          )}
        </div>
      </FormField>
    )
  }
)
FormCheckbox.displayName = "FormCheckbox"

export interface FormSwitchProps extends Omit<FormFieldProps, 'children'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

const FormSwitch = React.forwardRef<HTMLButtonElement, FormSwitchProps>(
  ({ 
    label, 
    description, 
    error, 
    success, 
    warning, 
    required, 
    optional, 
    className,
    checked,
    onCheckedChange,
    disabled,
    ...props 
  }, ref) => {
    return (
      <FormField
        label={label}
        description={description}
        error={error}
        success={success}
        warning={warning}
        required={required}
        optional={optional}
        className={className}
      >
        <div className="flex items-center space-x-2">
          <Switch
            ref={ref}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            {...props}
          />
          {label && (
            <Label 
              htmlFor={props.id}
              className="text-sm font-normal cursor-pointer"
            >
              {label}
            </Label>
          )}
        </div>
      </FormField>
    )
  }
)
FormSwitch.displayName = "FormSwitch"

export { 
  FormField, 
  FormInput, 
  FormTextarea, 
  FormSelect, 
  FormCheckbox, 
  FormSwitch 
}
