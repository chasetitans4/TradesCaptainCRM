import { MessagesSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton-loaders';

export default function MessagesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <MessagesSkeleton />
      </div>
    </div>
  );
}
