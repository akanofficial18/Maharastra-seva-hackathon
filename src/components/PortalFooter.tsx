import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n.tsx';
import { PORTAL_CONTENT } from '../lib/portalContent.ts';

type FooterDialogKey = 'accessibility' | 'terms' | 'privacy' | 'help';

interface PortalFooterProps {
  onJumpSection?: (sectionId: string) => void;
}

export function PortalFooter({ onJumpSection }: PortalFooterProps) {
  const { lang } = useI18n();
  const content = PORTAL_CONTENT[lang] ?? PORTAL_CONTENT.en;
  const f = content.footer;
  const navLinks = content.header.publicNav;

  const [openDialog, setOpenDialog] = useState<FooterDialogKey | null>(null);

  return (
    <footer className="no-print bg-[#1F2933] text-white border-t border-[#DCE1E6] mt-auto">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="font-semibold text-[#FF9933]">{f.quickLinks}:</span>
            {navLinks
              .filter((item) => ['about', 'what-is-hvisa', 'how-it-works', 'faq', 'contact'].includes(item.id))
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (onJumpSection) {
                      onJumpSection(item.id);
                    } else {
                      const el = document.getElementById(item.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="text-white/90 hover:text-[#FF9933] underline-offset-4 hover:underline cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {(['accessibility', 'terms', 'privacy', 'help'] as FooterDialogKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setOpenDialog(key)}
                className="text-white/90 hover:text-[#FF9933] underline-offset-4 hover:underline cursor-pointer"
              >
                {f[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-white/80">
          <div>{f.lastUpdatedLine}</div>
          <div>{f.prototypeLine}</div>
        </div>
      </div>

      {openDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-info-title"
        >
          <div className="bg-white text-[#1F2933] border border-[#1F2933] rounded-[6px] max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-[#1F2933] text-white flex items-center justify-between border-b border-white/15">
              <h2 id="footer-info-title" className="text-base font-bold">
                {f.infoTexts[openDialog].title}
              </h2>
              <button
                type="button"
                onClick={() => setOpenDialog(null)}
                aria-label={f.dialogClose}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm leading-relaxed text-[#222B33]">
                {f.infoTexts[openDialog].body}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpenDialog(null)}
                  className="px-4 py-2 text-sm font-semibold bg-[#0B5D1E] hover:bg-[#094a17] text-white rounded-[4px] cursor-pointer"
                >
                  {f.dialogClose}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
