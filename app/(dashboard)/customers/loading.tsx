import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton-loaders';

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
