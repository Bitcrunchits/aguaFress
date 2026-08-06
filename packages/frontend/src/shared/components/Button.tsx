import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm',
  outline:
    'border border-brand-teal text-brand-teal hover:bg-brand-teal/5',
  ghost:
    'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  destructive:
    'bg-error text-white hover:bg-error/90 shadow-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  asChild = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const allClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (asChild) {
    return <span className={allClasses}>{children}</span>;
  }

  return (
    <button className={allClasses} {...props}>
      {children}
    </button>
  );
}
