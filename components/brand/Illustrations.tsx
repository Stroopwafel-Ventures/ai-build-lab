import type { ReactNode } from "react";
import { WaffleShapes, type BrandSvgProps } from "./Logo";

/* Stroopwafel Ventures illustrations — original flat vector artwork.
   All colours resolve from theme tokens (see app/globals.css). */

const C = {
  waffle: "var(--waffle, #C8893B)",
  caramel: "var(--caramel, #9A5B1E)",
  cream: "var(--cream, #FBF5E9)",
  canal: "var(--canal, #2F6F9F)",
  tulip: "var(--tulip, #F07A2B)",
  ink: "var(--ink, #3B2614)",
  surface: "var(--surface, #FFFFFF)",
  line: "var(--line, #E8DCC6)",
  leaf: "var(--leaf, #5E8C4A)",
  /* optional tokens: fixed defaults keep windows "lit" in dark mode */
  window: "var(--window, #FFF6E4)",
  door: "var(--door, #4A2E17)",
  plaster: "color-mix(in srgb, var(--waffle, #C8893B) 28%, var(--surface, #FFFFFF))",
};

function Svg({
  viewBox,
  title,
  className,
  preserveAspectRatio,
  children,
}: BrandSvgProps & { viewBox: string; preserveAspectRatio?: string; children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      preserveAspectRatio={preserveAspectRatio}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: "false" })}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ---------- small reusable pieces ---------- */

/** A grid of tall sash windows with a cross mullion. */
function Windows({ x, y, cols, rows, w = 13, h = 22, dx = 22, dy = 36 }: {
  x: number; y: number; cols: number; rows: number; w?: number; h?: number; dx?: number; dy?: number;
}) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const wx = x + c * dx, wy = y + r * dy;
      out.push(<rect key={`${r}-${c}`} x={wx} y={wy} width={w} height={h} rx={1.5} />);
    }
  let d = "";
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const wx = x + c * dx, wy = y + r * dy;
      d += `M${wx + w / 2} ${wy}v${h}M${wx} ${wy + h * 0.42}h${w}`;
    }
  return (
    <g>
      <g fill={C.window}>{out}</g>
      <path d={d} stroke={C.door} strokeOpacity={0.4} strokeWidth={1.2} fill="none" />
    </g>
  );
}

function Door({ x, y = 300, w = 16, h = 28 }: { x: number; y?: number; w?: number; h?: number }) {
  return (
    <g>
      <path d={`M${x} ${y}v-${h - w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0v${h - w / 2}z`} fill={C.door} />
      <rect x={x - 3} y={y - 3} width={w + 6} height={3} fill={C.door} fillOpacity={0.45} />
    </g>
  );
}

/** Hoist beam with rope and hook, centred on x. */
function Hoist({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={C.door} strokeLinecap="round" fill="none">
      <path d={`M${x - 3} ${y}h6`} strokeWidth={5} />
      <path d={`M${x + 2} ${y + 2}v16`} strokeWidth={1} />
      <path d={`M${x + 2} ${y + 18}a2.5 2.5 0 1 1-2.5 2.5`} strokeWidth={1.3} />
    </g>
  );
}

/** A tulip head + stem, rooted at (x, y). */
function Tulip({ x, y, h = 22, color = C.tulip, lean = 0 }: { x: number; y: number; h?: number; color?: string; lean?: number }) {
  const tx = x + lean, ty = y - h;
  return (
    <g>
      <path d={`M${x} ${y}Q${x} ${y - h * 0.5} ${tx} ${ty}`} stroke={C.leaf} strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d={`M${x} ${y}q-${h * 0.35} -${h * 0.25} -${h * 0.3} -${h * 0.6}q${h * 0.25} ${h * 0.15} ${h * 0.3} ${h * 0.6}z`} fill={C.leaf} />
      <path
        transform={`translate(${tx} ${ty})`}
        d="M-5.5 -1Q-6 8 0 8Q6 8 5.5 -1L3.5 -7L1.6 -2.2L0 -8L-1.6 -2.2L-3.5 -7Z"
        fill={color}
      />
    </g>
  );
}

