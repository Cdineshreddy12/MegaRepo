import Typography from "@/components/common/Typography";
import ActivityLogTable from "./table";
import Modal, { useModal } from "@/components/common/Modal";
import { ActivityLogPreview } from "./view";
import useRedirect from "@/hooks/useRedirect";

function ActivityLogPage() {
  const redirect = useRedirect();
  const {
    modalRef: activityLogViewModal,
    open: handleActivityLogViewModalOpen,
  } = useModal();

 
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Typography variant="h3">Activity Logs</Typography>
      </div>
      <ActivityLogTable
        onRowDoubleClick={(row) => {
          redirect.to(`/admin/activity-logs/${row._id}/view`);
          handleActivityLogViewModalOpen();
        }}
      />
      <Modal
        ref={activityLogViewModal}
        onClose={() => {
          redirect.to(`/admin/activity-logs`);
        }}
      >
        <ActivityLogPreview />
      </Modal>
    </div>
  );
}

export default ActivityLogPage;
