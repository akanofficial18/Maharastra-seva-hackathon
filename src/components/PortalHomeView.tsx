import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Info,
  Mail,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import heroLabImg from '../assets/images/division_microbiology_lab_1794750571817.jpg';
import ruralOutreachImg from '../assets/images/division_rural_outreach_1794750570994.jpg';
import labTeamImg from '../assets/images/lab_team_analysis_1794751930253.jpg';
import petriImg from '../assets/images/petri_dish_colonies_1794751930996.jpg';
import { useI18n } from '../lib/i18n.tsx';
import { PORTAL_CONTENT } from '../lib/portalContent.ts';
import type { AuthUser } from '../types/hvisa.ts';

interface PortalHomeViewProps {
  currentUser: AuthUser | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenWorkspace: () => void;
  onActiveSectionChange?: (sectionId: string) => void;
}

function SamplePapCurveGraphic() {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  const w = 440;
  const h = 230;
  const padL = 44;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const concs = [0, 0.5, 1.0, 2.0, 2.5, 4.0];
  const mu3Vals = [8.2, 7.7, 6.9, 5.4, 4.3, 2.7];
  const testVals = [8.2, 7.9, 7.3, 6.2, 5.2, 3.6];

  const toX = (c: number) => padL + (c / 4.0) * plotW;
  const toY = (v: number) => padT + ((9 - v) / 7) * plotH;

  const mu3Path = concs
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${toX(c).toFixed(1)} ${toY(mu3Vals[i]).toFixed(1)}`)
    .join(' ');
  const testPath = concs
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${toX(c).toFixed(1)} ${toY(testVals[i]).toFixed(1)}`)
    .join(' ');

  const activeIdx = pinnedIdx ?? hoverIdx;

  const findNearestIndex = (e: React.MouseEvent<SVGSVGElement>): number | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const svgX = ((e.clientX - rect.left) / rect.width) * w;
    let bestIdx = 0;
    let bestDist = Infinity;
    concs.forEach((c, idx) => {
      const d = Math.abs(svgX - toX(c));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });
    return bestDist < 55 ? bestIdx : null;
  };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full bg-white select-none cursor-crosshair"
      role="img"
      aria-label="Interactive synthetic sample PAP-AUC survival curve comparing test isolate in Deep Green against Mu3 reference in Saffron"
      onMouseMove={(e) => setHoverIdx(findNearestIndex(e))}
      onMouseLeave={() => setHoverIdx(null)}
      onClick={(e) => {
        const idx = findNearestIndex(e);
        if (idx !== null) {
          setPinnedIdx((prev) => (prev === idx ? null : idx));
        }
      }}
    >
      {[2, 4, 6, 8].map((yVal) => (
        <g key={yVal}>
          <line
            x1={padL}
            y1={toY(yVal)}
            x2={w - padR}
            y2={toY(yVal)}
            stroke="#DCE1E6"
            strokeWidth="1"
          />
          <text
            x={padL - 6}
            y={toY(yVal) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="#1F2933"
            fontFamily="JetBrains Mono, monospace"
          >
            {yVal}
          </text>
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((xVal) => (
        <text
          key={xVal}
          x={toX(xVal)}
          y={padT + plotH + 15}
          textAnchor="middle"
          fontSize="10"
          fill="#1F2933"
          fontFamily="JetBrains Mono, monospace"
        >
          {xVal}
        </text>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#1F2933" strokeWidth="1.2" />
      <line
        x1={padL}
        y1={padT + plotH}
        x2={w - padR}
        y2={padT + plotH}
        stroke="#1F2933"
        strokeWidth="1.2"
      />
      {activeIdx !== null && (
        <line
          x1={toX(concs[activeIdx])}
          y1={padT}
          x2={toX(concs[activeIdx])}
          y2={padT + plotH}
          stroke={pinnedIdx !== null ? '#0B5D1E' : '#64748B'}
          strokeWidth={pinnedIdx !== null ? '1.5' : '1'}
          strokeDasharray={pinnedIdx !== null ? undefined : '3 3'}
        />
      )}
      <path d={mu3Path} fill="none" stroke="#FF9933" strokeWidth="2.5" />
      <path d={testPath} fill="none" stroke="#0B5D1E" strokeWidth="2.5" />
      {concs.map((c, i) => {
        const isActive = activeIdx === i;
        return (
          <g key={c}>
            <circle
              cx={toX(c)}
              cy={toY(mu3Vals[i])}
              r={isActive ? '5.5' : '3.5'}
              fill="#FF9933"
              stroke={isActive ? '#1F2933' : 'none'}
              strokeWidth="1.2"
            />
            <circle
              cx={toX(c)}
              cy={toY(testVals[i])}
              r={isActive ? '5.5' : '3.5'}
              fill="#0B5D1E"
              stroke={isActive ? '#1F2933' : 'none'}
              strokeWidth="1.2"
            />
          </g>
        );
      })}
      <rect x={w - 160} y={20} width="144" height="36" fill="#F7F8F9" stroke="#DCE1E6" rx="3" />
      <line x1={w - 150} y1={32} x2={w - 132} y2={32} stroke="#0B5D1E" strokeWidth="2.5" />
      <text x={w - 126} y={35} fontSize="10" fill="#1F2933" fontWeight="600">
        Test Isolate (DEMO)
      </text>
      <line x1={w - 150} y1={46} x2={w - 132} y2={46} stroke="#FF9933" strokeWidth="2.5" />
      <text x={w - 126} y={49} fontSize="10" fill="#1F2933" fontWeight="600">
        Mu3 Reference
      </text>

      {activeIdx !== null &&
        (() => {
          const cx = toX(concs[activeIdx]);
          const tipW = 152;
          const tipH = 44;
          const tipX = cx + 10 + tipW > w - padR ? Math.max(padL + 4, cx - tipW - 10) : cx + 10;
          const tipY = padT + 4;
          return (
            <g className="pointer-events-none">
              <rect
                x={tipX}
                y={tipY}
                width={tipW}
                height={tipH}
                rx={3}
                fill="#1F2933"
                fillOpacity={0.94}
              />
              <text
                x={tipX + 7}
                y={tipY + 13}
                fontSize="9.5"
                fill="#FFFFFF"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                Conc: {concs[activeIdx]} mg/L {pinnedIdx !== null ? '· Pinned' : ''}
              </text>
              <text
                x={tipX + 7}
                y={tipY + 26}
                fontSize="9.5"
                fill="#86EFAC"
                fontFamily="JetBrains Mono, monospace"
              >
                Test: {testVals[activeIdx].toFixed(1)} log10
              </text>
              <text
                x={tipX + 7}
                y={tipY + 38}
                fontSize="9.5"
                fill="#FDBA74"
                fontFamily="JetBrains Mono, monospace"
              >
                Mu3:  {mu3Vals[activeIdx].toFixed(1)} log10
              </text>
            </g>
          );
        })()}

      <text x={padL + plotW / 2} y={h - 4} textAnchor="middle" fontSize="10" fill="#1F2933">
        Vancomycin (mg/L) · Synthetic Illustration
      </text>
    </svg>
  );
}

function ImageWithFallback({
  src,
  alt,
  caption,
  className = 'w-full h-56 object-cover',
}: {
  src: string;
  alt: string;
  caption: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-full min-h-[11rem] bg-[#EEF1F4] flex items-center justify-center px-4 text-center text-xs text-[#1F2933]/80">
        {caption}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function PortalHomeView({
  currentUser,
  onOpenAuth,
  onOpenWorkspace,
  onActiveSectionChange,
}: PortalHomeViewProps) {
  const { lang } = useI18n();
  const content = PORTAL_CONTENT[lang] ?? PORTAL_CONTENT.en;
  const p = content.publicHome;

  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const scrollToSection = (id: string) => {
    if (onActiveSectionChange) {
      onActiveSectionChange(id);
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const galleryAssetMap: Record<'petri' | 'rural' | 'team', string> = {
    petri: petriImg,
    rural: ruralOutreachImg,
    team: labTeamImg,
  };

  return (
    <div id="home" className="space-y-10">
      <section className="bg-white border border-[#DCE1E6] rounded-[4px] overflow-hidden gov-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-[#1F2933] tracking-tight leading-[1.15] text-balance">
                {p.heroTitle}
              </h1>
              <p className="text-base text-[#1F2933]/85 leading-relaxed max-w-[62ch]">
                {p.heroDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {currentUser ? (
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="px-5 py-2.5 text-sm font-bold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded-[4px] cursor-pointer whitespace-nowrap"
                >
                  {content.header.backToWorkspaceBtn}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="px-5 py-2.5 text-sm font-bold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded-[4px] cursor-pointer whitespace-nowrap"
                  >
                    {p.heroLoginBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="px-5 py-2.5 text-sm font-bold border border-[#0B5D1E] text-[#0B5D1E] bg-white hover:bg-[#F7F8F9] rounded-[4px] cursor-pointer whitespace-nowrap"
                  >
                    {p.heroRegisterBtn}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="px-4 py-2.5 text-sm font-semibold text-[#1F2933] hover:text-[#0B5D1E] hover:bg-[#F7F8F9] rounded-[4px] cursor-pointer whitespace-nowrap"
              >
                {p.heroHowItWorksBtn}
              </button>
            </div>
          </div>

          <figure className="lg:col-span-5 flex flex-col border-t lg:border-t-0 lg:border-l border-[#DCE1E6] bg-[#EEF1F4]">
            <div className="flex-1 min-h-[240px]">
              <ImageWithFallback
                src={heroLabImg}
                alt={p.heroImageAlt}
                caption={p.heroImageCaption}
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="bg-[#1F2933] text-white px-4 py-2.5 text-xs">
              {p.heroImageCaption}
            </figcaption>
          </figure>
        </div>
      </section>

      <div
        role="note"
        className="bg-[#FDF8EE] border border-[#E5D5B5] rounded-[4px] px-4 py-3 flex items-start gap-2.5 text-sm text-[#1F2933]"
      >
        <ShieldAlert className="w-4 h-4 text-[#B26A00] shrink-0 mt-0.5" />
        <span className="font-medium leading-relaxed">{p.noticeBarText}</span>
      </div>

      <section
        aria-label="Portal overview summary"
        className="bg-white border border-[#DCE1E6] rounded-[4px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#DCE1E6] gov-card"
      >
        {p.quickOverviewCards.map((card) => (
          <div key={card.id} className="p-5 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-sm font-bold text-[#0B5D1E] tracking-wide">
                {card.title}
              </h2>
              <p className="text-sm text-[#1F2933]/80 leading-relaxed">{card.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection(card.id)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B5D1E] hover:underline self-start cursor-pointer"
            >
              <span>{card.linkText}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </section>

      <section
        id="about"
        className="scroll-mt-6 border-t border-[#DCE1E6] pt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <div className="lg:col-span-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1F2933] text-balance">
            {p.aboutSectionTitle}
          </h2>
        </div>
        <div className="lg:col-span-8 space-y-4 text-base text-[#1F2933]/90 leading-relaxed max-w-[65ch]">
          {p.aboutParagraphs.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>
      </section>

      <section id="what-is-hvisa" className="scroll-mt-6 border-t border-[#DCE1E6] pt-8 space-y-6">
        <div className="space-y-2 max-w-[68ch]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1F2933]">{p.whatIsTitle}</h2>
          <p className="text-base text-[#1F2933]/85 leading-relaxed">{p.whatIsIntro}</p>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-[4px] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DCE1E6] gov-card">
          {p.whatIsTerms.map((item) => (
            <div key={item.term} className="p-5 space-y-2">
              <div className="text-base font-bold text-[#1F2933]">{item.term}</div>
              <div className="text-xs font-semibold text-[#0B5D1E]">{item.plainMeaning}</div>
              <p className="text-sm text-[#1F2933]/85 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-6 border-t border-[#DCE1E6] pt-8 space-y-6">
        <div className="max-w-[68ch]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1F2933]">{p.howItWorksTitle}</h2>
          <p className="text-sm text-[#1F2933]/80 mt-1">{p.howItWorksSubtitle}</p>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-[4px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#DCE1E6] gov-card">
          {p.howItWorksSteps.map((st) => (
            <div key={st.step} className="p-5 flex flex-col gap-2">
              <div className="font-mono tabular-nums text-xs font-bold text-[#0B5D1E]">
                {st.step.padStart(2, '0')}
              </div>
              <h3 className="text-sm font-bold text-[#1F2933] leading-snug">{st.title}</h3>
              <p className="text-sm text-[#1F2933]/80 leading-relaxed">{st.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="who-can-use" className="scroll-mt-6 border-t border-[#DCE1E6] pt-8 space-y-6">
        <div className="max-w-[68ch]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1F2933]">{p.whoCanUseTitle}</h2>
          <p className="text-sm text-[#1F2933]/80 mt-1">{p.whoCanUseSubtitle}</p>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-[4px] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DCE1E6] gov-card">
          {p.roles.map((r) => (
            <div key={r.title} className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#0B5D1E] shrink-0" />
                <h3 className="text-base font-bold text-[#1F2933]">{r.title}</h3>
              </div>
              <div className="text-xs font-semibold text-[#0B5D1E]">{r.badge}</div>
              <p className="text-sm text-[#1F2933]/85 leading-relaxed">{r.summary}</p>
              <ul className="space-y-1 text-sm text-[#1F2933] list-disc pl-5">
                {r.permissions.map((perm) => (
                  <li key={perm}>{perm}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="scroll-mt-6 border-t border-[#DCE1E6] pt-8 space-y-5">
        <div className="max-w-[68ch]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1F2933]">{p.galleryTitle}</h2>
          <p className="text-sm text-[#1F2933]/80 mt-1">{p.gallerySubtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {p.galleryItems.map((item) => (
            <figure
              key={item.key}
              className="border border-[#DCE1E6] rounded-[4px] overflow-hidden flex flex-col bg-white gov-card"
            >
              <div className="h-44 w-full overflow-hidden bg-[#EEF1F4]">
                {item.key === 'pap_svg' ? (
                  <SamplePapCurveGraphic />
                ) : (
                  <ImageWithFallback
                    src={galleryAssetMap[item.key]}
                    alt={item.alt}
                    caption={item.caption}
                    className="w-full h-44 object-cover"
                  />
                )}
              </div>
              <figcaption className="bg-[#1F2933] text-white px-3.5 py-2.5 text-xs leading-snug flex-1">
                {item.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-6 border-t border-[#DCE1E6] pt-8 space-y-5">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1F2933]">{p.faqTitle}</h2>

        <div className="divide-y divide-[#DCE1E6] border border-[#DCE1E6] rounded-[4px] bg-white gov-card">
          {p.faqs.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-3.5 text-left flex items-center justify-between gap-4 hover:bg-[#F7F8F9] cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-semibold text-[#1F2933]">
                    {idx + 1}. {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#0B5D1E] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#1F2933]/70 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-2 text-sm text-[#1F2933]/85 leading-relaxed bg-[#F7F8F9] border-t border-[#DCE1E6]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section id="contact" className="scroll-mt-6 border-t border-[#DCE1E6] pt-8 space-y-5">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#0B5D1E]" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#1F2933]">{p.contactTitle}</h2>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-[4px] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DCE1E6] gov-card">
          {p.contactCards.map((c) => (
            <div key={c.label} className="p-5 space-y-1.5">
              <div className="text-xs font-bold text-[#0B5D1E]">{c.label}</div>
              <div className="text-sm font-mono font-bold text-[#1F2933]">{c.value}</div>
              <div className="text-xs text-[#1F2933]/80">{c.note}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#FDF8EE] border border-[#E5D5B5] rounded-[4px] p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1F2933]">
            <Info className="w-4 h-4 text-[#B26A00] shrink-0" />
            <span>{p.disclaimerTitle}</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[#1F2933]/90">
            {p.disclaimerPoints.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
