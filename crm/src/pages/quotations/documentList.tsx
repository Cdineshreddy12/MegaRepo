import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Document, documentService } from "@/services/api/documentService";
import Loader from "@/components/common/Loader";
import { formatDate } from "@/utils/format";
import { Download, Trash2 } from "lucide-react";
import IconButton from "@/components/common/IconButton";
import { toast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentListProps {
  entityType: string;
  entityId: string;
}

const DocumentList: React.FC<DocumentListProps> = ({
  entityType,
  entityId,
}) => {

  const queryClient = useQueryClient();

  // Query to fetch documents
  // Safety check: if entityId is invalid, return a safe default
  if (!entityId || entityId === '' || entityId === 'undefined' || entityId === 'null') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No entity ID provided</p>
        </CardContent>
      </Card>
    );
  }

  const {
    data: documents,
    isPending: isLoading,
    isError,
  } = useQuery({
    queryKey: ["documents", entityType, entityId],
    queryFn: () => documentService.getDocumentsByEntity(entityType, entityId),
    enabled: !!entityId,
  });

  // Mutation to delete a document
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) =>
      documentService.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents", entityType, entityId],
      });
      toast({
        title: "Document deleted",
        description: "Document was successfully deleted",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete document",
        status: "error",
      });
    },
  });

  // Handle document download
  const handleDownload = (document: Document) => {
    window.open(document.fileUrl, "_blank");
  };

  // Handle document deletion
  const handleDelete = (documentId: string) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(documentId);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return <p className="text-red-500">Error loading documents</p>;
  }

  if (!documents || documents.length === 0) {
    return <p className="text-gray-500">No documents available</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((document) => (
                <tr key={document._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {document.fileType.split("/")[1]?.toUpperCase() ||
                      document.fileType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {document.createdBy
                      ? `${document.createdBy.firstName} ${document.createdBy.lastName}`
                      : "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(document.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <IconButton
                        variant="outline"
                        size="sm"
                        icon={Download}
                        onClick={() => handleDownload(document)}
                      />
                      <IconButton
                        variant="outline"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(document._id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentList;
