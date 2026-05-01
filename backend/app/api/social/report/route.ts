import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// POST /api/social/report — report a post
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { postId, reason } = await request.json();
  if (!postId || !reason) {
    return NextResponse.json({ error: 'postId and reason are required' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  if (post.userId === userId) {
    return NextResponse.json({ error: 'Cannot report your own post' }, { status: 400 });
  }

  await prisma.postReport.upsert({
    where: { postId_reporterId: { postId, reporterId: userId } },
    create: { postId, reporterId: userId, reason },
    update: { reason },
  });

  return NextResponse.json({ success: true });
}
