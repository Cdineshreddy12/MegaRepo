import React, { useState } from 'react';
import { AlertCircle, Upload } from 'lucide-react';
import FormField from '../../components/common/FormField';

function AddDocumentForm({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    relatedTo: '',
    relatedId: '',
    tags: []
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Document name is required';
    if (!formData.type) newErrors.type = 'Document type is required';
    if (!formData.relatedTo) newErrors.relatedTo = 'Related entity is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add New Document</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Document Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
          placeholder="Enter document name"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Document Type"
            name="type"
            type="select"
            value={formData.type}
            onChange={handleChange}
            error={errors.type}
            required
            options={[
              { value: 'contract', label: 'Contract' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'invoice', label: 'Invoice' },
              { value: 'report', label: 'Report' },
              { value: 'other', label: 'Other' }
            ]}
          />

          <FormField
            label="Related To"
            name="relatedTo"
            type="select"
            value={formData.relatedTo}
            onChange={handleChange}
            error={errors.relatedTo}
            required
            options={[
              { value: 'account', label: 'Account' },
              { value: 'contact', label: 'Contact' },
              { value: 'opportunity', label: 'Opportunity' },
              { value: 'quote', label: 'Quote' }
            ]}
          />
        </div>

        {formData.relatedTo && (
          <FormField
            label="Select Related Record"
            name="relatedId"
            type="select"
            value={formData.relatedId}
            onChange={handleChange}
            options={[
              { value: '1', label: 'Acme Corp' },
              { value: '2', label: 'Global Tech' }
            ]}
          />
        )}

        <FormField
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter document description"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Document
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, XLS, XLSX up to 10MB
              </p>
            </div>
          </div>
        </div>

        <FormField
          label="Tags"
          name="tags"
          type="select"
          value={formData.tags}
          onChange={handleChange}
          options={[
            { value: 'important', label: 'Important' },
            { value: 'confidential', label: 'Confidential' },
            { value: 'draft', label: 'Draft' },
            { value: 'final', label: 'Final' }
          ]}
          multiple
        />



        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700"
          >
            Upload Document
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddDocumentForm;