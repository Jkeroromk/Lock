import {
  Skia, AlphaType, ColorType, FilterMode, MipmapMode, ClipOp, PaintStyle, StrokeJoin, FontWeight,
  type SkCanvas, type SkImage, type SkParagraph,
} from '@shopify/react-native-skia';
import type { Buf, Gfx, Rect } from './core';

const FAMILIES = ['PingFang SC', 'Hiragino Sans', 'Apple SD Gothic Neo', 'Helvetica Neue'];
const weightOf = (w: string) => (w === '900' ? FontWeight.Black : w === '700' ? FontWeight.Bold : FontWeight.SemiBold);

/**
 * The engine's gfx interface on React Native Skia. Drawing goes to whichever
 * canvas `setCanvas` was last given (one SkPicture per frame). Pixel art is
 * scaled with nearest-neighbour sampling; text is laid out as paragraphs so
 * Chinese, Japanese and Korean all render with the system fonts.
 */
export function makeSkiaGfx(): Gfx<SkImage> & { setCanvas(c: SkCanvas): void } {
  let canvas: SkCanvas | null = null;
  const fontMgr = Skia.FontMgr.System();
  const paint = Skia.Paint();
  paint.setAntiAlias(false);
  const imgPaint = Skia.Paint();
  const paras = new Map<string, SkParagraph>();

  const fillPaint = (color: string, alpha = 1) => { paint.setColor(Skia.Color(color)); paint.setAlphaf(alpha); return paint; };

  function para(str: string, color: string, size: number, weight: string, stroke?: { width: number }): SkParagraph {
    const key = `${stroke ? 's' + stroke.width : 'f'}|${color}|${size}|${weight}|${str}`;
    let p = paras.get(key);
    if (p) return p;
    if (paras.size > 600) paras.clear();
    const b = Skia.ParagraphBuilder.Make({}, fontMgr);
    const style = { color: Skia.Color(color), fontSize: size, fontFamilies: FAMILIES, fontStyle: { weight: weightOf(weight) } };
    if (stroke) {
      const sp = Skia.Paint();
      sp.setStyle(PaintStyle.Stroke); sp.setStrokeWidth(stroke.width); sp.setStrokeJoin(StrokeJoin.Round); sp.setColor(Skia.Color(color)); sp.setAntiAlias(true);
      b.pushStyle(style, sp);
    } else b.pushStyle(style);
    b.addText(str);
    p = b.build();
    p.layout(10000);
    paras.set(key, p);
    return p;
  }

  return {
    setCanvas(c) { canvas = c; },
    image(buf: Buf) {
      const bytes = new Uint8Array(buf.d.buffer.slice(buf.d.byteOffset, buf.d.byteOffset + buf.d.byteLength));
      const data = Skia.Data.fromBytes(bytes);
      const img = Skia.Image.MakeImage({ width: buf.w, height: buf.h, alphaType: AlphaType.Unpremul, colorType: ColorType.RGBA_8888 }, data, buf.w * 4);
      if (!img) throw new Error('Skia image');
      return img;
    },
    rect(x, y, w, h, color, alpha = 1) { canvas?.drawRect(Skia.XYWHRect(x, y, w, h), fillPaint(color, alpha)); },
    rects(list: Rect[], color, alpha = 1) {
      if (!canvas || !list.length) return;
      const path = Skia.Path.Make();
      for (const [x, y, w, h] of list) path.addRect(Skia.XYWHRect(x, y, w, h));
      canvas.drawPath(path, fillPaint(color, alpha));
    },
    img(image, x, y, alpha = 1) {
      if (!canvas) return;
      imgPaint.setAlphaf(alpha);
      const w = image.width(), h = image.height();
      canvas.drawImageRectOptions(image, Skia.XYWHRect(0, 0, w, h), Skia.XYWHRect(x, y, w, h), FilterMode.Nearest, MipmapMode.None, imgPaint);
    },
    imgClipped(image, x, y, keep) {
      if (!canvas) return;
      const path = Skia.Path.Make();
      for (const [rx, ry, w, h] of keep) path.addRect(Skia.XYWHRect(rx, ry, w, h));
      canvas.save();
      canvas.clipPath(path, ClipOp.Intersect, false);
      imgPaint.setAlphaf(1);
      const w = image.width(), h = image.height();
      canvas.drawImageRectOptions(image, Skia.XYWHRect(0, 0, w, h), Skia.XYWHRect(x, y, w, h), FilterMode.Nearest, MipmapMode.None, imgPaint);
      canvas.restore();
    },
    poly(points, color, alpha = 1) {
      if (!canvas || points.length < 6) return;
      const path = Skia.Path.Make();
      path.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1]);
      path.close();
      canvas.drawPath(path, fillPaint(color, alpha));
    },
    text(str, x, y, o) {
      if (!canvas) return;
      if (o.shadow) para(str, o.shadow, o.size, o.weight).paint(canvas, x, y + 0.6);
      para(str, o.color, o.size, o.weight).paint(canvas, x, y);
    },
    measure(str, o) { return para(str, '#000000', o.size, o.weight).getLongestLine(); },
    bigText(str, cx, y, fill, edge) {
      if (!canvas) return;
      const stroke = para(str, edge, 28, '900', { width: 6 }), front = para(str, fill, 28, '900');
      const x = cx - front.getLongestLine() / 2;
      stroke.paint(canvas, x, y + 2); stroke.paint(canvas, x, y); front.paint(canvas, x, y);
    },
  };
}
