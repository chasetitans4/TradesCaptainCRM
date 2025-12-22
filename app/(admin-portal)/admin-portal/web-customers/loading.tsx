import { PageHeaderSkeleton, CardListSkeleton } from '@/components/ui/skeleton-loaders';

export default function WebCustomersLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={9} />
    </div>
  );
}
