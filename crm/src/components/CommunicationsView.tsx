import React, { useState, useCallback } from 'react';
import { Plus, Upload, Download, MessageCircle, Edit2, Trash2, MoreVertical } from 'lucide-react';
import Table from './common/Table/Table';
import CommunicationForm from './communications/CommunicationForm';

function CommunicationsView() {
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [communications] = useState([
    {
      id: '1',
      type: 'meeting',
      subject: 'Project Discussion',
      contact: 'John Smith',
      company: 'Tech Solutions Inc',
      startTime: '2024-02-20T10:00',
      duration: 60,
      status: 'completed'
    }
  ]);

  const columns = [
    {
      key: 'communication',
      label: 'Communication',
      sortable: true,
      filterable: true,
      render: (_, row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.subject}</div>
            <div className="text-sm text-gray-500">{row.type}</div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      sortable: true,
      filterable: true,
      render: (_, row) => (
        <div>
          <div className="text-sm text-gray-900">{row.contact}</div>
          <div className="text-sm text-gray-500">{row.company}</div>
        </div>
      )
    },
    {
      key: 'startTime',
      label: 'Date & Time',
      sortable: true,
      render: (value) => new Date(value).toLocaleString()
    },
    {
      key: 'duration',
      label: 'Duration',
      sortable: true,
      render: (value) => `${value} min`
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'scheduled' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex justify-end space-x-2">
          <button className="text-primary hover:text-blue-900">
            <Edit2 size={16} />
          </button>
          <button className="text-red-600 hover:text-red-900">
            <Trash2 size={16} />
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical size={16} />
          </button>
        </div>
      )
    }
  ];

  const handleSort = useCallback((key, direction) => {
    // Implement sorting logic
    console.log('Sort:', key, direction);
  }, []);

  const handleFilter = useCallback((filters) => {
    // Implement filtering logic
    console.log('Filters:', filters);
  }, []);

  const handleExport = useCallback(() => {
    // Implement export logic
    console.log('Exporting data...');
  }, []);

  const handleRowClick = useCallback((row) => {
    // Handle row click
    console.log('Row clicked:', row);
  }, []);

  const handleBulkUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        console.log('Uploaded file content:', text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download size={20} className="mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Upload size={20} className="mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700"
          >
            <Plus size={20} className="mr-2" />
            Log Communication
          </button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={communications}
        onSort={handleSort}
        onFilter={handleFilter}
        onExport={handleExport}
        onRowClick={handleRowClick}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        totalItems={communications.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        searchPlaceholder="Search communications..."
      />

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CommunicationForm onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {showBulkUpload && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Upload Communications</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
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
                  <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </label>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowBulkUpload(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowBulkUpload(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 focus:outline-none"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunicationsView;