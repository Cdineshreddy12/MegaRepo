import React, { useState } from 'react';
import { useApiLoading, useCreateLoading, useUpdateLoading, useDeleteLoading, useFetchLoading } from '@/hooks/useApiLoading';
import { useLoading } from '@/contexts/LoadingContext';

// Example API functions
const mockApiCall = (delay: number = 1000) => 
  new Promise(resolve => setTimeout(() => resolve({ success: true }), delay));

const mockCreateApi = () => mockApiCall(2000);
const mockUpdateApi = () => mockApiCall(1500);
const mockDeleteApi = () => mockApiCall(1000);
const mockFetchApi = () => mockApiCall(3000);

const LoadingExample: React.FC = () => {
  const [result, setResult] = useState<string>('');
  
  // Basic loading hook
  const { isLoading, startLoading, stopLoading, withLoading } = useApiLoading();
  
  // Specialized loading hooks
  const createWithLoading = useCreateLoading();
  const updateWithLoading = useUpdateLoading();
  const deleteWithLoading = useDeleteLoading();
  const fetchWithLoading = useFetchLoading();
  
  // Global loading context
  const { showLoading, hideLoading } = useLoading();

  const handleBasicLoading = async () => {
    startLoading('Processing basic operation...');
    await mockApiCall(2000);
    stopLoading();
    setResult('Basic loading completed!');
  };

  const handleWithLoading = async () => {
    const result = await withLoading(
      () => mockApiCall(2500),
      'Processing with loading wrapper...'
    );
    setResult('With loading wrapper completed!');
  };

  const handleCreateLoading = async () => {
    const result = await createWithLoading(() => mockCreateApi());
    setResult('Create operation completed!');
  };

  const handleUpdateLoading = async () => {
    const result = await updateWithLoading(() => mockUpdateApi());
    setResult('Update operation completed!');
  };

  const handleDeleteLoading = async () => {
    const result = await deleteWithLoading(() => mockDeleteApi());
    setResult('Delete operation completed!');
  };

  const handleFetchLoading = async () => {
    const result = await fetchWithLoading(() => mockFetchApi());
    setResult('Fetch operation completed!');
  };

  const handleGlobalLoading = async () => {
    showLoading('Global loading operation...');
    await mockApiCall(3000);
    hideLoading();
    setResult('Global loading completed!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          ZopkitLoader Examples
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Examples of different loading states and hooks
        </p>
      </div>

      {/* Loading Status */}
      {isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200">
            Local loading state is active
          </p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">
            {result}
          </p>
        </div>
      )}

      {/* Loading Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Loading */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Basic Loading</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manual start/stop loading control
          </p>
          <button
            onClick={handleBasicLoading}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Basic Loading
          </button>
        </div>

        {/* With Loading Wrapper */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">With Loading Wrapper</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Automatic loading state management
          </p>
          <button
            onClick={handleWithLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Start With Loading Wrapper
          </button>
        </div>

        {/* Create Loading */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Create Operation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Specialized create loading hook
          </p>
          <button
            onClick={handleCreateLoading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Create with Loading
          </button>
        </div>

        {/* Update Loading */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Update Operation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Specialized update loading hook
          </p>
          <button
            onClick={handleUpdateLoading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Update with Loading
          </button>
        </div>

        {/* Delete Loading */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Delete Operation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Specialized delete loading hook
          </p>
          <button
            onClick={handleDeleteLoading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete with Loading
          </button>
        </div>

        {/* Fetch Loading */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Fetch Operation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Specialized fetch loading hook
          </p>
          <button
            onClick={handleFetchLoading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Fetch with Loading
          </button>
        </div>

        {/* Global Loading */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Global Loading</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Global loading context usage
          </p>
          <button
            onClick={handleGlobalLoading}
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Global Loading
          </button>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">Usage Instructions</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <strong>1. Basic Loading Hook:</strong>
            <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
              const {'{'} isLoading, startLoading, stopLoading {'}'} = useApiLoading();
            </code>
          </div>
          
          <div>
            <strong>2. With Loading Wrapper:</strong>
            <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
              const result = await withLoading(apiCall, 'Custom message...');
            </code>
          </div>
          
          <div>
            <strong>3. Specialized Hooks:</strong>
            <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
              const createWithLoading = useCreateLoading();<br/>
              const updateWithLoading = useUpdateLoading();<br/>
              const deleteWithLoading = useDeleteLoading();<br/>
              const fetchWithLoading = useFetchLoading();
            </code>
          </div>
          
          <div>
            <strong>4. Global Loading Context:</strong>
            <code className="block bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
              const {'{'} showLoading, hideLoading {'}'} = useLoading();
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingExample;
