import { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { showToast } from '@/components/ui/Toast';
import GameCanvas, { type GameViewHandle } from '@/components/game/GameCanvas';
import AvatarEditor from '@/components/game/AvatarEditor';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { engineStrings, GAME_SPECIES } from '@/lib/game/strings';
import { DEFAULT_GIRL, DEFAULT_LOOK, MILESTONES, type AvatarLook } from '@/lib/game/avatar';
import type { GameAction } from '@/lib/game/engine/core';
import { captureEncounter, fetchGameState, hatchEgg, markMilestonesSeen, saveAvatar, type GameState } from '@/services/game';

/**
 * Buddy tab: a full-screen pixel game. The player's avatar lives in a room;
 * real meals bring encounters, steps hatch eggs, days logged unlock outfits.
 * The engine draws everything (including its buttons); this screen fetches
 * state, calls the API and tells the engine what to play.
 */
export default function PartnerScreen() {
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useStore((s) => s.user);
  const game = useRef<GameViewHandle>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);     // engine is playing a scene
  const working = useRef(false);  // waiting on the server
  const [editor, setEditor] = useState<{ create: boolean } | null>(null);
  const editorOpen = useRef(false);
  const [saving, setSaving] = useState(false);
  const celebrated = useRef(-1);
  // t changes identity on every render; keep the latest in a ref so effects stay stable.
  const tRef = useRef(t);
  tRef.current = t;

  // The avatar's body type follows the gender chosen at sign-up.
  const lockedGender: 'boy' | 'girl' | null = user?.gender === 'male' ? 'boy' : user?.gender === 'female' ? 'girl' : null;
  const fallbackName = user?.username || user?.name || 'Lock';
  const nameOf = (s: GameState | null) => s?.avatar.name || fallbackName;
  const starterLook = (): AvatarLook => (lockedGender === 'girl' ? ({ ...DEFAULT_LOOK, ...DEFAULT_GIRL } as AvatarLook) : DEFAULT_LOOK);
  const lookOf = (s: GameState | null): AvatarLook => {
    const base = s?.avatar.look ?? starterLook();
    return lockedGender ? { ...base, gender: lockedGender } : base;
  };

  const pushState = (s: GameState) => {
    game.current?.send({
      type: 'state',
      state: {
        name: nameOf(s), level: s.avatar.level, egg: s.egg, today: s.today, pending: s.pending.length, dex: s.dex, total: GAME_SPECIES.length,
        // While the editor is open its live preview owns the look.
        ...(editorOpen.current ? {} : { look: lookOf(s) }),
      },
    });
  };

  const load = useCallback(async () => {
    try {
      const s = await fetchGameState();
      stateRef.current = s; setState(s); setFailed(false); pushState(s);
      if (!s.avatar.created) { editorOpen.current = true; setEditor((e) => e ?? { create: true }); }
      else if (s.avatar.milestones > s.avatar.milestonesSeen && celebrated.current < s.avatar.milestones) {
        celebrated.current = s.avatar.milestones;
        const m = MILESTONES[s.avatar.milestones - 1];
        game.current?.send({ type: 'play', kind: 'unlock', payload: { days: m.days, item: tRef.current(`game.opt.${m.field}.${m.value}`) } });
        markMilestonesSeen(s.avatar.milestones).catch(() => {});
      }
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { game.current?.send({ type: 'strings', strings: engineStrings((k) => tRef.current(k)) }); }, [language]);

  const onReady = () => {
    game.current?.send({ type: 'strings', strings: engineStrings((k) => tRef.current(k)) });
    if (stateRef.current) pushState(stateRef.current);
  };

  const dexCountAfter = (species: string) => { const owned = new Set(Object.keys(stateRef.current?.dex ?? {})); owned.add(species); return owned.size; };

  const catchNext = async () => {
    const s = stateRef.current, next = s?.pending[0];
    if (!s || !next || working.current) return;
    working.current = true;
    try {
      const res = await captureEncounter(next.id);
      if (res.creature) game.current?.send({ type: 'play', kind: 'encounter', payload: { species: next.species, shiny: next.shiny, origin: next.origin, isNew: !s.dex[next.species], dexCount: dexCountAfter(next.species) } });
      else load();
    } catch {
      showToast({ message: tRef.current('game.loadFailed'), icon: 'cloud-offline-outline' });
    } finally { working.current = false; }
  };

  const hatch = async () => {
    const s = stateRef.current;
    if (!s || working.current) return;
    if (s.egg.progress < s.egg.target) { showToast({ message: tRef.current('game.hatchNotReady', { n: (s.egg.target - s.egg.progress).toLocaleString() }) }); return; }
    working.current = true;
    try {
      const c = await hatchEgg();
      game.current?.send({ type: 'play', kind: 'hatch', payload: { species: c.species, shiny: c.shiny, isNew: !s.dex[c.species], dexCount: dexCountAfter(c.species) } });
    } catch {
      showToast({ message: tRef.current('game.loadFailed'), icon: 'cloud-offline-outline' });
    } finally { working.current = false; }
  };

  const onAction = (a: GameAction) => {
    if (busy.current) return;
    if (a === 'catch') catchNext();
    else if (a === 'hatch') hatch();
    else if (a === 'dex') game.current?.send({ type: 'play', kind: 'dex' });
    else if (a === 'dress') { editorOpen.current = true; setEditor({ create: false }); }
  };
  const onDone = (kind: string) => { if (kind === 'encounter' || kind === 'hatch') load(); };

  const preview = (look: AvatarLook) => game.current?.send({ type: 'look', look });
  const closeEditor = () => { editorOpen.current = false; setEditor(null); };
  const cancelEditor = () => {
    game.current?.send({ type: 'look', look: lookOf(stateRef.current), name: nameOf(stateRef.current) });
    closeEditor();
  };
  const save = async (look: AvatarLook, name: string) => {
    const first = !!editor?.create;
    setSaving(true);
    try {
      const res = await saveAvatar(lockedGender ? { ...look, gender: lockedGender } : look, name);
      game.current?.send({ type: 'look', look: res.look, name: res.name || name });
      closeEditor();
      await load();
      if (first) game.current?.send({ type: 'play', kind: 'greet' });
    } catch {
      showToast({ message: tRef.current('game.saveFailed'), icon: 'alert-circle-outline' });
    } finally { setSaving(false); }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: '#151729' }}
      onLayout={(e) => { const { width, height } = e.nativeEvent.layout; if (!size || Math.abs(size.height - height) > 2 || Math.abs(size.width - width) > 2) setSize({ width, height }); }}
    >
      <StatusBar style="light" />
      {size ? (
        <GameCanvas
          key={`${Math.round(size.width)}x${Math.round(size.height)}`}
          ref={game}
          width={size.width}
          height={size.height}
          insetTop={insets.top}
          onReady={onReady}
          onBusy={(b) => { busy.current = b; }}
          onDone={onDone}
          onAction={onAction}
        />
      ) : null}

      {failed ? (
        <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 60, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={load}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 44, borderRadius: 12, backgroundColor: '#1b1d2e', borderWidth: 1, borderColor: '#f2ead8' }}
          >
            <Ionicons name="refresh" size={16} color="#ffd43b" />
            <Text style={{ color: '#f6f1e6', fontSize: 14, fontWeight: '600' }}>{t('game.loadFailed')} · {t('game.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <AvatarEditor
        visible={!!editor}
        create={!!editor?.create}
        initialLook={state ? lookOf(state) : starterLook()}
        initialName={nameOf(state)}
        milestones={state?.avatar.milestones ?? 0}
        lockedGender={lockedGender}
        saving={saving}
        onPreview={preview}
        onCancel={cancelEditor}
        onSave={save}
      />
    </View>
  );
}
