type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

export function Spinner({ size = 'md' }: SpinnerProps) {
  const dimension = sizeMap[size];

  return (
    <svg
      className="animate-spin text-brand-teal"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox={`0 0 ${dimension} ${dimension}`}
      width={dimension}
      height={dimension}
      aria-label="Cargando"
      role="img"
    >
      <circle
        className="opacity-25"
        cx={dimension / 2}
        cy={dimension / 2}
        r={(dimension / 2) - 2}
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
