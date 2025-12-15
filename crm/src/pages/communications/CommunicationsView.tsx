import React, { useState, useCallback } from 'react';
import { Plus, Upload, Download, MessageCircle, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CommunicationForm from './CommunicationForm';

function CommunicationsView() {
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
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
          <Button
            variant="outline"
            onClick={() => {}}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkUpload(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Communication
          </Button>
        </div>
      </div>

      {/* Communications Table */}
      <div className="bg-white shadow-sm rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Communication</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {communications.map((communication) => (
              <TableRow key={communication.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{communication.subject}</div>
                      <div className="text-sm text-gray-500">{communication.type}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{communication.contact}</div>
                  <div className="text-sm text-gray-500">{communication.company}</div>
                </TableCell>
                <TableCell>
                  {new Date(communication.startTime).toLocaleString()}
                </TableCell>
                <TableCell>
                  {communication.duration} min
                </TableCell>
                <TableCell>
                  <Badge variant={
                    communication.status === 'completed' ? 'success' :
                    communication.status === 'scheduled' ? 'warning' :
                    'default'
                  }>
                    {communication.status.charAt(0).toUpperCase() + communication.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="icon">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Communication Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl">
          <CommunicationForm onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Bulk Upload Communications</h3>
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
              <Button
                variant="outline"
                onClick={() => setShowBulkUpload(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowBulkUpload(false)}
              >
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CommunicationsView;