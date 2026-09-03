import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';
import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import MasterOnboarding from '@/components/master/MasterOnboarding';
import MasterCabinet from '@/components/master/MasterCabinet';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

/**
 * /master — master home:
 * not signed in → auth · no master profile → onboarding · profile → cabinet
 */
export default async function MasterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const profileId = await getSessionProfileId();

  if (!profileId) {
    return (
      <>
        <Header />
        <main className="px-5 py-10">
          <AuthForm />
        </main>
      </>
    );
  }

  const { db } = getDb();
  const profile = await db.getProfile(profileId);
  if (!profile) {
    return (
      <>
        <Header />
        <main className="px-5 py-10">
          <AuthForm />
        </main>
      </>
    );
  }

  const master = await db.getMasterByUserId(profile.id);

  return (
    <>
      <Header />
      {master ? (
        <MasterCabinet />
      ) : (
        <main className="px-5">
          <MasterOnboarding
            initial={{
              fullName: profile.fullName,
              whatsappNumber: profile.whatsappNumber,
              specializations: [],
              workCities: [],
              employmentType: null,
              travelRadiusKm: null,
              languages: [],
              hourlyRate: null,
            }}
          />
        </main>
      )}
    </>
  );
}
