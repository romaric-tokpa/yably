import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type AdminPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  code: string;
  className?: string;
};

/** En-tête de page : aligné sur la hiérarchie visuelle de l’app mobile (icône + badge module). */
export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  code,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('border-b border-border/70 pb-6', className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <span className="rounded-lg bg-brand-orange-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-orange">
              {code}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
