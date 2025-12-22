import { PageHeaderSkeleton, CardListSkeleton } from '@/components/ui/skeleton-loaders';

export default function AgentsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={6} />
    </div>
  );
}
