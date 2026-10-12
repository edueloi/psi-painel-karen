import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Register } from "../Register";
import { PsychologistDirectory } from "../PsychologistDirectory";
import { api } from "../../services/api";
import {
  PUBLIC_SEO,
  structuredData,
  robotsForHost,
} from "../../seo/publicSeo.mjs";
import { planFeatureLabel } from "./publicSiteData";
import { Combobox } from '../../components/UI/Combobox';
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock("../../services/api", () => ({
  API_BASE_URL: "http://localhost:3013",
  api: { get: vi.fn(), post: vi.fn() },
}));
beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue([]);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const mount = (element: React.ReactNode) =>
  render(<MemoryRouter>{element}</MemoryRouter>);
const response = (data: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(data) });
describe("Cadastro e diretório público", () => {
  it('mantém as opções dos filtros dentro do dialog nativo', () => {
    render(<dialog open aria-label="Filtros"><Combobox options={[{ value: 'TCC', label: 'TCC' }]} placeholder="Escolher abordagem" onChange={() => {}} /></dialog>);
    fireEvent.click(screen.getByText('Escolher abordagem'));
    expect(screen.getByText('TCC').closest('dialog')).toBe(screen.getByRole('dialog'));
  });
  it("traduz recursos de plano sem exibir identificadores técnicos", () => {
    expect(planFeatureLabel("api_acesso")).toBe("Acesso à API");
    expect(planFeatureLabel("suporte_prioritario")).toBe("Suporte prioritário");
    expect(planFeatureLabel("recurso_novo")).toBe("Recurso novo");
  });
  it("valida acesso sem enviar dados e permite avançar pelo formulário", async () => {
    mount(<Register />);
    fireEvent.submit(
      screen.getByLabelText("Nome completo", { exact: false }).closest("form")!,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Digite seu nome completo",
    );
    fireEvent.change(screen.getByLabelText("Nome completo", { exact: false }), {
      target: { value: "Ana Teste" },
    });
    fireEvent.change(
      screen.getByLabelText("E-mail profissional", { exact: false }),
      { target: { value: "ana@" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("e-mail válido");
    fireEvent.change(
      screen.getByLabelText("E-mail profissional", { exact: false }),
      { target: { value: "ana@example.com" } },
    );
    fireEvent.change(screen.getByLabelText("Senha *", { exact: true }), {
      target: { value: "SenhaTeste123" },
    });
    fireEvent.change(
      screen.getByLabelText("Confirmar senha", { exact: false }),
      { target: { value: "SenhaTeste123" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByLabelText("Senha *", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
    fireEvent.submit(
      screen.getByLabelText("Nome completo", { exact: false }).closest("form")!,
    );
    expect(
      screen.getByRole("heading", { name: "Sua área de atuação" }),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(document.title).toBe(PUBLIC_SEO["/cadastro"].title);
  });
  it("distingue erro de busca vazia, preserva filtros e permite tentar novamente", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) =>
        url.includes("/cities") ? response([]) : response({}, false),
      );
    vi.stubGlobal("fetch", fetchMock);
    mount(<PsychologistDirectory />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os perfis",
    );
    expect(
      screen.queryByText("Nenhum resultado por aqui"),
    ).not.toBeInTheDocument();
    fetchMock.mockImplementation((url: string) =>
      url.includes("/cities")
        ? response([])
        : response({ data: [], total: 0, pages: 0 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByText("Nenhum resultado por aqui"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:3013/directory?"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
  it("exibe o nome, o perfil e usa links rastreáveis", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          url.includes("/cities")
            ? response([])
            : response({
                data: [
                  {
                    name: "Ana Teste",
                    public_slug: "ana-teste",
                    bio: "Psicóloga",
                    crp: "06/12345",
                  },
                ],
                total: 1,
                pages: 1,
              }),
        ),
    );
    mount(<PsychologistDirectory />);
    expect(await screen.findByText("Ana Teste")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Conhecer profissional" }),
    ).toHaveAttribute("href", "/p/ana-teste");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "1 profissional encontrado",
      ),
    );
  });
  it("mantém um título e canonical próprios sem preços ou avaliações inventados", () => {
    for (const entry of Object.values(PUBLIC_SEO)) {
      expect(entry.path).toBeDefined();
      expect(entry.title.length).toBeLessThan(85);
      const graph = structuredData(entry)["@graph"];
      expect(graph.find((node) => node["@id"].endsWith("#webpage"))?.url).toBe(
        `https://plaelo.com.br${entry.path}`,
      );
      expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|"price"/);
    }
    expect(robotsForHost("painel.plaelo.com.br")).toBe("noindex, nofollow");
    expect(robotsForHost("plaelo.com.br")).toContain("index, follow");
  });
});
