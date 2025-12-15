import React, { useState } from 'react';
import { Upload, Download, File, Check, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const GenericBulkUpload = ({ 
  modelName, 
  onComplete, 
  apiBaseUrl = `${process.env.API_BASE_URL}/bulk`
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Reset component state
  const resetState = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setResult(null);
    setError(null);
  };
  
  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const finalApiUrl = apiBaseUrl.endsWith('/bulk') ? apiBaseUrl : `${apiBaseUrl}/bulk`;
  
  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const { getApiToken } = await import('@/services/api');
      const token = getApiToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`${finalApiUrl}/${modelName}/template`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      // Create a blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${modelName.toLowerCase()}_template.xlsx`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Failed to download template');
    }
  };
  
  // Upload file
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(10);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      const { getApiToken } = await import('@/services/api');
      const token = getApiToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(`${finalApiUrl}/${modelName}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      const resultData = await response.json();
      setResult(resultData);
      
      // Notify parent component
      if (onComplete) {
        onComplete(resultData);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Render the file info
  const renderFileInfo = () => {
    if (!selectedFile) return null;
    
    return (
      <div className="flex items-center p-3 bg-gray-50 rounded-md">
        <File className="mr-2 h-5 w-5 text-gray-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
          <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setSelectedFile(null)}
          className="text-gray-500 hover:text-red-500"
        >
          <XCircle size={18} />
        </Button>
      </div>
    );
  };
  
  // Render upload results
  const renderResults = () => {
    if (!result) return null;
    
    return (
      <div className="mt-6 space-y-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-base font-semibold">Upload Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">{result.summary.total}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Successful</p>
              <p className="text-xl font-bold text-green-600">{result.summary.successful}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-xl font-bold text-red-600">{result.summary.failed}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Warnings</p>
              <p className="text-xl font-bold text-amber-500">{result.summary.warnings}</p>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="successful">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="successful">
              Successful <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">{result.results.successful.length}</span>
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">{result.results.failed.length}</span>
            </TabsTrigger>
            <TabsTrigger value="warnings">
              Warnings <span className="ml-2 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded">{result.results.warnings.length}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="successful" className="max-h-64 overflow-y-auto">
            {result.results.successful.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No successful records</p>
            ) : (
              <div className="space-y-2">
                {result.results.successful.map((item, index) => (
                  <div key={index} className="flex items-center p-2 border-b">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">Row {item.row}</span>
                    <span className="text-sm text-gray-500 ml-2">ID: {item.id}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="failed" className="max-h-64 overflow-y-auto">
            {result.results.failed.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No failed records</p>
            ) : (
              <div className="space-y-2">
                {result.results.failed.map((item, index) => (
                  <div key={index} className="flex items-center p-2 border-b">
                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm">Row {item.row}:</span>
                    <span className="text-sm text-red-600 ml-2">{item.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="warnings" className="max-h-64 overflow-y-auto">
            {result.results.warnings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No warnings</p>
            ) : (
              <div className="space-y-2">
                {result.results.warnings.map((item, index) => (
                  <div key={index} className="flex items-center p-2 border-b">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                    <span className="text-sm">Row {item.row}:</span>
                    <span className="text-sm text-amber-600 ml-2">{item.message}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end">
          <Button 
            onClick={resetState} 
            variant="outline"
            className="mr-2"
          >
            Upload Another File
          </Button>
        </div>
      </div>
    );
  };
  
  if (result) {
    return (
      <div>
        {renderResults()}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Template download section */}
      <div className="border rounded-md p-4 bg-gray-50">
        <h3 className="text-sm font-medium mb-2">Step 1: Download Template</h3>
        <p className="text-sm text-gray-500 mb-4">
          Download the template, fill it with your data according to the instructions.
        </p>
        <Button
          onClick={handleDownloadTemplate}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>
      
      {/* File upload section */}
      <div className="border rounded-md p-4">
        <h3 className="text-sm font-medium mb-2">Step 2: Upload Your File</h3>
        <p className="text-sm text-gray-500 mb-4">
          Upload your completed spreadsheet. File must be in Excel (.xlsx) or CSV format.
        </p>
        
        {renderFileInfo()}
        
        {!selectedFile && (
          <div className="mt-2">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">.xlsx or .csv</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".xlsx,.xls,.csv" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isUploading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload and Process'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenericBulkUpload;