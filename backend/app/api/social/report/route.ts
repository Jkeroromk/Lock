import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { AUTO_HIDE_REPORT_THRESHOLD, canViewPost } from '@/lib/blocks';

const MAX_REASON_LENGTH = 500;

// POST /api/social/report — report a post.
// The post is hidden from the reporter immediately, and from everyone except
// its author once it reaches AUTO_HIDE_REPORT_THRESHOLD distinct reports.
// Reports stay in post_reports for manual review.
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let postId: unknown;
  let reason: unknown;
  try {
    ({ postId, reason } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof postId !== 'string' || !postId || typeof reason !== 'string' || !reason.trim()) {
    return NextResponse.json({ error: 'postId and reason are required' }, { status: 400 });
  }
  const trimmedReason = reason.trim().slice(0, MAX_REASON_LENGTH);

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, hiddenAt: true },
    });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    if (post.userId === userId) {
      return NextResponse.json({ error: 'Cannot report your own post' }, { status: 400 });
    }

    // Only someone who can see the post (or already reported it) may report it.
    const alreadyReported = await prisma.postReport.findUnique({
      where: { postId_reporterId: { postId, reporterId: userId } },
      select: { id: true },
    });
    if (!alreadyReported && !(await canViewPost(userId, post))) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    await prisma.postReport.upsert({
      where: { postId_reporterId: { postId, reporterId: userId } },
      create: { postId, reporterId: userId, reason: trimmedReason },
      update: { reason: trimmedReason },
    });

    let hidden = !!post.hiddenAt;
    if (!hidden) {
      const reportCount = await prisma.postReport.count({ where: { postId } });
      if (reportCount >= AUTO_HIDE_REPORT_THRESHOLD) {
        await prisma.post.update({ where: { id: postId }, data: { hiddenAt: new Date() } });
        hidden = true;
      }
    }

    console.warn('[POST /api/social/report] post reported', { postId, hidden });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/social/report]', error);
    return NextResponse.json({ error: 'Failed to report post' }, { status: 500 });
  }
}
