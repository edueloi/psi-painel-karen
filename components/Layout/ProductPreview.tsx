import React, { useState } from "react";
import {
  CalendarDays,
  FileText,
  Wallet,
  Sparkles,
  Check,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import logoUrl from "../../images/logo-sistema/logo.png";

const sections = [
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "prontuario", label: "Prontuário", icon: FileText },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
] as const;
export function ProductPreview() {
  const [section, setSection] = useState<
    "agenda" | "prontuario" | "financeiro"
  >("agenda");
  return (
    <div className="ps-product-scene">
      <div className="ps-product-orbit" aria-hidden="true" />
      <div className="ps-product-window">
        <div className="ps-product-top">
          <span className="ps-window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>Seu espaço de cuidado</span>
          <span className="ps-demo-label">Demonstração</span>
        </div>
        <div className="ps-product-body">
          <aside className="ps-product-sidebar" aria-hidden="true">
            <img src={logoUrl} alt="" />
            {sections.map((item) => (
              <item.icon
                key={item.key}
                size={19}
                className={section === item.key ? "active" : ""}
              />
            ))}
            <Sparkles size={19} />
          </aside>
          <div className="ps-product-content">
            <div className="ps-product-greeting">
              <div>
                <small>Bem-vinda ao seu consultório</small>
                <h3>
                  {section === "agenda"
                    ? "Um dia bem organizado."
                    : section === "prontuario"
                      ? "Cada história, conectada."
                      : "Clareza para decidir."}
                </h3>
              </div>
              <span className="ps-preview-avatar">P</span>
            </div>
            <div
              className="ps-product-tabs"
              role="tablist"
              aria-label="Demonstração da plataforma"
            >
              {sections.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`preview-tab-${key}`}
                  aria-selected={section === key}
                  aria-controls="preview-panel"
                  tabIndex={section === key ? 0 : -1}
                  onClick={() => setSection(key)}
                  onKeyDown={(event) => {
                    const current = sections.findIndex(
                      (item) => item.key === key,
                    );
                    const next =
                      event.key === "ArrowRight"
                        ? (current + 1) % sections.length
                        : event.key === "ArrowLeft"
                          ? (current + sections.length - 1) % sections.length
                          : -1;
                    if (next >= 0) {
                      event.preventDefault();
                      setSection(sections[next].key);
                      document
                        .getElementById(`preview-tab-${sections[next].key}`)
                        ?.focus();
                    }
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
            <div
              key={section}
              id="preview-panel"
              className="ps-preview-panel"
              role="tabpanel"
              aria-labelledby={`preview-tab-${section}`}
            >
              {section === "agenda" ? (
                <>
                  <div className="ps-preview-stats">
                    <div>
                      <small>Atendimentos</small>
                      <strong>03</strong>
                    </div>
                    <div>
                      <small>Confirmados</small>
                      <strong>
                        02 <Check size={16} />
                      </strong>
                    </div>
                  </div>
                  <div className="ps-preview-subtitle">
                    <strong>Próximos atendimentos</strong>
                    <CalendarDays size={15} />
                  </div>
                  {[
                    {
                      time: "09:00",
                      name: "Paciente A",
                      kind: "Consulta presencial",
                      status: "Confirmado",
                    },
                    {
                      time: "10:00",
                      name: "Paciente B",
                      kind: "Sessão online",
                      status: "Confirmado",
                    },
                    {
                      time: "14:00",
                      name: "Paciente C",
                      kind: "Avaliação",
                      status: "Agendado",
                    },
                  ].map((row) => (
                    <div key={row.time} className="ps-preview-appointment">
                      <span>{row.time}</span>
                      <div>
                        <strong>{row.name}</strong>
                        <small>{row.kind}</small>
                      </div>
                      <b className={row.status === "Agendado" ? "pending" : ""}>
                        {row.status}
                      </b>
                    </div>
                  ))}
                </>
              ) : section === "prontuario" ? (
                <>
                  <div className="ps-preview-patient">
                    <span className="ps-preview-avatar">A</span>
                    <div>
                      <strong>Paciente A</strong>
                      <small>Histórico clínico organizado</small>
                    </div>
                  </div>
                  {[
                    {
                      title: "Anamnese",
                      desc: "História e contexto do paciente",
                      status: "Aprovado",
                    },
                    {
                      title: "Avaliação",
                      desc: "Registro clínico estruturado",
                      status: "Aprovado",
                    },
                    {
                      title: "Evolução da sessão",
                      desc: "Anotações para sua revisão",
                      status: "Rascunho",
                    },
                  ].map((row) => (
                    <div className="ps-preview-record" key={row.title}>
                      <FileText size={17} />
                      <div>
                        <strong>{row.title}</strong>
                        <small>{row.desc}</small>
                      </div>
                      <span>{row.status}</span>
                    </div>
                  ))}
                  <div className="ps-preview-ai">
                    <Sparkles size={16} />
                    <span>A IA apoia. Você revisa e decide.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="ps-preview-stats">
                    <div>
                      <small>Recebido</small>
                      <strong>R$ 840</strong>
                    </div>
                    <div>
                      <small>A receber</small>
                      <strong>R$ 280</strong>
                    </div>
                  </div>
                  <div
                    className="ps-preview-chart"
                    aria-label="Gráfico financeiro ilustrativo"
                  >
                    {[35, 58, 44, 76, 62, 92, 80].map((height, i) => (
                      <i key={i} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="ps-preview-appointment">
                    <Wallet size={18} />
                    <div>
                      <strong>Recebimentos conectados</strong>
                      <small>Consultas, comandas e pagamentos</small>
                    </div>
                    <ArrowUpRight size={17} />
                  </div>
                </>
              )}
            </div>
            <p className="ps-preview-foot">
              <Clock size={12} /> Dados fictícios para ilustrar os recursos.
            </p>
          </div>
        </div>
      </div>
      <div className="ps-product-note">
        <span>
          <Sparkles size={18} />
        </span>
        <div>
          <strong>Menos tarefas repetitivas</strong>
          <small>Mais presença no atendimento.</small>
        </div>
      </div>
    </div>
  );
}
