import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// POST /api/social/moments/[id]/like — toggle like
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: params.id, userId } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.postLike.create({ data: { postId: params.id, userId } });
    }

    const count = await prisma.postLike.count({ where: { postId: params.id } });
    return NextResponse.json({ liked: !existing, count });
  } catch (error) {
    console.error('[POST /api/social/moments/[id]/like]', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}
