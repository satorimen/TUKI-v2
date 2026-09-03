'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cityName } from '@/lib/geo/cities';
import { categoryName } from '@/lib/tasks/categories';
import MasterOnboarding from '@/components/master/MasterOnboarding';
import type { Bid, MasterProfile, Profile } from '@/lib/db/types';

interface CabinetBidTask {
  id: string;
  status: string;
  cityId: string;
  city: string;
  title: string;
  budgetMax: number | null;
}

interface CabinetData {
  profile: Profile;
  master: MasterProfile;
  bids: { bid: Bid; task: CabinetBidTask | null }[];
}

/** Master's personal cabinet: stats, availability toggle, own bids, profile edit */
export default function MasterCabinet() {
  const locale = useLocale() as 'he' | 'ru' | 'en';
  const t = useTranslations('cabinet');
  const tp = useTranslations('taskPage');

  const [data, setData] = useState<CabinetData | null>(null);
  const [edit, setEdit] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function load() {
    const res = await fetch('/api/master/dashboard');
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive() {
    if (!data || toggling) return;
    setToggling(true);
    try {
      const res = await fetch('/api/master/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !data.master.isActive }),
      });
      if (res.ok) {
        const { master } = await res.json();
        setData((d) => (d ? { ...d, master } : d));
      }
    } finally {
      setToggling(false);
    }
  }

  if (edit && data) {
    return (
      <MasterOnboarding
        key={data.master.id}
        initial={{
          fullName: data.profile.fullName ?? "",
          whatsappNumber: data.profile.whatsappNumber ?? data.profile.phone ?? "",
          specializations: data.master.specializations ?? [],
          workCities: data.master.workCities ?? [],
          experienceYears: data.master.experienceYears ?? null,
          bio: data.master.bio ?? "",
        }}
        onSaved={() => {
          setEdit(false);
          load();
        }}
      />
    );
  }

  if (!data) {
    return <p className="px-5 py-10 text-on-surface-variant">…</p>;
  }

  const { master } = data;
  const activeBids = data.bids.filter((b) => b.bid.status === 'pending');

  return (
    <main className="px-5 pb-10 pt-6">
      <h1 className="text-xl font-bold">{t('title')}</h1>

      {/* Availability toggle — big, touch friendly */}
      <button
        onClick={toggleActive}
        disabled={toggling}
        className={`mt-5 flex w-full items-center justify-between rounded-2xl px-5 py-4 transition active:scale-[0.98] ${
          master.isActive ? 'bg-green-500/15 text-green-400' : 'bg-surface-container-low text-on-surface-variant'
        }`}
      >
        <span className="flex items-center gap-3 text-sm font-semibold">
          <span className={`h-2.5 w-2.5 rounded-full ${master.isActive ? 'bg-green-400' : 'bg-neutral-600'}`} />
          {master.isActive ? t('statusActive') : t('statusInactive')}
        </span>
        {/* switch */}
        <span
          className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
            master.isActive ? 'justify-end bg-green-500/40' : 'justify-start bg-secondary-container'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-white" />
        </span>
      </button>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { value: master.rating > 0 ? master.rating.toFixed(1) : '—', label: t('rating'), icon: '★' },
          { value: master.reviewsCount, label: t('reviews'), icon: '💬' },
          { value: master.completedTasks, label: t('completed'), icon: '✅' },
        ].map(({ value, label, icon }) => (
          <div key={label} className="rounded-2xl bg-surface-container-low p-3.5 text-center">
            <p className="text-lg font-bold">
              {icon} {value}
            </p>
            <p className="mt-0.5 text-[11px] text-on-surface-variant">{label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Link
          href="/master/feed"
          className="flex items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          📋 {t('feed')}
          {activeBids.length > 0 && (
            <span className="ms-1.5 rounded-full bg-white/20 px-1.5 text-xs">{activeBids.length}</span>
          )}
        </Link>
        <button
          onClick={() => setEdit(true)}
          className="rounded-full border border-outline py-3.5 text-sm font-medium text-on-surface-variant transition active:scale-[0.98]"
        >
          ✏️ {t('edit')}
        </button>
      </div>

      {/* My bids */}
      <h2 className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        {t('activeBids')}
      </h2>
      {data.bids.length === 0 && (
        <p className="rounded-2xl bg-surface-container-low p-5 text-center text-sm text-on-surface-variant">
          {t('noBids')}
        </p>
      )}
      <div className="space-y-2.5">
        {data.bids.map(({ bid, task }) => (
          <Link
            key={bid.id}
            href={`/task/${bid.taskId}` as any}
            className="block rounded-2xl bg-surface-container-low p-4 transition active:scale-[0.98]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {task?.title ?? bid.taskId.slice(0, 8)}
                </p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  📍 {task ? cityName(task.cityId, locale) : '—'}
                  {bid.price != null && ` · ₪ ${bid.price}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  bid.status === 'selected'
                    ? 'bg-green-500/15 text-green-400'
                    : bid.status === 'pending'
                      ? 'bg-amber-500/15 text-amber-500'
                      : 'bg-secondary-container text-on-surface-variant'
                }`}
              >
                {t(`bid_${bid.status}` as any)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
