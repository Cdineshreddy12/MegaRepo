import React, { useEffect, useState } from "react";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Control,
  FieldValues,
  Path,
  UseFormRegisterReturn,
} from "react-hook-form";
import { Upload } from "lucide-react";

interface FileuploadFieldProps<T extends FieldValues>
  extends React.InputHTMLAttributes<HTMLInputElement> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  description?: string;
  fieldRef: UseFormRegisterReturn;
}

const Preview = ({ file }: { file: File }) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  if (!file) return null;
  return (
    <div className="mt-2">
      <img
        src={url}
        alt="File Preview"
        className="w-40 h-40 object-cover rounded-md"
      />
    </div>
  );
};
const FileuploadField = <T extends FieldValues>({
  control,
  name,
  label = "Upload File",
  description = "JPG, PNG, GIF, or PDF up to 2MB",
  required,
}: // fieldRef
FileuploadFieldProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { onChange, value, ...restField }, fieldState }) => {
        const preview = fieldState.isDirty && !fieldState.invalid ? value : "";
        return (
          <FormItem>
            <div className="flex gap-4">
              {preview && <Preview file={preview} />}
              <FormLabel className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                {label}
                {required && <span className="text-destructive">*</span>}
                <Upload className="h-5 w-5 mr-2 text-gray-500" />
              </FormLabel>
            </div>
            <FormControl>
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                {...restField}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.preventDefault();
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      onChange(file);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default FileuploadField;
