import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeleton-loaders';

export default function SubmissionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}
