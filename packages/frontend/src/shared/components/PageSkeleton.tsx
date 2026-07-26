interface PageSkeletonProps {
  lines?: number;
}

export default function PageSkeleton({ lines = 4 }: PageSkeletonProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-surface p-8 shadow-sm">
        <div className="mx-auto h-8 w-32 animate-pulse rounded bg-gray-200" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-gray-200"
            style={{ width: `${60 + Math.random() * 40}%` }}
          />
        ))}
      </div>
    </div>
  );
}
