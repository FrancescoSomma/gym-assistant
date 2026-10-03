import { useState } from 'react';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { formatNumber } from '../../domain/format';
import { platesPerSide } from '../../domain/plates';

/** SPEC §11.2: the only place where plate colors are the real ones. */
const PLATE_STYLE: Record<number, string> = {
  25: 'h-28 bg-plate-red',
  20: 'h-24 bg-plate-blue',
  15: 'h-20 bg-plate-yellow',
  10: 'h-16 bg-plate-green',
  5: 'h-12 bg-chalk',
  2.5: 'h-10 bg-steel',
  1.25: 'h-8 bg-steel',
};

type Bar = '20' | '15' | '10';

export function PlateSheet({
  weightKg,
  open,
  onClose,
}: {
  weightKg: number;
  open: boolean;
  onClose: () => void;
}) {
  const [bar, setBar] = useState<Bar>('20');
  const { perSide, remainderKg } = platesPerSide(weightKg, Number(bar));
  const plates = perSide.flatMap(({ kg, count }) =>
    Array.from({ length: count }, (_, n) => n).map((n) => ({ key: `${kg}-${n}`, kg })),
  );

  return (
    <Sheet open={open} onClose={onClose} title={`Dischi per ${formatNumber(weightKg)} kg`}>
      <div className="space-y-4 px-4">
        <div>
          <p className="label">Bilanciere</p>
          <Segmented<Bar>
            tall
            options={[
              ['20', '20 kg'],
              ['15', '15 kg'],
              ['10', '10 kg'],
            ]}
            value={bar}
            onChange={setBar}
          />
        </div>
        {remainderKg < 0 ? (
          <p>Il carico è inferiore al peso del bilanciere.</p>
        ) : (
          <>
            <div className="flex h-32 items-center" aria-hidden="true">
              <span className="h-3 w-10 rounded-l-full bg-steel/60" />
              {plates.map(({ key, kg }) => (
                <span key={key} className={`ml-0.5 w-4 rounded-[3px] ${PLATE_STYLE[kg]}`} />
              ))}
              <span className="h-3 flex-1 bg-steel/60" />
            </div>
            <p className="tabular-nums">
              {plates.length === 0
                ? 'Solo il bilanciere, nessun disco.'
                : `Per lato: ${plates.map((p) => formatNumber(p.kg)).join(' + ')}`}
            </p>
            {remainderKg > 0 && (
              <p className="text-small text-steel">
                Con questi dischi il carico più vicino è {formatNumber(weightKg - remainderKg)} kg (
                {formatNumber(remainderKg)} kg in meno).
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
