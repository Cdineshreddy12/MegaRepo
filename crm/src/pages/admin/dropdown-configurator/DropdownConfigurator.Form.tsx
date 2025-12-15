import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "@/hooks/useToast";
import { InputField } from "@/components/common/form-elements";
import Typography from "@/components/common/Typography";
import { useCreateDropdownOption } from "@/queries/DropdownQueries";
import { DropdownConfig } from "./types";
import { cn } from "@/lib/utils";
import { toSnakeCase } from "@/utils/common";


const FormSchema = z.object({
  label: z.string().min(2, {
    message: "label must be at least 2 characters.",
  }),
  value: z
    .string()
    .optional()
    .refine((value) => {
      if (value && value.length < 2)
        return "value must be at least 2 characters.";
      return true;
    }),
});

export default function InputForm({
  selectedConfig,
}: {
  selectedConfig: DropdownConfig;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      label: "",
      value: "",
    },
  });

  const dropdownCreateMutation = useCreateDropdownOption();
  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      const payload = {
        value: data.value || toSnakeCase(data.label),
        label: data.label,
        category: selectedConfig.id,
      };
      dropdownCreateMutation.mutate(payload, {
        onSuccess: () => {
          toast({
            title: "Add option",
            description: `${selectedConfig.name} option added successfully`,
          });
          form.reset();
        },
        onError: (error) => {
          toast({
            title: "Add option",
            description: (error as Error).message,
          });
        },
      });
    } catch (err) {
      console.log(err);
    }
  }
  const placeholder = `Add new ${selectedConfig.name
    .toLowerCase()
    .slice(0, -1)}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
        <div className="flex flex-col bg-slate-50 p-4">
          <Typography variant="h6">{`${placeholder} option`}</Typography>
          <div className="grid grid-cols-[1fr_1fr_80px] gap-4">
            <InputField
              label="Label"
              control={form.control}
              name="label"
              placeholder={`${placeholder} label`}
              required
            />
            <InputField
              label="Value"
              control={form.control}
              name="value"
              placeholder={`${placeholder} value`}
            />
            <Button
              type="submit"
              className={cn(
                "self-end",
                (form.formState?.errors?.label ||
                  form.formState?.errors?.value) &&
                  "self-center"
              )}
            >
              Add
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
