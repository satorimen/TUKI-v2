import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionProfileId } from '@/lib/auth/session';
import { pushNotification } from '@/lib/notifications/store';
import { cityName } from '@/lib/geo/cities';
import { categoryName } from '@/lib/tasks/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public master card shown to the client (contacts hidden until selection) */
function publicMaster(master: any, profile: any) {
  return {
    masterId: master.id,
    name: profile?.fullName || '—',
    specializations: master.specializations,
    experienceYears: master.experienceYears,
    bio: master.bio,
    rating: master.rating,
    reviewsCount: master.reviewsCount,
    completedTasks: master.completedTasks,
  };
}

/**
 * GET /api/tasks/[id] — task details + bids.
 * · task client → full bids with master cards, own contact info
 * · bid author (master) → own bid only
 * · otherwise → 403
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { db } = getDb();
    const task = await db.getTask(params.id);
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 });

    const isClient = task.clientId === profileId;
    const master = await db.getMasterByUserId(profileId);
    const isBidder = master ? (await db.listBidsByMaster(master.id)).some((b) => b.taskId === task.id) : false;

    if (!isClient && !isBidder) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const bids = await db.listBidsByTask(task.id);

    if (isClient) {
      // enrich each bid with a public master card + "best match" ranking
      const enriched = await Promise.all(
        bids.map(async (bid) => {
          const bidMaster = await db.getMaster(bid.masterId);
          const masterProfile = bidMaster ? await db.getProfile(bidMaster.userId) : null;
          return { bid, master: bidMaster ? publicMaster(bidMaster, masterProfile) : null };
        })
      );

      // ranking: rating desc, then price asc (within budget preferred)
      const ranked = [...enriched].sort((a, b) => {
        const ma = a.master ?? { rating: 0, reviewsCount: 0 };
        const mb = b.master ?? { rating: 0, reviewsCount: 0 };
        if (mb.rating !== ma.rating) return mb.rating - ma.rating;
        return (a.bid.price ?? Infinity) - (b.bid.price ?? Infinity);
      });
      const bestMatchId = ranked.length > 0 && task.status === 'published' ? ranked[0].bid.id : null;

      // when a bid is selected — expose contacts for the matchmaker handoff
      let selected: { master: any; profile: any; whatsappUrl: string } | null = null;
      if (task.selectedBidId) {
        const selBid = bids.find((b) => b.id === task.selectedBidId);
        if (selBid) {
          const selMaster = await db.getMaster(selBid.masterId);
          const selProfile = selMaster ? await db.getProfile(selMaster.userId) : null;
          selected = {
            master: selMaster ? publicMaster(selMaster, selProfile) : null,
            profile: selProfile
              ? { name: selProfile.fullName, whatsapp: selProfile.whatsappNumber }
              : null,
            whatsappUrl: selProfile?.whatsappNumber
              ? whatsappLink(selProfile.whatsappNumber, task)
              : '',
          };
        }
      }

      return NextResponse.json({ task, bids: ranked, bestMatchId, selected });
    }

    // master (bid author): task + own bid only, competitors hidden (anti-dumping)
    const myBid = bids.find((b) => b.masterId === master!.id) ?? null;
    return NextResponse.json({ task, myBid, bidsCount: bids.length });
  } catch (error) {
    console.error('[GET /api/tasks/:id]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/** POST /api/tasks/[id] — client selects a bid → contacts handoff (matchmaker model) */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { bidId } = (await request.json()) as { bidId?: string };
    if (!bidId) return NextResponse.json({ error: 'bid_id_required' }, { status: 400 });

    const { db } = getDb();
    const task = await db.getTask(params.id);
    if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
    if (task.clientId !== profileId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (task.status !== 'published') {
      return NextResponse.json({ error: 'task_not_published' }, { status: 409 });
    }

    const bids = await db.listBidsByTask(task.id);
    const selectedBid = bids.find((b) => b.id === bidId);
    if (!selectedBid) return NextResponse.json({ error: 'bid_not_found' }, { status: 404 });

    // select bid, reject others, assign task
    await db.updateBidStatus(bidId, 'selected');
    for (const b of bids) {
      if (b.id !== bidId && b.status === 'pending') await db.updateBidStatus(b.id, 'rejected');
    }
    await db.setTaskSelectedBid(task.id, bidId);
    await db.updateTaskStatus(task.id, 'assigned');

    const selMaster = await db.getMaster(selectedBid.masterId);
    if (selMaster) {
      const masterProfile = await db.getProfile(selMaster.userId);
      const notifText =
        task.language === 'he'
          ? 'נבחרתם! הלקוח ממתין לכם בוואטסאפ 🎉'
          : task.language === 'ru'
            ? 'Вас выбрали! Клиент ждёт вас в WhatsApp 🎉'
            : 'You were selected! The client awaits you on WhatsApp 🎉';
      pushNotification({
        userId: selMaster.userId,
        type: 'bid_selected',
        taskId: task.id,
        text: notifText,
        link: `/task/${task.id}`,
      });

      // expose both sides' contacts (matchmaker handoff)
      const clientProfile = await db.getProfile(task.clientId);
      return NextResponse.json({
        ok: true,
        masterWhatsappUrl: masterProfile?.whatsappNumber
          ? whatsappLink(masterProfile.whatsappNumber, task)
          : null,
        clientWhatsappUrl: clientProfile?.whatsappNumber
          ? `https://wa.me/${clientProfile.whatsappNumber}`
          : null,
      });
    }

    return NextResponse.json({ ok: true, masterWhatsappUrl: null, clientWhatsappUrl: null });
  } catch (error) {
    console.error('[POST /api/tasks/:id]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

function whatsappLink(number: string, task: any): string {
  const city = cityName(task.cityId, task.language);
  const work = task.categories?.[0]
    ? categoryName(task.categories[0], task.language)
    : '';
  const text =
    task.language === 'he'
      ? `שלום! אני הלקוח מ-TUKI לגבי ${work} ב${city} 🙌`
      : task.language === 'ru'
        ? `Здравствуйте! Я клиент с TUKI по поводу «${work}» (${city}) 🙌`
        : `Hi! I'm the client from TUKI regarding ${work} in ${city} 🙌`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
