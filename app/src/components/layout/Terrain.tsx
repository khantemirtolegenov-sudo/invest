/**
 * Фон-«рельеф капитала»: тонкие изолинии, как на топографической карте, медленно дрейфуют.
 * Зачем: стекло glisse преломляет то, что под ним, — по ровному фону эффекта не видно.
 * Линии дают стеклу структуру, которую оно видимо изгибает по краю (сайдбар, KPI, кнопки).
 * Две линии — золотые: единственная «жила» акцента на фоне. Движение только transform
 * (дёшево), при prefers-reduced-motion — неподвижно. Линии строятся детерминированно,
 * без случайности: одинаковы при каждом рендере и не дёргаются при перерисовке.
 */
import { memo } from 'react';

const W = 1600;
const H = 1000;
const LINES = 22;

/** Высота рельефа в точке x для линии i: сумма синусов — плавные «хребты» без шума */
function ridge(i: number, x: number) {
  const t = x / W;
  return (
    Math.sin(t * 6.1 + i * 0.37) * 26 +
    Math.sin(t * 2.3 - i * 0.21) * 48 +
    Math.sin(t * 13.7 + i * 0.9) * 7 +
    Math.cos(t * 3.4 + i * 0.55) * 18 * Math.sin(i * 0.3)
  );
}

function path(i: number) {
  const base = (i + 0.5) * (H / LINES);
  let d = '';
  for (let x = -40; x <= W + 40; x += 20) {
    const y = base + ridge(i, x);
    d += `${x === -40 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
  }
  return d;
}

const PATHS = Array.from({ length: LINES }, (_, i) => path(i));
const GOLD = new Set([6, 15]);

export const Terrain = memo(function Terrain() {
  return (
    <div className="hub-terrain" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <g className="hub-terrain-drift">
          {PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              strokeWidth={GOLD.has(i) ? 1.4 : 1}
              stroke={GOLD.has(i) ? 'var(--terrain-gold)' : 'var(--terrain-line)'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
    </div>
  );
});
