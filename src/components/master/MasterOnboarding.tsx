'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { CATEGORIES, categoryName } from '@/lib/tasks/categories';
import { CITIES, cityName } from '@/lib/geo/cities';
import { CLUSTERS } from '@/lib/geo/clusters';
import type { Profile, MasterProfile } from '@/lib/db/types';

/**
 * Master onboarding / profile edit form.
 * Shown on /master when the signed-in user has no master profile yet
 * (or as an edit form when they do).
 */
export default function MasterOnboarding({
  profile,
  master,
  onSaved,
}: {
  profile: Profile;
  master: MasterProfile | null;
  /** when provided, called after successful save instead of the standalone success screen */
  onSaved?: () => void;
}) {
  const locale = useLocale() as 'he' | 'ru' | 'en';
  const t = useTranslations('master');
  const router = useRouter();

  const [specializations, setSpecializations] = useState<string[]>(master?.specializations ?? []);
  const [workCities, setWorkCities] = useState<string[]>(master?.workCities ?? []);
  const [experienceYears, setExperienceYears] = useState<string>(
    master?.experienceYears != null ? String(master.experienceYears) : ''
  );
  const [fullName, setFullName] = useState(profile.fullName ?? '');
  const [whatsapp, setWhatsapp] = useState(profile.whatsappNumber ? `+${profile.whatsappNumber}` : '');
  const [bio, setBio] = useState(master?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const citiesByCluster = useMemo(
    () =>
      Object.values(CLUSTERS).map((cluster) => ({
        cluster,
        cities: CITIES.filter((c) => c.cluster === cluster.id),
      })),
    []
  );

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const valid = specializations.length > 0 && workCities.length > 0;

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/master/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specializations,
          workCities,
          experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
          fullName: fullName || undefined,
          whatsapp: whatsapp || undefined,
          bio: bio || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (onSaved) {
        onSaved();
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(t('validation'));
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
          🎉
        </div>
        <h1 className="mb-3 text-2xl font-bold">{t('saved')}</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">{t('onboardingTitle')}</h1>
        <p className="mt-1 text-on-surface-variant">{t('onboardingSubtitle')}</p>
      </div>

      {/* Name + WhatsApp */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('fullName')}</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-outline bg-transparent px-3 py-2.5 outline-none focus:border-primary dark:border-outline"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('whatsapp')}</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="050-1234567"
            dir="ltr"
            className="w-full rounded-xl border border-outline bg-transparent px-3 py-2.5 outline-none focus:border-primary dark:border-outline"
          />
          <p className="mt-1 text-xs text-on-surface-variant">{t('whatsappHint')}</p>
        </div>
      </div>

      {/* Specializations */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          {t('specializations')} <span className="text-on-surface-variant">· {t('specializationsHint')}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.id !== 'other').map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(specializations, setSpecializations, c.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                specializations.includes(c.id)
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline text-on-surface-variant hover:border-primary dark:border-outline dark:text-on-surface-variant'
              }`}
            >
              {c.icon} {categoryName(c.id, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Work cities grouped by cluster */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          {t('workCities')} <span className="text-on-surface-variant">· {t('workCitiesHint')}</span>
        </label>
        <div className="space-y-3">
          {citiesByCluster.map(({ cluster, cities }) => (
            <div key={cluster.id}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {cluster.name[locale]}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => toggle(workCities, setWorkCities, city.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      workCities.includes(city.id)
                        ? 'border-primary bg-primary-container text-on-primary-container dark:bg-primary-container dark:text-primary'
                        : 'border-outline text-on-surface-variant/70 hover:border-primary dark:border-outline dark:text-on-surface-variant'
                    }`}
                  >
                    {cityName(city.id, locale)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Experience + bio */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('experience')}</label>
          <input
            inputMode="numeric"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value.replace(/\D/g, '').slice(0, 2))}
            dir="ltr"
            className="w-full rounded-xl border border-outline bg-transparent px-3 py-2.5 outline-none focus:border-primary dark:border-outline"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">{t('bio')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('bioPlaceholder')}
            rows={2}
            className="w-full resize-none rounded-xl border border-outline bg-transparent px-3 py-2.5 outline-none focus:border-primary dark:border-outline"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={save}
        disabled={!valid || saving}
        className="w-full rounded-full bg-primary py-3.5 text-lg font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('save')}
      </button>
      {!valid && <p className="text-center text-sm text-on-surface-variant">{t('validation')}</p>}
    </div>
  );
}
