import { DashboardStatsSkeleton, TableSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton-loaders';

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <DashboardStatsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableSkeleton rows={4} />
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}