/** A Dutch "omafiets" with a front basket, wheels resting on y=gy. */
function Bike({ x, gy, r = 12, basket = true }: { x: number; gy: number; r?: number; basket?: boolean }) {
  const k = r / 12;
  const p = (dx: number, dy: number) => `${x + dx * k} ${gy + dy * k}`;
  return (
    <g fill="none" stroke={C.ink} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={x} cy={gy - r} r={r} strokeWidth={2.2 * k} />
      <circle cx={x + 44 * k} cy={gy - r} r={r} strokeWidth={2.2 * k} />
      <path
        d={`M${p(0, -12)}L${p(16, -30)}L${p(36, -30)}M${p(16, -30)}L${p(20, -10)}L${p(0, -12)}M${p(20, -10)}L${p(37, -31)}L${p(44, -12)}M${p(37, -31)}L${p(35, -38)}L${p(41, -40)}`}
        strokeWidth={2.4 * k}
      />
      <path d={`M${p(10, -32)}h${11 * k}`} strokeWidth={3.4 * k} />
      <path d={`M${p(-6, -14)}a${13 * k} ${13 * k} 0 0 1 ${16 * k} -9`} strokeWidth={2 * k} />
      {basket ? (
        <g>
          <rect x={x + 39 * k} y={gy - 44 * k} width={14 * k} height={10 * k} rx={2 * k} fill={C.waffle} strokeWidth={1.6 * k} />
          <circle cx={x + 43 * k} cy={gy - 46 * k} r={3 * k} fill={C.tulip} stroke="none" />
          <circle cx={x + 49 * k} cy={gy - 47 * k} r={3 * k} fill={C.tulip} stroke="none" />
        </g>
      ) : null}
    </g>
  );
}

/** The stroopwafel mark positioned in a larger drawing. */
function Waffle({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 64 64" overflow="visible">
      <WaffleShapes />
    </svg>
  );
}

/* ---------- LoginHero ---------- */

const HOUSES: { d: string; fill: string; reflect: [number, number] }[] = [
  // 1 step gable
  { d: "M30 300V172h12v-18h12v-18h12v-18h28v18h12v18h12v18h12V300Z", fill: C.caramel, reflect: [30, 100] },
  // 2 bell gable
  { d: "M130 300V186C143 186 148 178 150 160C152 140 158 130 168 126V120h14v6C192 130 198 140 200 160C202 178 207 186 220 186V300Z", fill: C.tulip, reflect: [130, 90] },
  // 3 neck gable with scroll shoulders
  { d: "M220 300V168H233Q247 168 247 142V114L267 96L287 114V142Q287 168 301 168H315V300Z", fill: C.canal, reflect: [220, 95] },
  // 4 spout gable
  { d: "M315 300V178L330 164V134L350 104L370 134V164L385 178V300Z", fill: C.waffle, reflect: [315, 70] },
  // 5 cornice house
  { d: "M385 300V142H381V132H428A14 14 0 0 1 456 132H504V142H500V300Z", fill: C.plaster, reflect: [385, 115] },
  // 6 tall step gable
  { d: "M500 300V160h10v-16h10v-16h10v-16h25v16h10v16h10v16h10V300Z", fill: C.canal, reflect: [500, 85] },
  // 7 bell gable, low
  { d: "M585 300V198C597 198 602 190 604 174C606 156 612 148 622 144V138h12v6C644 148 650 156 652 174C654 190 659 198 671 198V300Z", fill: C.waffle, reflect: [585, 86] },
  // 8 neck gable
  { d: "M671 300V184H681Q694 184 694 162V138L716 120L738 138V162Q738 184 751 184H770V300Z", fill: C.tulip, reflect: [671, 99] },
];

