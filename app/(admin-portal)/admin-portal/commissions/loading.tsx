import { DashboardStatsSkeleton, TableSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton-loaders';

export default function CommissionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <DashboardStatsSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
