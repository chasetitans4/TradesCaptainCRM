'use client';

import * as React from 'react';
import {
  useForm,
  FormProvider,
  type UseFormProps,
  type FieldValues,
  type UseFormReturn,
  type SubmitHandler,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormDirtyState } from '@/hooks/useUnsavedChanges';

interface FormProps<TFieldValues extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: React.ReactNode;
}

/**
 * Form wrapper that provides react-hook-form context.
 *
 * @example
 * ```tsx
 * const form = useZodForm({
 *   schema: z.object({
 *     email: z.string().email(),
 *     name: z.string().min(2),
 *   }),
 * });
 *
 * <Form form={form} onSubmit={handleSubmit}>
 *   <FormInput control={form.control} name="email" label="Email" />
 *   <FormInput control={form.control} name="name" label="Name" />
 *   <Button type="submit">Submit</Button>
 * </Form>
 * ```
 */
export function Form<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  children,
  ...props
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  );
}

// Use z.ZodType for proper type inference
type ZodObjectSchema = z.ZodObject<z.ZodRawShape>;

interface UseZodFormProps<TSchema extends ZodObjectSchema>
  extends Omit<UseFormProps<z.infer<TSchema>>, 'resolver'> {
  schema: TSchema;
}

/**
 * Hook to create a form with Zod validation.
 *
 * Features:
 * - Automatic Zod validation
 * - TypeScript inference from schema
 * - Unsaved changes warning (optional)
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   email: z.string().email('Please enter a valid email'),
 *   password: z.string().min(8, 'Password must be at least 8 characters'),
 * });
 *
 * const form = useZodForm({
 *   schema,
 *   defaultValues: { email: '', password: '' },
 * });
 *
 * const onSubmit = async (data: z.infer<typeof schema>) => {
 *   await saveData(data);
 *   form.reset(data); // Clear dirty state after save
 * };
 * ```
 */
export function useZodForm<TSchema extends ZodObjectSchema>({
  schema,
  ...props
}: UseZodFormProps<TSchema>) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // Validate on blur for better UX
    ...props,
  });

  return form;
}

/**
 * Hook to create a form with Zod validation and unsaved changes warning.
 *
 * @example
 * ```tsx
 * const { form, isDirty, confirmLeave } = useZodFormWithDirtyState({
 *   schema,
 *   defaultValues: { name: '' },
 * });
 *
 * const handleCancel = () => {
 *   if (confirmLeave()) {
 *     router.back();
 *   }
 * };
 * ```
 */
export function useZodFormWithDirtyState<TSchema extends ZodObjectSchema>({
  schema,
  ...props
}: UseZodFormProps<TSchema>) {
  const form = useZodForm({ schema, ...props });

  const { isDirty, confirmLeave, markClean } = useFormDirtyState({
    message: 'You have unsaved changes. Are you sure you want to leave?',
  });

  // Track form dirty state
  React.useEffect(() => {
    const subscription = form.watch(() => {
      if (form.formState.isDirty) {
        // Form has changes
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Mark clean when form is reset or submitted successfully
  const resetAndClean = React.useCallback(
    (values?: z.infer<TSchema>) => {
      form.reset(values);
      markClean();
    },
    [form, markClean]
  );

  return {
    form,
    isDirty: form.formState.isDirty || isDirty,
    confirmLeave,
    resetAndClean,
  };
}
