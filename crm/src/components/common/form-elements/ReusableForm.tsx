"use client";

import { z } from "zod";
import { ReactNode, useLayoutEffect, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  FieldValues,
  DefaultValues,
  UseFormReturn,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import Typography from "@/components/common/Typography";
import { isEmpty } from "lodash";
import { DevTool } from "@hookform/devtools";

interface ReusableFormProps<TFieldValues extends FieldValues> {
  zodSchema: z.ZodType<TFieldValues>;
  defaultValues: DefaultValues<TFieldValues>;
  prefillData?: DefaultValues<TFieldValues>;
  onSubmit: (values: TFieldValues) => void;
  children: ReactNode;
  renderActions?: (
    form: UseFormReturn<TFieldValues, unknown, undefined>
  ) => React.ReactNode;
}

export const Actions = () => {};
export function ReusableForm<TFieldValues extends FieldValues>({
  zodSchema,
  defaultValues,
  prefillData,
  onSubmit,
  children,
  renderActions,
}: ReusableFormProps<TFieldValues>) {
  const form = useForm<TFieldValues>({
    resolver: zodResolver(zodSchema),
    defaultValues,
  });

  const prevPrefillDataRef = useRef<TFieldValues | undefined>();
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  useEffect(() => {
    // Only reset if component is mounted and we have non-empty prefillData
    if (!isMountedRef.current) return;

    if (!isEmpty(prefillData) && (prefillData.firstName || prefillData.companyName || prefillData.email || Object.keys(prefillData).length > 0)) {
      // Check if the data has actually changed to avoid unnecessary resets
      const prevData = prevPrefillDataRef.current;
      const hasChanged = !prevData || JSON.stringify(prevData) !== JSON.stringify(prefillData);

      if (hasChanged) {
        // Clear any existing form errors first
        Object.keys(form.formState.errors).forEach(key => {
          form.clearErrors(key as any);
        });

        // Use setTimeout to ensure this happens after the current render cycle
        setTimeout(() => {
          form.reset(prefillData);
          prevPrefillDataRef.current = prefillData;
        }, 0);
      }
    }
  }, [form, prefillData]);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 overflow-auto p-1"
          noValidate
        >
          {children}
          {typeof renderActions === "function" ? (
            renderActions(form)
          ) : (
            <Button type="submit" className="justify-self-end">
              {form.formState.isSubmitting ? "Saving" : "Submit"}
            </Button>
          )}
        </form>
      </Form>
      <Typography variant="body2" className="text-gray-400">
        <span className="text-destructive mr-1">*</span>{" "}
        <span>Indicates required field</span>
      </Typography>
      <DevTool control={form.control} />
    </>
  );
}

export default ReusableForm;
