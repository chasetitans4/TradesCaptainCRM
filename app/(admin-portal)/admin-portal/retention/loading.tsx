import { PageHeaderSkeleton, DashboardStatsSkeleton, TableSkeleton } from '@/components/ui/skeleton-loaders';

export default function RetentionLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <DashboardStatsSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
