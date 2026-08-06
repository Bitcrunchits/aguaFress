interface ShimmerLineProps {
  className?: string;
}

function ShimmerLine({ className = '' }: ShimmerLineProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
    />
  );
}

const TABLE_CELL_WIDTHS = ['w-3/5', 'w-2/3', 'w-4/5', 'w-full'] as const;

export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Header skeleton */}
      <div className="flex h-16 items-center border-b border-gray-200 bg-surface px-6">
        <ShimmerLine className="h-4 w-32" />
        <div className="flex-1" />
        <ShimmerLine className="h-8 w-8 rounded-full" />
      </div>

      <div className="p-6">
        {/* Title skeleton */}
        <ShimmerLine className="mb-2 h-6 w-48" />
        <ShimmerLine className="mb-8 h-4 w-64" />

        {/* Metrics cards skeleton */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-surface p-4 shadow-sm"
            >
              <ShimmerLine className="mb-2 h-8 w-16" />
              <ShimmerLine className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Section title */}
        <ShimmerLine className="mb-3 h-5 w-32" />

        {/* Table skeleton */}
        <div className="rounded-lg border border-gray-200 bg-surface shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <ShimmerLine key={i} className="h-3 flex-1" />
              ))}
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, row) => (
            <div
              key={row}
              className="flex gap-8 border-b border-gray-50 px-4 py-3"
            >
              {Array.from({ length: 4 }).map((_, col) => (
                <ShimmerLine
                  key={col}
                  className={`h-3 ${TABLE_CELL_WIDTHS[col]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