/** Login/hero scene: canal houses, a bicycle, tulips, and a stroopwafel sun. 800×420. */
export function LoginHero({
  className,
  title = "Amsterdam canal houses under a stroopwafel sun",
  preserveAspectRatio = "xMidYMax slice",
}: BrandSvgProps & { preserveAspectRatio?: string }) {
  return (
    <Svg viewBox="0 0 800 420" className={className} title={title} preserveAspectRatio={preserveAspectRatio}>
      {/* sky: sun + clouds */}
      <circle cx={712} cy={74} r={62} fill={C.waffle} opacity={0.14} />
      <circle cx={712} cy={74} r={48} fill={C.waffle} opacity={0.14} />
      <Waffle x={672} y={34} size={80} />
      <g fill={C.surface} stroke={C.line} strokeWidth={1.5}>
        <path d="M86 78a14 14 0 0 1 26-8a11 11 0 0 1 20 6h4a8 8 0 0 1 0 16H90a7 7 0 0 1-4-14Z" />
        <path d="M420 52a11 11 0 0 1 21-6a9 9 0 0 1 16 5h3a6.5 6.5 0 0 1 0 13h-38a6 6 0 0 1-2-12Z" />
      </g>
      <path d="M560 70q5-5 10 0q5-5 10 0M592 58q4-4 8 0q4-4 8 0" stroke={C.ink} strokeOpacity={0.55} strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {/* houses */}
      <g stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.5} strokeLinejoin="round">
        {HOUSES.map((h, i) => (
          <path key={i} d={h.d} fill={h.fill} />
        ))}
      </g>
      {/* house details */}
      <Windows x={44} y={186} cols={3} rows={2} dx={26} dy={38} />
      <Windows x={73} y={142} cols={1} rows={1} w={14} h={16} />
      <Hoist x={80} y={124} />
      <Door x={54} />
      <Windows x={98} y={262} cols={1} rows={1} />

      <circle cx={175} cy={150} r={7} fill={C.window} stroke={C.door} strokeOpacity={0.4} strokeWidth={1.2} />
      <Windows x={143} y={196} cols={3} rows={2} dx={24} dy={38} />
      <Door x={185} />
      <Windows x={143} y={268} cols={1} rows={1} h={20} />

      <Windows x={253} y={122} cols={2} rows={1} dx={16} w={12} h={18} />
      <Hoist x={267} y={108} />
      <Windows x={232} y={180} cols={3} rows={2} dx={28} dy={38} />
      <Door x={259} />

      <Windows x={343} y={136} cols={1} rows={1} h={18} />
      <Hoist x={350} y={118} />
      <Windows x={326} y={186} cols={2} rows={2} dx={35} dy={38} />
      <Door x={342} />

      <Windows x={398} y={154} cols={4} rows={3} dx={26} dy={36} h={24} />
      <circle cx={442} cy={128} r={4} fill={C.ink} fillOpacity={0.35} />
      <Door x={434} />

      <Windows x={536} y={124} cols={1} rows={1} h={16} />
      <Hoist x={542} y={112} />
      <Windows x={511} y={168} cols={3} rows={3} dx={24} dy={36} h={22} />

      <circle cx={628} cy={166} r={6} fill={C.window} stroke={C.door} strokeOpacity={0.4} strokeWidth={1.2} />
      <Windows x={596} y={208} cols={3} rows={1} dx={24} />
      <Door x={619} />

      <Windows x={710} y={148} cols={1} rows={1} h={18} />
      <Hoist x={716} y={132} />
      <Windows x={683} y={196} cols={3} rows={2} dx={28} dy={38} />

      {/* street, quay wall */}
      <rect x={0} y={300} width={800} height={8} fill={C.line} />
      <rect x={0} y={308} width={800} height={16} fill={C.caramel} />
      <path d="M0 316h800M40 308v8M100 316v8M160 308v8M220 316v8M280 308v8M340 316v8M400 308v8M460 316v8M520 308v8M580 316v8M640 308v8M700 316v8M760 308v8" stroke={C.ink} strokeOpacity={0.25} strokeWidth={1} />

      {/* railing + bike */}
      <path d="M146 282H306M150 282v18M178 282v18M206 282v18M234 282v18M262 282v18M290 282v18" stroke={C.ink} strokeOpacity={0.8} strokeWidth={2} strokeLinecap="round" fill="none" />
      <g transform="rotate(-4 200 300)">
        <Bike x={180} gy={302} r={16} />
      </g>

      {/* planters with tulips */}
      <g fill={C.caramel} stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.2}>
        <rect x={390} y={289} width={38} height={11} rx={2} />
        <rect x={456} y={289} width={40} height={11} rx={2} />
      </g>
      <Tulip x={398} y={289} h={20} lean={-2} />
      <Tulip x={409} y={289} h={25} color={C.canal} />
      <Tulip x={420} y={289} h={19} lean={2} color={C.waffle} />
      <Tulip x={464} y={289} h={22} lean={-1} color={C.waffle} />
      <Tulip x={476} y={289} h={27} />
      <Tulip x={488} y={289} h={21} lean={2} color={C.canal} />

      {/* canal: water, reflections, ripples, boat */}
      <rect x={0} y={324} width={800} height={96} fill={C.canal} fillOpacity={0.22} />
      <g opacity={0.28}>
        {HOUSES.map((h, i) => (
          <g key={i} fill={h.fill}>
            <rect x={h.reflect[0] + 6} y={330} width={h.reflect[1] - 12} height={6} rx={3} />
            <rect x={h.reflect[0] + 14} y={342} width={h.reflect[1] - 28} height={5} rx={2.5} />
            <rect x={h.reflect[0] + 26} y={354} width={h.reflect[1] - 52} height={4} rx={2} />
          </g>
        ))}
      </g>
      <path
        d="M40 372q10-5 20 0t20 0M150 392q10-5 20 0t20 0t20 0M300 368q10-5 20 0t20 0M470 398q10-5 20 0t20 0t20 0M640 376q10-5 20 0t20 0M720 404q10-5 20 0t20 0M240 408q10-5 20 0t20 0"
        stroke={C.canal}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        opacity={0.7}
      />
      <g stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.4} strokeLinejoin="round">
        <path d="M400 360h22v-10h34v10h18l-8 14h-58z" fill={C.surface} />
        <path d="M392 360h96l-10 16h-78z" fill={C.canal} />
        <path d="M426 352h7v6h-7zM438 352h7v6h-7z" fill={C.cream} strokeWidth={1} />
      </g>
    </Svg>
  );
}

