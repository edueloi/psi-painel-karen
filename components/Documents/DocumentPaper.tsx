import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SECRECY_NOTICE, fmtDateTimeBR, clean } from '../Records/pdf/clinicalDocument';
import { renderDocumentPdf, signatureBox, type DocumentModel } from './renderDocumentPdf';
import { blocksToHtml } from './buildDocument';
import { longDatePt } from './documentVariables';

const PAPER_PX = 794; // 210mm a 96dpi
const SERIF = "'Times New Roman', Times, serif";
const SANS = "Helvetica, Arial, sans-serif";
const INK = '#141414';
const GREY = '#5f5f5f';
const LINE = '#969696';

/**
 * Papel A4 branco (margens de 20mm) com o mesmo cabeçalho/rodapé do PDF. Escala para caber na largura
 * disponível (rolagem horizontal não é necessária). A paginação final é a do PDF ("Página X de Y").
 */
export const DocumentPaper: React.FC<{ model: DocumentModel; className?: string }> = ({ model, className }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, Math.max(0.3, (el.clientWidth - 2) / PAPER_PX)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pages = useMemo(() => {
    try { return renderDocumentPdf(model).getNumberOfPages(); } catch { return 1; }
  }, [model]);
  const bodyHtml = useMemo(() => blocksToHtml(model.blocks), [model.blocks]);

  const { clinic, professional } = model;
  const clinicName = clean(clinic.name) || 'Clínica';
  const profName = clean(professional.name) || 'Profissional';
  const legal = clean(clinic.legalName);
  const info = [
    clinic.cnpj ? `CNPJ: ${clean(clinic.cnpj)}` : '',
    clinic.phone ? `Tel.: ${clean(clinic.phone)}` : '',
    clinic.email ? `E-mail: ${clean(clinic.email)}` : '',
    clinic.website ? clean(clinic.website) : '',
  ].filter(Boolean).join('   |   ');
  const prof = [`Responsável: ${profName}`, professional.registry ? clean(professional.registry) : '', professional.specialty ? clean(professional.specialty) : ''].filter(Boolean).join('  -  ');
  const sig = model.signature === false ? null : (model.signature || {});
  const sigReg = sig ? (sig.registry !== undefined ? sig.registry : professional.registry) : '';
  const sigSpec = sig ? (sig.specialty !== undefined ? sig.specialty : professional.specialty) : '';
  const ident = model.identification.filter(p => clean(p.value));

  return (
    <div ref={wrapRef} className={className} style={{ width: '100%' }}>
      <div style={{ height: scale === 1 ? 'auto' : undefined }}>
        <div
          className="doc-paper"
          style={{
            width: `${PAPER_PX}px`, minHeight: '1123px', boxSizing: 'border-box', background: '#fff', color: INK,
            margin: '0 auto', zoom: scale, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
            padding: '45px 76px 0', position: 'relative',
          }}
        >
          {/* Cabeçalho institucional */}
          <div style={{ display: 'flex', gap: 15, paddingBottom: 8, borderBottom: `1.3px solid ${INK}` }}>
            {clinic.logo && <img src={clinic.logo.dataUrl} alt="" style={{ width: 68, height: 68, objectFit: 'contain', flexShrink: 0 }} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{clinicName}</div>
              <div style={{ fontFamily: SANS, fontSize: 10, color: GREY, lineHeight: 1.45, marginTop: 3 }}>
                {legal && legal.toLowerCase() !== clinicName.toLowerCase() && <div>{legal}</div>}
                {info && <div>{info}</div>}
                {clinic.address && <div>{clean(clinic.address)}</div>}
                <div>{prof}</div>
              </div>
            </div>
          </div>

          {/* Título e identificação */}
          <div style={{ flex: 1, paddingTop: 30, paddingBottom: 24 }}>
            <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 20, textAlign: 'center', margin: 0, letterSpacing: 0, textTransform: 'none' }}>
              {clean(model.title).toUpperCase()}
            </h1>
            {model.subtitle && <div style={{ fontFamily: SANS, fontSize: 11, color: GREY, textAlign: 'center', marginTop: 4 }}>{clean(model.subtitle)}</div>}

            {ident.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{model.identificationTitle || 'IDENTIFICAÇÃO DO PACIENTE'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: `1px solid ${LINE}`, fontFamily: SANS, fontSize: 11 }}>
                  {ident.map((p, i) => (
                    <div key={i} style={{ gridColumn: p.full ? '1 / span 2' : undefined, display: 'flex', gap: 8, padding: '5px 8px', borderBottom: `1px solid ${LINE}` }}>
                      <span style={{ fontWeight: 700, color: GREY, minWidth: 64 }}>{p.label}</span>
                      <span style={{ wordBreak: 'break-word' }}>{clean(p.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corpo */}
            <div
              className="doc-paper-body"
              style={{ fontFamily: SERIF, fontSize: 14.7, lineHeight: 1.5, textAlign: 'justify', marginTop: 22, overflowWrap: 'anywhere' }}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {/* Local, data e assinatura */}
            {sig && (
              <div style={{ fontFamily: SERIF, textAlign: 'center', marginTop: 38, breakInside: 'avoid' }}>
                <div style={{ fontSize: 14.7 }}>{model.place ? `${clean(model.place)}, ` : ''}{longDatePt(model.docDate)}.</div>
                <div style={{ position: 'relative', height: 64, marginTop: 0 }}>
                  {model.signatureImage && (() => {
                    const b = signatureBox(model.signatureImage);
                    return <img src={model.signatureImage.dataUrl} alt="Assinatura" style={{ position: 'absolute', left: '50%', bottom: 4, transform: 'translateX(-50%)', width: b.w * 3.78, height: b.h * 3.78 }} />;
                  })()}
                </div>
                <div style={{ width: 300, borderTop: `1px solid ${INK}`, margin: '0 auto 6px' }} />
                <div style={{ fontWeight: 700, fontSize: 14.7 }}>{clean(sig.name) || profName}</div>
                {clean(sigReg) && <div style={{ fontSize: 12.7 }}>{clean(sigReg)}</div>}
                {clean(sigSpec) && <div style={{ fontSize: 12.7 }}>{clean(sigSpec)}</div>}
                {model.signatureImage && (
                  <div style={{ fontFamily: SANS, fontSize: 9, color: GREY, marginTop: 4 }}>
                    Documento assinado eletronicamente por {clean(sig.name) || profName} em {fmtDateTimeBR(model.signedAt || model.emittedAt)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé institucional */}
          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 6, paddingBottom: 22, fontFamily: SANS, fontSize: 9.3, color: GREY, lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{clinicName}</span>
              <span style={{ whiteSpace: 'nowrap' }}>Página 1 de {pages}</span>
            </div>
            <div>Documento gerado em {fmtDateTimeBR(model.emittedAt)} por {profName}</div>
            <div style={{ fontStyle: 'italic', fontSize: 8.8 }}>{SECRECY_NOTICE}</div>
          </div>
        </div>
      </div>
      {pages > 1 && (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Pré-visualização contínua: o documento ocupa {pages} páginas no PDF, com cabeçalho e rodapé em todas.
        </p>
      )}
    </div>
  );
};
