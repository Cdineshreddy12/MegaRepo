import { IconButton } from "@/components/common/LoadingButton";
import { Typography } from "@/components/common/Typography";
import { Plus } from "lucide-react";
// import useRedirect from "@/hooks/useRedirect";
// import { EntityType } from "@/types/common";

interface EmptyTableStateProps {
  title?: string;
  subTitle?: string;
  action?: {
    link: string;
    label: string;
  };
  entityType?: string;
}
export function DataTableEmptyState({
  title = "You don't have any data",
  subTitle = "Please add one",
  action,
  entityType,
}: EmptyTableStateProps) {
  // const redirect = useRedirect();

  const heading = entityType
    ? `You don't have any ${entityType?.toLowerCase()}s`
    : title;
  const subHeading = entityType
    ? `Please add ${entityType?.toLowerCase()}`
    : subTitle;
  return (
    <div className=" flex flex-col gap-2 items-center text-slate-500 min-h-[300px] justify-center">
      <Typography variant="h4">{heading}</Typography>
      <Typography variant="body">{subHeading}</Typography>
      {action || entityType ? (
        <IconButton
          startIcon={Plus}
          onClick={() => {}}
        >
          {entityType ? `ADD ${entityType}` : action?.label}
        </IconButton>
      ) : null}
    </div>
  );
}

export default DataTableEmptyState;
