import GenericBulkUpload from '@/components/BulkUpload';
import { API_BASE_URL } from '@/services/api'
import { EntityType } from '@/types/common';

interface BulkUploadFormProps {
  entity: EntityType;
  onClose: () => void;
  onUploadSuccess: (result: unknown) => void;
  apiBaseUrl?: string
}
const BulkUploadForm = ({ 
  entity, 
  onClose, 
  onUploadSuccess, 
  apiBaseUrl = API_BASE_URL
}: BulkUploadFormProps) => {

  const handleComplete = (result) => {
    // If we have successful records, call onUploadSuccess
    if (result.summary.successful > 0) {
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    }
  };

  // Get the model name based on entity
  const getModelName = () => {
    // Convert entity name to proper model name format
    // This assumes your entity constants match your model names (case insensitive)
    return entity.charAt(0).toUpperCase() + entity.slice(1).toLowerCase();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Bulk Upload {entity}</h2>
      <p className="text-sm text-gray-500 mb-6">
        Use this tool to upload multiple {entity.toLowerCase()} records at once. 
        Download the template, fill it with your data, and upload to process.
      </p>
      
      <GenericBulkUpload
        modelName={getModelName()}
        onComplete={handleComplete}
        apiBaseUrl={apiBaseUrl}
      />
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default BulkUploadForm;