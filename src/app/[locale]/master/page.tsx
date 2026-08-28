import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import AuthForm from '@/components/auth/AuthForm';
import MasterOnboarding from '@/components/master/MasterOnboarding';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

/**
 * /master — server component:
 * not signed in → auth form; signed in → onboarding/edit profile
 */
export default async function MasterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const profileId = await getSessionProfileId();
  let content: React.ReactNode;

  if (!profileId) {
    content = (
      <div className="py-16">
        <AuthForm />
      </div>
    );
  } else {
    const { db } = getDb();
    const [profile, master] = await Promise.all([
      db.getProfile(profileId),
      db.getMasterByUserId(profileId),
    ]);
    content =
      profile ? (
        <MasterOnboarding profile={profile} master={master} />
      ) : (
        <div className="py-16 text-center">
          <p>
            <Link href="/auth">auth</Link>
          </p>
        </div>
      );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4">{content}</main>
    </>
  );
}
