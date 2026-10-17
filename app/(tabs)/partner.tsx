import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button, ScreenHeader } from '@/components/ui/bxc';
import TabFocusFade from '@/components/ui/TabFocusFade';
import { showToast } from '@/components/ui/Toast';
import GameView, { type GameViewHandle } from '@/components/game/GameCanvas';
import AvatarEditor from '@/components/game/AvatarEditor';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useStore } from '@/store/useStore';
import { engineStrings, GAME_SPECIES } from '@/lib/game/strings';
import { DEFAULT_LOOK, MILESTONES, type AvatarLook } from '@/lib/game/avatar';
import { captureEncounter, fetchGameState, hatchEgg, markMilestonesSeen, saveAvatar, type GameState } from '@/services/game';

/**
 * Buddy tab: the player's avatar in their room. Real meals bring encounters,
 * steps hatch eggs, days logged unlock outfits. The game is drawn by the
 * engine in GameView; this screen fetches state, calls the API and tells the
 * engine what to play.
 */
export default function PartnerScreen() {
  const c = useTheme();
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const user = useStore((s) => s.user);
  const game = useRef<GameViewHandle>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);       // engine is playing a scene
  const [working, setWorking] = useState(false); // waiting on the server
  const [editor, setEditor] = useState<{ create: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const celebrated = useRef(-1);

  const gameWidth = Math.min(width - 36, 520);
  const fallbackName = user?.username || user?.name || 'Lock';
  const nameOf = (s: GameState | null) => s?.avatar.name || fallbackName;

  const pushState = useCallback((s: GameState) => {
    game.current?.send({
      type: 'state',
      state: {
        name: nameOf(s),
        level: s.avatar.level,
        look: s.avatar.look ?? DEFAULT_LOOK,
        egg: s.egg,
        today: s.today,
        pending: s.pending.length,
        dex: s.dex,
        total: GAME_SPECIES.length,
      },
    });
  }, [fallbackName]);

  const load = useCallback(async () => {
    try {
      const s = await fetchGameState();
      setState(s); setFailed(false); pushState(s);
      if (!s.avatar.created) setEditor((e) => e ?? { create: true });
      else if (s.avatar.milestones > s.avatar.milestonesSeen && celebrated.current < s.avatar.milestones) {
        celebrated.current = s.avatar.milestones;
        const m = MILESTONES[s.avatar.milestones - 1];
        const item = t(`game.opt.${m.field}.${m.value}`);
        game.current?.send({ type: 'play', kind: 'unlock', payload: { days: m.days, item } });
        markMilestonesSeen(s.avatar.milestones).catch(() => {});
      }
      return s;
    } catch {
      setFailed(true);
      return null;
    }
  }, [pushState, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { game.current?.send({ type: 'strings', strings: engineStrings((k) => t(k)) }); }, [language]);

  const onReady = () => {
    game.current?.send({ type: 'strings', strings: engineStrings((k) => t(k)) });
    if (state) pushState(state);
  };

  const dexCountAfter = (species: string) => {
    const owned = new Set(Object.keys(state?.dex ?? {}));
    owned.add(species);
    return owned.size;
  };

  const catchNext = async () => {
    const next = state?.pending[0];
    if (!next || busy || working) return;
    setWorking(true);
    try {
      const res = await captureEncounter(next.id);
      if (res.creature) {
        const isNew = !state?.dex[next.species];
        game.current?.send({ type: 'play', kind: 'encounter', payload: { species: next.species, shiny: next.shiny, origin: next.origin, isNew, dexCount: dexCountAfter(next.species) } });
      } else {
        await load();
      }
    } catch {
      showToast({ message: t('game.loadFailed'), icon: 'cloud-offline-outline' });
    } finally { setWorking(false); }
  };

  const hatch = async () => {
    if (!state || busy || working) return;
    if (state.egg.progress < state.egg.target) {
      showToast({ message: t('game.hatchNotReady', { n: (state.egg.target - state.egg.progress).toLocaleString() }) });
      return;
    }
    setWorking(true);
    try {
      const creature = await hatchEgg();
      const isNew = !state.dex[creature.species];
      game.current?.send({ type: 'play', kind: 'hatch', payload: { species: creature.species, shiny: creature.shiny, isNew, dexCount: dexCountAfter(creature.species) } });
    } catch {
      showToast({ message: t('game.loadFailed'), icon: 'cloud-offline-outline' });
    } finally { setWorking(false); }
  };

  const onDone = (kind: string) => { if (kind === 'encounter' || kind === 'hatch') load(); };

  const preview = (look: AvatarLook) => game.current?.send({ type: 'look', look });
  const cancelEditor = () => {
    if (state) game.current?.send({ type: 'look', look: state.avatar.look ?? DEFAULT_LOOK, name: nameOf(state) });
    setEditor(null);
  };
  const save = async (look: AvatarLook, name: string) => {
    const first = !!editor?.create;
    setSaving(true);
    try {
      const res = await saveAvatar(look, name);
      game.current?.send({ type: 'look', look: res.look, name: res.name || name });
      setEditor(null);
      const s = await load();
      if (first && s) game.current?.send({ type: 'play', kind: 'greet' });
    } catch {
      showToast({ message: t('game.saveFailed'), icon: 'alert-circle-outline' });
    } finally { setSaving(false); }
  };

  const pending = state?.pending.length ?? 0;
  const eggReady = !!state && state.egg.progress >= state.egg.target;
  const locked = busy || working || !state;

  return (
    <TabFocusFade>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.backgroundPrimary }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <View style={{ alignSelf: 'stretch' }}>
            <ScreenHeader title={t('tabs.partner')} />
          </View>
          <GameView ref={game} width={gameWidth} onReady={onReady} onBusy={setBusy} onDone={onDone} />

          {failed ? (
            <View style={{ alignSelf: 'stretch', marginTop: 14, gap: 10 }}>
              <Text style={{ fontSize: 14, color: c.textSecondary, textAlign: 'center' }}>{t('game.loadFailed')}</Text>
              <Button label={t('game.retry')} icon="refresh" variant="outline" onPress={load} />
            </View>
          ) : (
            <View style={{ alignSelf: 'stretch', marginTop: 14, gap: 10 }}>
              <Button
                label={pending > 0 ? t('game.captureCount', { n: String(pending) }) : t('game.capture')}
                icon="lock-closed"
                variant="primary"
                disabled={locked || pending === 0}
                loading={working && pending > 0}
                onPress={catchNext}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  label={t('game.hatch')}
                  icon="egg-outline"
                  variant={eggReady ? 'solid' : 'outline'}
                  disabled={locked}
                  onPress={hatch}
                  style={{ flex: 1 }}
                />
                <Button label={t('game.dex')} icon="book-outline" variant="outline" disabled={locked} onPress={() => game.current?.send({ type: 'play', kind: 'dex' })} style={{ flex: 1 }} />
                <Button label={t('game.dress')} icon="shirt-outline" variant="outline" disabled={locked} onPress={() => setEditor({ create: false })} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </ScrollView>

        <AvatarEditor
          visible={!!editor}
          create={!!editor?.create}
          initialLook={state?.avatar.look ?? null}
          initialName={nameOf(state)}
          milestones={state?.avatar.milestones ?? 0}
          saving={saving}
          onPreview={preview}
          onCancel={cancelEditor}
          onSave={save}
        />
      </SafeAreaView>
    </TabFocusFade>
  );
}
