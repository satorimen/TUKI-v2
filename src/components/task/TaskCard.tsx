'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CITIES, cityName } from '@/lib/geo/cities';
import { categoryName } from '@/lib/tasks/categories';
import type { TaskDraft } from '@/lib/ai/types';

/**
 * Read-only preview of the structured task card.
 * Inline editing (city dropdown) happens here; everything else is edited via chat.
 */
export default function TaskCard({ draft }: { draft: TaskDraft }) {
  const t = useTranslations('task');
  const tc = useTranslations('chat');
  const locale = useLocale();

  const budget =
    draft.budget_ils.min != null && draft.budget_ils.max != null
      ? tc('budgetRange', { min: draft.budget_ils.min, max: draft.budget_ils.max })
      : draft.budget_ils.max != null
        ? tc('budgetUpTo', { max: draft.budget_ils.max })
        : null;

  const city = draft.cityId ? cityName(draft.cityId, locale) : draft.city;

  const rows: { label: string; value: string | null }[] = [
    { label: t('city'), value: city },
    { label: t('budget'), value: budget },
    { label: t('area'), value: draft.area_sqm ? tc('sqm', { area: draft.area_sqm }) : null },
    { label: t('timeline'), value: draft.timeline },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-outline-variant dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        {t('taskCard')}
      </h3>

      {draft.subtasks.length > 0 && (
        <ul className="mb-4 space-y-2">
          {draft.subtasks.map((subtask, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl bg-surface-container p-3 dark:bg-secondary-container"
            >
              <span className="text-xl leading-none">
                {categoryName(subtask.category, locale) ? '✅' : ''}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{subtask.title}</p>
                <p className="text-sm text-on-surface-variant">
                  {categoryName(subtask.category, locale)}
                </p>
                {subtask.details && (
                  <p className="mt-1 text-sm text-on-surface-variant/70 dark:text-on-surface-variant">
                    {subtask.details}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        {rows.map(
          (row) =>
            row.value && (
              <div key={row.label}>
                <dt className="text-on-surface-variant">{row.label}</dt>
                <dd className="font-medium">{row.value}</dd>
              </div>
            )
        )}
      </dl>
    </div>
  );
}
