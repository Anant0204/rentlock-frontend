export default function Skeleton({ className = '', lines = 1 }) {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {[...Array(lines)].map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-gray-200/70 rounded-lg animate-pulse ${className}`}
            style={{ width: `${85 - i * 10}%` }}
          />
        ))}
      </div>
    );
  }
  return <div className={`bg-gray-200/70 rounded-lg animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="divide-y divide-gray-50">
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="px-5 py-3.5 flex gap-6">
            {[...Array(cols)].map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
