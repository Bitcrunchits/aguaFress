interface EmptyStateProps {
  message?: string;
  description?: string;
}

export default function EmptyState({
  message = 'Sin datos',
  description,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8">
      <div className="text-text-muted text-3xl">📭</div>
      <p className="text-center font-medium text-text-primary">{message}</p>
      {description && (
        <p className="text-center text-sm text-text-secondary">{description}</p>
      )}
    </div>
  );
}
