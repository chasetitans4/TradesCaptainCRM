import { CalendarSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton-loaders';

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CalendarSkeleton />
    </div>
  );
}
