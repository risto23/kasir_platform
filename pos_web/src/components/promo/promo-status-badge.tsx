import type { PromoEffectiveStatus, PromoStatus } from '@/types/promo';

type PromoStatusBadgeProps = {
  value: PromoStatus | PromoEffectiveStatus;
  variant?: 'base' | 'effective';
};

function getClassName(
  value: PromoStatus | PromoEffectiveStatus,
  variant: 'base' | 'effective',
) {
  if (value === 'ACTIVE' && variant === 'base') {
    return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  }

  if (value === 'INACTIVE' && variant === 'base') {
    return 'bg-slate-200 text-slate-700 border border-slate-300';
  }

  if (value === 'ACTIVE' && variant === 'effective') {
    return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  }

  if (value === 'INACTIVE' && variant === 'effective') {
    return 'bg-slate-200 text-slate-700 border border-slate-300';
  }

  if (value === 'SCHEDULED') {
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  }

  if (value === 'EXPIRED') {
    return 'bg-rose-100 text-rose-700 border border-rose-200';
  }

  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

export function PromoStatusBadge({
  value,
  variant = 'effective',
}: PromoStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getClassName(
        value,
        variant,
      )}`}
    >
      {value}
    </span>
  );
}