/* ---------- SkylineStrip ---------- */

const SKYLINE =
  "M0 40V20H5.8V16H11.5V12H17.3V8H28.8V12H34.6V16H40.3V20H46.1V23C54.5 23 53.7 15.2 60.5 12Q65.1 9.3 69.7 12C76.5 15.2 75.8 23 84.1 23V16H85.1V14H107.2a4 4 0 0 1 8 0H137.2V16H138.2V22H143Q149.4 22 149.4 14.5V10.8L158.3 7L167.1 10.8V14.5Q167.1 22 173.5 22H178.3V18H183.4L189.2 13.6V10.3L195.3 7L201.5 10.3V13.6L207.2 18H212.4V24H217.9V19.7H223.4V15.3H228.9V11H239.9V15.3H245.4V19.7H250.9V24H256.4V20H257.4V18H272.5a4 4 0 0 1 8 0H295.5V20H296.5V18C305.7 18 304.9 10.8 312.5 7.8Q317.5 5.4 322.6 7.8C330.2 10.8 329.3 18 338.6 18V21H343.1Q349.2 21 349.2 14V10.5L357.6 7L366 10.5V14Q366 21 372.1 21H376.6V16H382.9V12H389.1V8H395.4V4H407.9V8H414.2V12H420.5V16H426.7V23H432.1L438.3 18.2V14.6L444.7 11L451.2 14.6V18.2L457.4 23H462.8V19H463.8V17H482.8a4 4 0 0 1 8 0H509.9V19H510.9V22C518.8 22 518.1 13.6 524.6 10.1Q528.9 7.3 533.2 10.1C539.7 13.6 539 22 546.9 22V20H551.9V16.3H556.9V12.7H561.9V9H572V12.7H577V16.3H582V20H587V17H592.3Q599.3 17 599.3 10.5V7.3L609 4L618.7 7.3V10.5Q618.7 17 625.8 17H631.1V23H632.1V21H645.1a4 4 0 0 1 8 0H666.1V23H667.1V20H672.8L679.3 14.8V10.9L686.1 7L693 10.9V14.8L699.5 20H705.2V16C714.9 16 714 9.4 721.9 6.7Q727.2 4.4 732.5 6.7C740.4 9.4 739.6 16 749.2 16V22H754V17.7H758.8V13.3H763.5V9H773V13.3H777.8V17.7H782.6V22H787.3V19H792.4Q799.1 19 799.1 13V10L808.3 7L817.6 10V13Q817.6 19 824.3 19H829.4V15H830.4V13H851.4a4 4 0 0 1 8 0H880.5V15H881.5V21H886.9L893 16.2V12.6L899.5 9L906 12.6V16.2L912.1 21H917.5V20C926.3 20 925.5 12.2 932.8 9Q937.6 6.3 942.4 9C949.6 12.2 948.8 20 957.6 20V18H963.1V14H968.6V10H974.1V6H985.1V10H990.7V14H996.2V18H1001.7V22H1002.7V20H1018.7a4 4 0 0 1 8 0H1042.7V22H1043.7V20H1048.5Q1055 20 1055 13V9.5L1063.8 6L1072.6 9.5V13Q1072.6 20 1079 20H1083.8V17H1089.2L1095.3 12.6V9.3L1101.8 6L1108.3 9.3V12.6L1114.5 17H1119.9V23C1128.2 23 1127.5 15.8 1134.3 12.8Q1138.9 10.4 1143.5 12.8C1150.3 15.8 1149.6 23 1157.9 23V20H1163.2V16H1168.4V12H1173.7V8H1184.2V12H1189.5V16H1194.7V20H1200V40Z";

