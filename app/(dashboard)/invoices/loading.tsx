import { TableSkeleton, PageHeaderSkeleton, DashboardStatsSkeleton } from '@/components/ui/skeleton-loaders';

export default function InvoicesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <DashboardStatsSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
