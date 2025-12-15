import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useFormContext, FieldValues, Path } from "react-hook-form";
import * as z from "zod";
import { Upload, File, X, Eye } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const formSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
      })
    )
    .nonempty("At least one file is required."),
});

export type FormValues = {
  files: File[];
};

export interface DocumentUploadProps<T extends FieldValues> extends React.InputHTMLAttributes<HTMLInputElement>{
  // onUpload: (files: File[]) => void
  name: Path<T>;
  maxFiles?: number;
  maxSize?: number;
  acceptedFileTypes?: string[];
  description?: string;
  label?: string;
  placeholder?: string;
  previewClassName?: string
}

export function DocumentUpload<T extends FormFields>({
  // onUpload,
  name,
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedFileTypes = ["application/pdf", "image/*"],
  description = "Upload your document(s) here. We accept PDF and image files.",
  label,
  placeholder = "Select Files"

}: DocumentUploadProps<T>) {
  const [preview, setPreview] = useState<string | null>(null);
  const form = useFormContext();

  // const form = useForm<FormValues>({
  //   resolver: zodResolver(formSchema),
  //   defaultValues: {
  //     files: [],
  //   },
  // })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      form.setValue(name, acceptedFiles, {
        shouldValidate: true,
        shouldDirty: true,
      });
      if (acceptedFiles[0]) {
        const file = acceptedFiles[0];
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setPreview(null);
        }
      }
    },
    maxFiles,
    maxSize,
    accept: acceptedFileTypes.reduce((acc, curr) => {
      acc[curr] = [];
      return acc;
    }, {} as Record<string, string[]>),
  });

  // const onSubmit = (data: FormValues) => {
  //   onUpload(data.files)
  // }

  const removeFile = () => {
    form.setValue(name, [], { shouldValidate: true });
    setPreview(null);
  };

  return (
    <div className="space-y-8">
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <Card
                {...getRootProps()}
                className={cn(
                  "border-dashed cursor-pointer transition-colors",
                  isDragActive && "border-primary",
                  preview && "p-0 overflow-hidden"
                )}
              >
                <CardContent
                  className={cn(
                    "flex flex-col items-center justify-center",
                    preview ? "p-0" : "py-12"
                  )}
                >
                  {preview ? (
                    <div className="relative w-full h-64">
                      <img
                        src={preview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag & drop files here, or click to select files
                      </p>
                      <Button type="button" variant="secondary" size="sm">
                        {placeholder}
                      </Button>
                    </>
                  )}
                  <Input {...getInputProps()} className="sr-only" />
                </CardContent>
              </Card>
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {form?.watch(name)?.length > 0 && !preview && (
        <div className="space-y-2">
          {form.watch(name).map((file, index) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4" />
                <span className="text-sm">{file.name}</span>
              </div>
              <div className="flex space-x-2">
                {file.type.startsWith("image/") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile()}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
