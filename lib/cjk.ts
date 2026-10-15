import { Children, type ReactNode } from 'react';

// Han, kana, hangul, CJK punctuation and full-width forms.
const CJK = /[⺀-⿿　-ヿ㄀-ㇿ㈀-鿿가-힯豈-﫿＀-￯]/;

export function hasCJK(text: string | undefined | null): boolean {
  return !!text && CJK.test(text);
}

/**
 * True when a Text's own string children contain CJK characters. Nested
 * <Text> elements are skipped: they run the same check on their own content.
 */
export function childrenHaveCJK(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (child) => {
    if (!found && (typeof child === 'string' || typeof child === 'number')) {
      found = CJK.test(String(child));
    }
  });
  return found;
}
