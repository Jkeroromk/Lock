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

// GET /api/social/moments — moments feed from self + friends
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const friendships = await prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });
    const friendIds = friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
    const visibleUserIds = [userId, ...friendIds];

    const posts = await prisma.post.findMany({
      where: { userId: { in: visibleUserIds } },
      include: {
        user: { select: USER_SELECT },
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: USER_SELECT } },
          orderBy: { createdAt: 'asc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(
      posts.map((p) => ({
        id: p.id,
        content: p.content,
        mediaUrl: p.mediaUrl ?? null,
        createdAt: p.createdAt,
        isMe: p.userId === userId,
        user: formatUser(p.user),
        likesCount: p.likes.length,
        isLiked: p.likes.some((l) => l.userId === userId),
        commentsCount: p.comments.length,
        previewComments: p.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          user: formatUser(c.user),
        })),
      }))
    );
  } catch (error) {
    console.error('[GET /api/social/moments]', error);
    return NextResponse.json({ error: 'Failed to fetch moments' }, { status: 500 });
  }
}

// POST /api/social/moments — create a post
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { content, mediaUrl } = await request.json();
  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  try {
    const post = await prisma.post.create({
      data: { userId, content: content.trim(), mediaUrl: mediaUrl ?? null },
      include: { user: { select: USER_SELECT } },
    });

    return NextResponse.json({
      id: post.id,
      content: post.content,
      mediaUrl: post.mediaUrl ?? null,
      createdAt: post.createdAt,
      isMe: true,
      user: formatUser(post.user),
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      previewComments: [],
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/social/moments]', error);
    return NextResponse.json({ error: 'Failed to create moment' }, { status: 500 });
  }
}
