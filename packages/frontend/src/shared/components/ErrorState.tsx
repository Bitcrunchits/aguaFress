interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Ocurrió un error inesperado',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
      <div className="text-error text-4xl">⚠</div>
      <p className="text-center text-text-secondary">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-brand-teal px-4 py-2 text-white transition-colors hover:bg-brand-teal/90"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
