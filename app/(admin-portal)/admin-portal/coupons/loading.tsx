import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/skeleton-loaders';

export default function CouponsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
