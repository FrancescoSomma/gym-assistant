import { useState } from 'react';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { formatNumber } from '../../domain/format';
import { platesPerSide } from '../../domain/plates';

/**
 * The only place where plates wear their real colours. Competition plates from 25 to 10 kg share
 * the 450 mm diameter and differ in thickness; change plates are smaller.
 */
const PLATE_STYLE: Record<number, string> = {
  25: 'h-32 w-[22px] bg-plate-red',
  20: 'h-32 w-[18px] bg-plate-blue',
  15: 'h-32 w-[15px] bg-plate-yellow',
  10: 'h-32 w-[13px] bg-plate-green',
  5: 'h-[72px] w-[11px] bg-plate-white',
  2.5: 'h-[60px] w-[9px] bg-acciaio',
  1.25: 'h-[52px] w-2 bg-acciaio',
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
            {/* The bar seen from the side: shaft, collar, plates, sleeve. The bar is steel; the change plates stay readable by height. Text says the same. */}
            <div className="flex h-36 items-center" aria-hidden="true">
              <span className="h-2.5 w-8 bg-acciaio" />
              <span className="mr-1 h-7 w-2 rounded-tag bg-acciaio" />
              {plates.map(({ key, kg }) => (
                <span key={key} className={`ml-px shrink-0 rounded-tag ${PLATE_STYLE[kg]}`} />
              ))}
              <span className="ml-1 h-3.5 flex-1 bg-acciaio" />
            </div>
            <p className="flex items-baseline gap-2">
              {plates.length === 0 ? (
                'Solo il bilanciere, nessun disco.'
              ) : (
                <>
                  <span className="text-small text-fumo">Per lato:</span>
                  <span className="num text-title">
                    {plates.map((p) => formatNumber(p.kg)).join(' + ')}
                  </span>
                </>
              )}
            </p>
            {remainderKg > 0 && (
              <p className="text-small text-fumo">
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
