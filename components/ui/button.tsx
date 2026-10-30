
import {
  forwardRef,
  type ButtonHTMLAttributes,
} from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    isLoading?: boolean;
  };

const styles: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  danger:
    'bg-red-600 text-white hover:bg-red-700',
  ghost:
    'text-slate-700 hover:bg-slate-100',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      isLoading = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={[
          'inline-flex items-center justify-center gap-2',
          'rounded-xl px-4 py-2.5 text-sm font-semibold',
          'transition-colors focus-visible:outline-2',
          'focus-visible:outline-offset-2',
          'focus-visible:outline-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          styles[variant],
          className,
        ].join(' ')}
        {...props}
      >
        {isLoading ? 'Procesando...' : children}
      </button>
    );
  },
);

export default Button;
