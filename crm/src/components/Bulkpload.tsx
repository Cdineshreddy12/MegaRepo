import React, { useState, useRef } from 'react';
import { AlertCircle, Upload, FileText, CheckCircle, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api/index'; // Import your configured API instance

const BulkUpload = ({ modelName, onComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(fileType)) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        showToast({
          type: 'error',
          message: 'Please upload a CSV or Excel file'
        });
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showToast({
        type: 'error',
        message: 'Please select a file to upload'
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use the configured API instance with proper headers
      const response = await api.post('/admin/users/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadResult(response.data);
      setShowResults(true);
      
      showToast({
        type: 'success',
        message: `${response.data.summary.successful} users uploaded successfully`
      });
      
      if (onComplete) {
        onComplete(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast({
        type: 'error',
        message: error.response?.data?.message || 'Error uploading file'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setShowResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Create CSV template with proper headers and sample data
    const csvContent = `employeeCode,firstName,lastName,email,password,countryCode,contactMobile,zone,role,designation,isActive
EMP-12,Vaibhav,Panchal,vaibhav@tecpact.com,Welcome@1234,91,8689931411,"North,South,East,West",admin,National Head,true
EMP-99,Pratik,Marwalikar,pratik.marwalikar@tecpact.com,Welcome@1234,91,9890514828,West,admin,Deal Owner,true`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelName.toLowerCase()}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium">Bulk Upload {modelName}s</h3>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV or Excel file to create multiple {modelName.toLowerCase()}s at once.
        </p>
      </div>

      {!showResults ? (
        <>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Upload size={40} className="text-gray-400" />
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Drag and drop your file here, or click to select
                </p>
                <p className="text-xs text-gray-400">
                  Supports CSV, XLSX or XLS files
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Select File
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <div className="flex items-center space-x-3">
                <FileText size={20} className="text-blue-500" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={resetUpload}
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="text-sm"
              >
                Download Template
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle size={16} />
              </Button>
            </div>
            <div className="space-x-3">
              <Button
                variant="outline"
                onClick={resetUpload}
                disabled={!file || isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                isLoading={isUploading}
              >
                Upload {file ? file.name : 'File'}
              </Button>
            </div>
          </div>

          {showHelp && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
              <div className="flex">
                <HelpCircle size={20} className="text-blue-500" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Format Instructions</h4>
                  <ul className="list-disc pl-5 mt-2 text-sm text-blue-700 space-y-1">
                    <li>Use commas to separate values in CSV files</li>
                    <li>Surround text with quotes if it contains commas (e.g., <code>"North,South"</code>)</li>
                    <li>For role, use lowercase values: <code>admin</code>, <code>super_admin</code>, or <code>user</code></li>
                    <li>For isActive, use lowercase <code>true</code> or <code>false</code></li>
                    <li>You can leave createdBy and updatedBy blank (they will be filled automatically)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
            <div className="flex">
              <AlertCircle size={20} className="text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  Common Upload Issues:
                </p>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside ml-2 space-y-1">
                  <li>Make sure <span className="font-medium">role</span> is one of: <code>admin</code>, <code>super_admin</code>, <code>user</code> (lowercase)</li>
                  <li>Use <span className="font-medium">true</span> or <span className="font-medium">false</span> for isActive (lowercase)</li>
                  <li>For multiple zones, use comma-separated values in quotes: <code>"North,South,East,West"</code></li>
                  <li>The <span className="font-medium">employeeCode</span> field must be unique for each user</li>
                  <li>Required fields: employeeCode, firstName, lastName, email, contactMobile</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <CheckCircle size={20} className="text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-700 font-medium">
                  Upload Complete
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {uploadResult?.summary?.successful} of {uploadResult?.summary?.total} users were processed successfully.
                </p>
              </div>
            </div>
          </div>

          {uploadResult?.summary?.failed > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertCircle size={20} className="text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">
                    {uploadResult?.summary?.failed} users failed to process
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border rounded-md">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h4 className="text-sm font-medium">Upload Results</h4>
            </div>
            <div className="divide-y">
              <div className="px-4 py-3 bg-gray-50">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500">
                  <div>Total</div>
                  <div>Successful</div>
                  <div>Failed</div>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>{uploadResult?.summary?.total || 0}</div>
                  <div className="text-green-600">{uploadResult?.summary?.successful || 0}</div>
                  <div className="text-red-600">{uploadResult?.summary?.failed || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {uploadResult?.results?.failed?.length > 0 && (
            <div className="border rounded-md">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h4 className="text-sm font-medium">Failed Entries</h4>
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {uploadResult.results.failed.map((item, index) => (
                  <div key={index} className="px-4 py-3">
                    <div className="flex justify-between text-sm">
                      <div className="font-medium">{item.email || 'Unknown'}</div>
                      <div className="text-red-600">{item.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={resetUpload}>
              Upload Another File
            </Button>
            <Button onClick={() => setShowResults(false)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;