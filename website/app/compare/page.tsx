import type { Metadata } from 'next';
import { SubpageShell } from '../components/SubpageShell';
import { CompareBody } from './CompareBody';

export const metadata: Metadata = {
  title: 'Kero Lock vs Cal AI, MyFitnessPal, Lose It! and MacroFactor',
  description: 'Prices, free versions, AI photo logging and barcode scanning side by side, with sources. 价格、免费版和功能对比，附来源。',
};

export default function Compare() {
  return (
    <SubpageShell wide>
      <CompareBody />
    </SubpageShell>
  );
}
