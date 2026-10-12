import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Home } from "./Home";
import { Funcionalidades } from "./Funcionalidades";
import { Planos } from "./Planos";
import { Sobre } from "./Sobre";
import { publicPanelUrl } from "../../components/Layout/publicNavigation";
import { api } from "../../services/api";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock("../../services/api", () => ({ api: { get: vi.fn() } }));

const plans = [
  {
    id: 1,
    name: "Essencial",
    price: "99.90",
    max_users: 1,
    description: "Para o consultório",
    features: ["agenda", "prontuario", "api_acesso", "suporte_prioritario"],
    highlighted: 0,
  },
  {
    id: 2,
    name: "Equipe",
    price: "199.90",
    max_users: 5,
    description: "Para a clínica",
    features: ["agenda", "financeiro"],
    highlighted: "0",
  },
];
beforeEach(() => {
  vi.mocked(api.get).mockReset();
  vi.mocked(api.get).mockResolvedValue(plans);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
const mount = (page: React.ReactNode) =>
  render(<MemoryRouter>{page}</MemoryRouter>);

describe("Site público da Plaelo", () => {
  it("alterna a demonstração do produto por clique e pelo teclado", () => {
    mount(<Home />);
    fireEvent.click(screen.getByRole("tab", { name: "Prontuário" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Histórico clínico organizado",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Rascunho");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Prontuário" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Recebido");
    expect(
      screen.getByText("Dados fictícios para ilustrar os recursos."),
    ).toBeInTheDocument();
  });
  it("abre e fecha o menu móvel e restaura a rolagem", () => {
    mount(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("filtra o catálogo por área e por busca sem acentos", () => {
    mount(<Funcionalidades />);
    fireEvent.click(screen.getByRole("button", { name: "Gestão" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Buscar funcionalidade" }),
      { target: { value: "permissoes" } },
    );
    expect(
      screen.getByRole("heading", {
        name: "Uma clínica, diferentes responsabilidades",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Agenda que acompanha você" }),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Buscar funcionalidade" }),
      { target: { value: "não existe esse recurso" } },
    );
    expect(screen.getByText("Nenhum recurso encontrado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    expect(
      screen.getByRole("heading", { name: "Agenda que acompanha você" }),
    ).toBeInTheDocument();
  });
  it("mostra os preços da API, sem desconto fictício, e compara a inclusão real", async () => {
    mount(<Planos />);
    expect(
      await screen.findByRole("heading", { name: "Essencial" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s*99,90$/)).toBeInTheDocument();
    expect(screen.queryByText("Anual")).not.toBeInTheDocument();
    expect(screen.queryByText("Em destaque")).not.toBeInTheDocument();
    expect(screen.getByText("Suporte prioritário")).toBeInTheDocument();
    expect(
      screen.queryByText(/api_acesso|Acesso à API|suporte_prioritario/),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Comparar todos os recursos" }),
    );
    const table = screen.getByRole("table");
    expect(within(table).queryByText(/API|api_acesso/)).not.toBeInTheDocument();
    const row = within(table).getByRole("row", { name: /Prontuário digital/ });
    expect(within(row).getAllByRole("cell")).toHaveLength(2);
    expect(within(row).getByLabelText("Incluído")).toBeInTheDocument();
    expect(within(row).getByLabelText("Não incluído")).toBeInTheDocument();
  });
  it("oferece nova tentativa se a API dos planos falhar", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Falha de rede"));
    mount(<Planos />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os planos.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("heading", { name: "Essencial" }),
    ).toBeInTheDocument();
  });
  it("apresenta o propósito e mantém os links de navegação", () => {
    mount(<Sobre />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "A tecnologia cuida",
    );
    expect(
      screen.getByRole("link", { name: "Conhecer a plataforma" }),
    ).toHaveAttribute("href", "/funcionalidades");
    expect(
      screen.getByRole("link", { name: "Pular para o conteúdo" }),
    ).toHaveAttribute("href", "#conteudo");
  });
  it("preserva a família do domínio no acesso ao painel", () => {
    expect(publicPanelUrl(false, "plaelo.com.br")).toBe(
      "https://painel.plaelo.com.br/login",
    );
    expect(publicPanelUrl(true, "www.psiflux.com.br")).toBe(
      "https://painel.psiflux.com.br/visao-geral",
    );
    expect(publicPanelUrl(false, "localhost")).toBe("/login");
  });
});