/** Thin, low-contrast canal-house silhouette for section headers. 1200×40, tiles horizontally. */
export function SkylineStrip({ className, title }: BrandSvgProps) {
  return (
    <Svg viewBox="0 0 1200 40" className={className} title={title} preserveAspectRatio="xMidYMax slice">
      <path d={SKYLINE} fill={C.line} />
    </Svg>
  );
}

/* ---------- Empty states (160×120) ---------- */

function Ground({ y = 104, rx = 62 }: { y?: number; rx?: number }) {
  return <ellipse cx={80} cy={y} rx={rx} ry={5} fill={C.line} />;
}

/** Empty state: a parked bicycle with a tulip basket. */
export function EmptyBike({ className, title }: BrandSvgProps) {
  return (
    <Svg viewBox="0 0 160 120" className={className} title={title}>
      <Ground />
      <Bike x={46} gy={103} r={17} />
    </Svg>
  );
}

/** Empty state: tulips in a pot. */
export function EmptyTulip({ className, title }: BrandSvgProps) {
  return (
    <Svg viewBox="0 0 160 120" className={className} title={title}>
      <Ground />
      <Tulip x={72} y={78} h={44} lean={-10} />
      <Tulip x={80} y={78} h={56} color={C.waffle} />
      <Tulip x={88} y={78} h={40} lean={12} color={C.canal} />
      <path d="M56 76h48l-6 28H62z" fill={C.caramel} stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.4} strokeLinejoin="round" />
      <rect x={53} y={72} width={54} height={9} rx={2} fill={C.waffle} stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.4} />
    </Svg>
  );
}

/** Empty state: a little stack of stroopwafels on a plate. */
export function EmptyStroopwafelStack({ className, title }: BrandSvgProps) {
  const layer = (y: number) => (
    <g key={y}>
      <ellipse cx={80} cy={y + 6} rx={40} ry={13} fill={C.waffle} stroke={C.ink} strokeOpacity={0.45} strokeWidth={1.2} />
      <path d={`M41 ${y + 3}a40 13 0 0 0 78 0`} stroke={C.caramel} strokeWidth={3} fill="none" />
    </g>
  );
  return (
    <Svg viewBox="0 0 160 120" className={className} title={title}>
      <ellipse cx={80} cy={100} rx={62} ry={12} fill={C.surface} stroke={C.line} strokeWidth={2} />
      <ellipse cx={80} cy={99} rx={44} ry={7} fill={C.line} opacity={0.6} />
      {[84, 74, 64].map(layer)}
      <g transform="translate(80 58) scale(1.29 0.42) translate(-32 -31)">
        <WaffleShapes />
      </g>
      <path d="M70 34q-5-6 0-12t0-12M84 32q-5-6 0-12t0-10" stroke={C.ink} strokeOpacity={0.3} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Empty state: a small canal boat bobbing on the water. */
export function EmptyCanalBoat({ className, title }: BrandSvgProps) {
  return (
    <Svg viewBox="0 0 160 120" className={className} title={title}>
      <path d="M8 36h22v-10l6-6 6 6v10h18v-8l6-8 6 8v8h12" stroke={C.line} strokeWidth={2} fill="none" strokeLinejoin="round" />
      <g stroke={C.ink} strokeOpacity={0.5} strokeWidth={1.4} strokeLinejoin="round">
        <path d="M54 72h20V60h36v12h12l-6 12H58z" fill={C.surface} />
        <path d="M36 72h100l-12 20H50z" fill={C.canal} />
        <path d="M80 63h8v6h-8zM94 63h8v6h-8z" fill={C.cream} strokeWidth={1} />
        <path d="M64 72V44" strokeOpacity={0.8} strokeWidth={1.6} fill="none" />
        <path d="M64 44l14 5-14 5z" fill={C.tulip} />
      </g>
      <rect x={10} y={88} width={140} height={22} rx={11} fill={C.canal} opacity={0.18} />
      <path d="M22 98q7-4 14 0t14 0t14 0M96 104q7-4 14 0t14 0t14 0M70 108q6-3 12 0" stroke={C.canal} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
