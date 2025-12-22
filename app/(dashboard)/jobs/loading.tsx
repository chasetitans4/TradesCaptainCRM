import { CardListSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton-loaders';

export default function JobsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={6} />
    </div>
  );
}
