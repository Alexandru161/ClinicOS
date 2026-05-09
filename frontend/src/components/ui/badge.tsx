import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide', {
  variants: {
    variant: {
      default: 'bg-primary/15 text-primary',
      secondary: 'bg-white/8 text-foreground',
      outline: 'border border-border text-muted-foreground',
      success: 'bg-emerald-500/15 text-emerald-300',
      warning: 'bg-amber-500/15 text-amber-300'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}