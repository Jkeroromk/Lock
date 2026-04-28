import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

const USER_SELECT = { id: true, name: true, username: true, avatarEmoji: true, avatarImage: true };

function formatUser(u: { id: string; name: string | null; username: string | null; avatarEmoji: string | null; avatarImage: string | null }) {
  return {
    id: u.id,
    name: u.name || u.username || '用户',
    avatar: u.avatarEmoji || (u.name || u.username || 'U').charAt(0).toUpperCase(),
    avatarImage: u.avatarImage ?? null,
  };
}

// GET /api/social/moments/[id]/comments — all comments on a post
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;

  try {
    const comments = await prisma.postComment.findMany({
      where: { postId: params.id },
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        user: formatUser(c.user),
      }))
    );
  } catch (error) {
    console.error('[GET /api/social/moments/[id]/comments]', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/social/moments/[id]/comments — add a comment
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { content } = await request.json();
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const comment = await prisma.postComment.create({
      data: { postId: params.id, userId, content: content.trim() },
      include: { user: { select: USER_SELECT } },
    });

    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: formatUser(comment.user),
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/social/moments/[id]/comments]', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
