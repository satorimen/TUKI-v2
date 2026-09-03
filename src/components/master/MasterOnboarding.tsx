'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, Check, MapPin, Search, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { CATEGORIES, type CategoryId } from '@/lib/tasks/categories';
import { CITIES } from '@/lib/geo/cities';
import { CLUSTERS, type ClusterId } from '@/lib/geo/clusters';
import type { Language } from '@/lib/db/types';

type EmploymentType = 'individual' | 'company' | 'team';

interface Props {
  initial?: {
    fullName?: string | null;
    whatsappNumber?: string | null;
    specializations?: CategoryId[];
    workCities?: string[];
    experienceYears?: number | null;
    bio?: string | null;
    employmentType?: EmploymentType | null;
    travelRadiusKm?: number | null;
    languages?: string[];
    hourlyRate?: number | null;
  };
  onSaved?: () => void;
}

const ALL_CITY_IDS = CITIES.map((c) => c.id);
const EMPLOYMENT_TYPES: EmploymentType[] = ['individual', 'team', 'company'];
const LANGUAGE_OPTIONS = ['he', 'ru', 'en', 'ar', 'am', 'fr', 'es'] as const;
const TRAVEL_RADIUS_OPTIONS = [10, 25, 50, 100] as const;

export default function MasterOnboarding({ initial, onSaved }: Props) {
  const t = useTranslations('master');
  const tc = useTranslations('common');
  const locale = useLocale() as Language;
  const router = useRouter();

  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [whatsapp, setWhatsapp] = useState(initial?.whatsappNumber ?? '');
  const [specs, setSpecs] = useState<Set<CategoryId>>(
    new Set(initial?.specializations ?? [])
  );
  const [cities, setCities] = useState<Set<string>>(new Set(initial?.workCities ?? []));
  const [experience, setExperience] = useState<string>(
    initial?.experienceYears != null ? String(initial.experienceYears) : ''
  );
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(
    initial?.employmentType ?? null
  );
  const [travelRadius, setTravelRadius] = useState<number | null>(
    initial?.travelRadiusKm ?? null
  );
  const [languages, setLanguages] = useState<Set<string>>(
    new Set(initial?.languages ?? [])
  );
  const [hourlyRate, setHourlyRate] = useState<string>(
    initial?.hourlyRate != null ? String(initial.hourlyRate) : ''
  );

  const [citySearch, setCitySearch] = useState('');
  const [openClusters, setOpenClusters] = useState<Set<ClusterId>>(new Set());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const citiesByCluster = useMemo(() => {
    const map = new Map<ClusterId, typeof CITIES>();
    for (const cluster of Object.values(CLUSTERS)) map.set(cluster.id, []);
    for (const city of CITIES) map.get(city.cluster)?.push(city);
    return map;
  }, []);

  const search = citySearch.trim().toLowerCase();
  const matchedCityIds = useMemo(() => {
    if (!search) return null;
    return new Set(
      CITIES.filter((c) =>
        Object.values(c.name).some((n) => n.toLowerCase().includes(search))
      ).map((c) => c.id)
    );
  }, [search]);

  const allSelected = cities.size === ALL_CITY_IDS.length && ALL_CITY_IDS.length > 0;

  function toggleSpec(id: CategoryId) {
    setSpecs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCity(id: string) {
    setCities((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCluster(id: ClusterId) {
    setOpenClusters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clusterState(clusterId: ClusterId): 'all' | 'some' | 'none' {
    const ids = citiesByCluster.get(clusterId) ?? [];
    const selected = ids.filter((c) => cities.has(c.id)).length;
    if (selected === 0) return 'none';
    if (selected === ids.length) return 'all';
    return 'some';
  }

  function toggleClusterAll(clusterId: ClusterId) {
    const ids = (citiesByCluster.get(clusterId) ?? []).map((c) => c.id);
    setCities((prev) => {
      const next = new Set(prev);
      const state = clusterState(clusterId);
      if (state === 'all') ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleNationwide() {
    setCities((prev) =>
      prev.size === ALL_CITY_IDS.length ? new Set() : new Set(ALL_CITY_IDS)
    );
  }

  const canSave = specs.size > 0 && cities.size > 0;

  async function handleSave() {
    if (!canSave) {
      setError(t('validation'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/master/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim() || null,
          whatsapp: whatsapp.trim() || undefined,
          specializations: [...specs],
          workCities: [...cities],
          experienceYears: experience ? Number(experience) : undefined,
          bio: bio.trim() || null,
          employmentType: employmentType ?? undefined,
          travelRadiusKm: travelRadius ?? undefined,
          languages: [...languages],
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setSaved(true);
      if (onSaved) {
        setTimeout(onSaved, 900);
      } else {
        setTimeout(() => router.push('/master/feed'), 900);
      }
    } catch {
      setError(tc('error'));
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary">
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
        <p className="text-lg font-semibold text-on-surface">{t('saved')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-40 pt-4">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-on-surface text-balance">
          {t('onboardingTitle')}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-on-surface-variant text-pretty">
          {t('onboardingSubtitle')}
        </p>
      </header>

      {/* ── Specializations ─────────────────────────── */}
      <section className="mb-6">
        <SectionHeader
          title={t('specsSection')}
          hint={t('specializationsHint')}
          count={specs.size}
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const active = specs.has(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleSpec(cat.id)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition ${
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline/40 bg-surface-container text-on-surface active:scale-95'
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {cat.icon}
                </span>
                <span>{cat.name[locale]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Cities ──────────────────────────────────── */}
      <section className="mb-6">
        <SectionHeader
          title={t('citiesSection')}
          hint={t('workCitiesHint')}
          count={cities.size}
        />

        <div className="mb-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
              aria-hidden
            />
            <input
              type="search"
              inputMode="search"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder={t('searchCity')}
              className="w-full rounded-xl border border-outline/40 bg-surface-container ps-9 pe-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary"
            />
          </div>
          {cities.size > 0 && (
            <button
              type="button"
              onClick={() => setCities(new Set())}
              className="flex shrink-0 items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface-variant active:scale-95"
            >
              <X className="h-4 w-4" aria-hidden />
              {t('clearCities')}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={toggleNationwide}
          aria-pressed={allSelected}
          className={`mb-3 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition ${
            allSelected
              ? 'border-primary bg-primary/15 text-on-surface'
              : 'border-outline/40 bg-surface-container text-on-surface active:scale-[0.99]'
          }`}
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {t('wholeCountry')}
          </span>
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
              allSelected
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline/60'
            }`}
          >
            {allSelected && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
        </button>

        {/* Search results (flat) */}
        {matchedCityIds ? (
          <div className="flex flex-wrap gap-2">
            {CITIES.filter((c) => matchedCityIds.has(c.id)).map((city) => (
              <CityChip
                key={city.id}
                label={city.name[locale]}
                active={cities.has(city.id)}
                onClick={() => toggleCity(city.id)}
              />
            ))}
            {matchedCityIds.size === 0 && (
              <p className="py-3 text-sm text-on-surface-variant">{t('nothingFound')}</p>
            )}
          </div>
        ) : (
          /* Collapsible region groups */
          <div className="flex flex-col gap-2">
            {Object.values(CLUSTERS).map((cluster) => {
              const list = citiesByCluster.get(cluster.id) ?? [];
              const state = clusterState(cluster.id);
              const open = openClusters.has(cluster.id);
              const selectedInCluster = list.filter((c) => cities.has(c.id)).length;
              return (
                <div
                  key={cluster.id}
                  className="overflow-hidden rounded-xl border border-outline/30 bg-surface-container/60"
                >
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleCluster(cluster.id)}
                      className="flex flex-1 items-center gap-2 px-4 py-3 text-start"
                      aria-expanded={open}
                    >
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-on-surface-variant transition-transform ${
                          open ? 'rotate-90' : ''
                        }`}
                        aria-hidden
                      />
                      <span className="text-sm font-semibold text-on-surface">
                        {cluster.name[locale]}
                      </span>
                      {selectedInCluster > 0 && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                          {selectedInCluster}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleClusterAll(cluster.id)}
                      className={`mr-2 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                        state === 'all'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {t('selectAllRegion')}
                    </button>
                  </div>
                  {open && (
                    <div className="flex flex-wrap gap-2 border-t border-outline/20 p-3">
                      {list.map((city) => (
                        <CityChip
                          key={city.id}
                          label={city.name[locale]}
                          active={cities.has(city.id)}
                          onClick={() => toggleCity(city.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Work preferences ────────────────────────── */}
      <section className="mb-6">
        <SectionHeader title={t('preferencesSection')} hint={t('preferencesHint')} />
        <div className="flex flex-col gap-4">
          {/* employment type */}
          <div>
            <span className="mb-2 block text-xs font-medium text-on-surface-variant">
              {t('employmentType')}
            </span>
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_TYPES.map((et) => {
                const active = employmentType === et;
                return (
                  <button
                    key={et}
                    type="button"
                    onClick={() => setEmploymentType(active ? null : et)}
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline/40 bg-surface-container text-on-surface active:scale-95'
                    }`}
                  >
                    {t(`employment_${et}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* languages */}
          <div>
            <span className="mb-2 block text-xs font-medium text-on-surface-variant">
              {t('languages')}
            </span>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => {
                const active = languages.has(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() =>
                      setLanguages((prev) => {
                        const next = new Set(prev);
                        next.has(lang) ? next.delete(lang) : next.add(lang);
                        return next;
                      })
                    }
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline/40 bg-surface-container text-on-surface active:scale-95'
                    }`}
                  >
                    {t(`lang_${lang}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* travel radius */}
          <div>
            <span className="mb-2 block text-xs font-medium text-on-surface-variant">
              {t('travelRadius')}
            </span>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_RADIUS_OPTIONS.map((km) => {
                const active = travelRadius === km;
                return (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setTravelRadius(active ? null : km)}
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline/40 bg-surface-container text-on-surface active:scale-95'
                    }`}
                  >
                    {t('radiusKm', { km })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* hourly rate */}
          <Field label={t('hourlyRate')} hint={t('hourlyRateHint')}>
            <div className="relative">
              <input
                value={hourlyRate}
                onChange={(e) =>
                  setHourlyRate(e.target.value.replace(/\D/g, '').slice(0, 5))
                }
                inputMode="numeric"
                placeholder="150"
                className="w-full rounded-xl border border-outline/40 bg-surface-container ps-4 pe-12 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary"
              />
              <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">
                ₪/h
              </span>
            </div>
          </Field>
        </div>
      </section>

      {/* ── Contact / about ─────────────────────────── */}
      <section className="mb-6">
        <SectionHeader title={t('contactSection')} />
        <div className="flex flex-col gap-3">
          <Field label={t('fullName')}>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-outline/40 bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </Field>
          <Field label={t('whatsapp')} hint={t('whatsappHint')}>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              inputMode="tel"
              placeholder="+972 5X-XXX-XXXX"
              className="w-full rounded-xl border border-outline/40 bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary"
            />
          </Field>
          <Field label={t('experience')}>
            <input
              value={experience}
              onChange={(e) => setExperience(e.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
              className="w-full rounded-xl border border-outline/40 bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </Field>
          <Field label={t('bio')}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder={t('bioPlaceholder')}
              className="w-full resize-none rounded-xl border border-outline/40 bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary"
            />
          </Field>
        </div>
      </section>

      {/* ── Sticky save bar ─────────────────────────── */}
      <div className="fixed inset-x-0 bottom-[4.5rem] z-10 mx-auto max-w-md px-4">
        <div className="rounded-2xl border border-outline/30 bg-surface-container-high/95 p-3 shadow-lg shadow-black/30 backdrop-blur">
          {error && (
            <p className="mb-2 text-center text-xs font-medium text-error">{error}</p>
          )}
          <div className="mb-2 flex items-center justify-center gap-4 text-xs text-on-surface-variant">
            <span>
              {t('specializations')}: <b className="text-on-surface">{specs.size}</b>
            </span>
            <span>
              {t('workCities')}: <b className="text-on-surface">{cities.size}</b>
            </span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary transition active:scale-[0.99] disabled:opacity-40"
          >
            {saving ? tc('loading') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  hint,
  count,
}: {
  title: string;
  hint?: string;
  count?: number;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-on-surface">{title}</h2>
        {count != null && count > 0 && (
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
            {count}
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-on-surface-variant">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-on-surface-variant">{hint}</span>}
    </label>
  );
}

function CityChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? 'border-primary bg-primary text-on-primary'
          : 'border-outline/40 bg-surface-container text-on-surface active:scale-95'
      }`}
    >
      {label}
    </button>
  );
}
