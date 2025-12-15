
import { Upload } from "lucide-react";
import React from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

type BulkUploadFormProps = {
  title?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSuccess?: () => void;
  onUploadFail?: (err: Error) => void;
  onClose?: () => void;
};
function SimpleBulkUploadForm({
  onUpload,
  onClose,
  onUploadFail,
  onUploadSuccess,
}: BulkUploadFormProps) {
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    console.log(e.target);
    try {
      await onUpload?.(e);
        onUploadSuccess?.();
    }catch (error: unknown) {
      if (error instanceof Error) {
        onUploadFail?.(error);
      }
    }
  };
  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <Input
          type="file"
          accept=".csv"
          onChange={handleBulkUpload}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          <Upload className="h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500">CSV files only</p>
        </label>
      </div>
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Upload</Button>
      </div>
    </div>
  );
}

export default SimpleBulkUploadForm;