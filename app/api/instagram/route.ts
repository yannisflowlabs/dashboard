import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { prisma } from "@/lib/prisma";

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const INSTAGRAM_USERNAME = "yannisflowlabs";
const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

async function scrapeAndBuild() {
  const [profileRun, postsRun] = await Promise.all([
    client.actor("apify/instagram-profile-scraper").call({ usernames: [INSTAGRAM_USERNAME] }),
    client.actor("apify/instagram-post-scraper").call({ username: [INSTAGRAM_USERNAME], resultsLimit: 50 }),
  ]);

  const [profileData, postsData] = await Promise.all([
    client.dataset(profileRun.defaultDatasetId).listItems(),
    client.dataset(postsRun.defaultDatasetId).listItems(),
  ]);

  if (!profileData.items.length) throw new Error("Aucune donnée de profil retournée");

  const p = profileData.items[0] as Record<string, unknown>;

  const posts = (postsData.items as Record<string, unknown>[]).map((post) => ({
    id: post.id as string,
    type: post.type as string,
    shortCode: post.shortCode as string,
    url: `https://www.instagram.com/p/${post.shortCode}/`,
    imageUrl: (post.displayUrl ?? post.thumbnailUrl) as string,
    caption: (post.caption as string | null)?.slice(0, 200) ?? null,
    likes: (post.likesCount as number) ?? 0,
    comments: (post.commentsCount as number) ?? 0,
    timestamp: post.timestamp as string,
  })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Snapshot quotidien
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const existingToday = await prisma.instagramSnapshot.findFirst({ where: { createdAt: { gte: today } } });
  if (!existingToday) {
    await prisma.instagramSnapshot.create({
      data: { followers: p.followersCount as number, postsCount: p.postsCount as number },
    });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const snapshots = await prisma.instagramSnapshot.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: "asc" },
  });

  const followersCount = p.followersCount as number;
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments, 0);
  const avgEngagement = posts.length > 0
    ? Math.round(((totalLikes + totalComments) / posts.length / followersCount) * 10000) / 100 : 0;

  const byDay: Record<number, { totalEng: number; count: number }> = {};
  const byHour: Record<number, { totalEng: number; count: number }> = {};
  for (const post of posts) {
    if (!post.timestamp) continue;
    const d = new Date(post.timestamp);
    const eng = post.likes + post.comments;
    const day = d.getDay(); if (!byDay[day]) byDay[day] = { totalEng: 0, count: 0 }; byDay[day].totalEng += eng; byDay[day].count += 1;
    const hour = d.getHours(); if (!byHour[hour]) byHour[hour] = { totalEng: 0, count: 0 }; byHour[hour].totalEng += eng; byHour[hour].count += 1;
  }

  const result = {
    username: p.username as string,
    fullName: p.fullName as string,
    biography: p.biography as string,
    followers: followersCount,
    following: p.followsCount as number,
    postsCount: p.postsCount as number,
    verified: p.verified as boolean,
    profilePicUrl: p.profilePicUrlHD as string,
    externalUrl: p.externalUrl as string | null,
    recentPosts: posts,
    snapshots: snapshots.map(s => ({ date: s.createdAt.toISOString().slice(0, 10), followers: s.followers })),
    bestTimes: {
      bestDays: Object.entries(byDay).map(([day, v]) => ({ day: Number(day), label: DAYS_FR[Number(day)], avgEng: Math.round(v.totalEng / v.count) })).sort((a, b) => b.avgEng - a.avgEng),
      bestHours: Object.entries(byHour).map(([hour, v]) => ({ hour: Number(hour), label: `${hour}h`, avgEng: Math.round(v.totalEng / v.count) })).sort((a, b) => b.avgEng - a.avgEng).slice(0, 5),
    },
    stats: {
      avgLikes: posts.length > 0 ? Math.round(totalLikes / posts.length) : 0,
      avgComments: posts.length > 0 ? Math.round(totalComments / posts.length) : 0,
      engagementRate: avgEngagement,
      totalPosts: posts.length,
    },
    cachedAt: new Date().toISOString(),
  };

  // Sauvegarder en cache
  await prisma.instagramCache.upsert({
    where: { id: 1 },
    update: { data: JSON.stringify(result), updatedAt: new Date() },
    create: { id: 1, data: JSON.stringify(result), updatedAt: new Date() },
  });

  return result;
}

// GET — retourne le cache instantanément
export async function GET() {
  try {
    const cache = await prisma.instagramCache.findUnique({ where: { id: 1 } });
    if (cache) {
      return NextResponse.json(JSON.parse(cache.data));
    }
    // Pas de cache — scrape au premier chargement
    const result = await scrapeAndBuild();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — force un nouveau scrape
export async function POST() {
  try {
    const result = await scrapeAndBuild();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
