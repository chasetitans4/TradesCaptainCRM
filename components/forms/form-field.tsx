'use client';

import * as React from 'react';
import {
  useFormContext,
  Controller,
  type FieldPath,
  type FieldValues,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldError,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Context for form field state
interface FormFieldContextValue {
  id: string;
  name: string;
  error?: FieldError;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function useFormField() {
  const context = React.useContext(FormFieldContext);
  if (!context) {
    throw new Error('useFormField must be used within a FormField');
  }
  return context;
}

// Props for the FormField component
interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<ControllerProps<TFieldValues, TName>, 'render'> {
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children?: (props: {
    field: ControllerRenderProps<TFieldValues, TName>;
    error?: FieldError;
    id: string;
  }) => React.ReactNode;
}

/**
 * FormField component that integrates with react-hook-form.
 *
 * Provides:
 * - Automatic error display
 * - Label with required indicator
 * - Description text
 * - Accessible ARIA attributes
 *
 * @example
 * ```tsx
 * <form onSubmit={handleSubmit(onSubmit)}>
 *   <FormField
 *     control={control}
 *     name="email"
 *     label="Email Address"
 *     required
 *   >
 *     {({ field, error, id }) => (
 *       <Input {...field} id={id} type="email" error={!!error} />
 *     )}
 *   </FormField>
 * </form>
 * ```
 */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  description,
  required,
  className,
  children,
  ...props
}: FormFieldProps<TFieldValues, TName>) {
  const id = React.useId();
  const fieldId = `${id}-${name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  return (
    <Controller
      name={name}
      control={control}
      {...props}
      render={({ field, fieldState }) => {
        const error = fieldState.error;

        return (
          <FormFieldContext.Provider value={{ id: fieldId, name, error }}>
            <div className={cn('space-y-2', className)}>
              {label && (
                <Label
                  htmlFor={fieldId}
                  className={cn(
                    'text-sm font-medium',
                    error && 'text-destructive'
                  )}
                >
                  {label}
                  {required && (
                    <span className="text-destructive ml-1" aria-hidden="true">
                      *
                    </span>
                  )}
                </Label>
              )}

              {description && (
                <p
                  id={descriptionId}
                  className="text-sm text-muted-foreground"
                >
                  {description}
                </p>
              )}

              {children?.({
                field: {
                  ...field,
                  // Add ARIA attributes
                  'aria-invalid': error ? 'true' : undefined,
                  'aria-describedby': cn(
                    error && errorId,
                    description && descriptionId
                  ) || undefined,
                } as ControllerRenderProps<TFieldValues, TName>,
                error,
                id: fieldId,
              })}

              {error?.message && (
                <p
                  id={errorId}
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {error.message}
                </p>
              )}
            </div>
          </FormFieldContext.Provider>
        );
      }}
    />
  );
}

/**
 * Simple text input field with integrated validation.
 *
 * @example
 * ```tsx
 * <FormInput
 *   control={control}
 *   name="email"
 *   label="Email"
 *   type="email"
 *   required
 * />
 * ```
 */
interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<FormFieldProps<TFieldValues, TName>, 'children'> {
  type?: React.InputHTMLAttributes<HTMLInputElement>['type'];
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  type = 'text',
  placeholder,
  disabled,
  autoComplete,
  ...props
}: FormInputProps<TFieldValues, TName>) {
  return (
    <FormField {...props}>
      {({ field, error, id }) => (
        <Input
          {...field}
          id={id}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          error={!!error}
          value={field.value ?? ''}
        />
      )}
    </FormField>
  );
}

/**
 * Textarea field with integrated validation.
 */
interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<FormFieldProps<TFieldValues, TName>, 'children'> {
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

export function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  placeholder,
  disabled,
  rows = 4,
  ...props
}: FormTextareaProps<TFieldValues, TName>) {
  return (
    <FormField {...props}>
      {({ field, error, id }) => (
        <textarea
          {...field}
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'flex w-full rounded-lg border bg-background px-4 py-3 text-base transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-destructive focus-visible:ring-destructive'
              : 'border-border'
          )}
          value={field.value ?? ''}
        />
      )}
    </FormField>
  );
}

export { useFormField };
