import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { Home } from "../pages/public/Home";
import { Funcionalidades } from "../pages/public/Funcionalidades";
import { Planos } from "../pages/public/Planos";
import { Sobre } from "../pages/public/Sobre";
import { Register } from "../pages/Register";
import { PsychologistDirectory } from "../pages/PsychologistDirectory";
import { Terms } from "../pages/Terms";
import { PrivacyPolicy } from "../pages/PrivacyPolicy";

const pages = {
  "/": Home,
  "/funcionalidades": Funcionalidades,
  "/planos": Planos,
  "/sobre": Sobre,
  "/cadastro": Register,
  "/encontrar-profissional": PsychologistDirectory,
  "/termos-de-uso": Terms,
  "/politica-privacidade": PrivacyPolicy,
};
const guest = {
  token: null,
  user: null,
  isAuthenticated: false,
  isSuperAdmin: false,
  isAdmin: false,
  isProfissional: false,
  isInitializing: false,
  login: () => {},
  logout: () => {},
  hasPermission: () => false,
  updateUser: () => {},
};
export function renderPage(path: keyof typeof pages) {
  const Page = pages[path];
  return renderToString(
    <AuthContext.Provider value={guest}>
      <MemoryRouter initialEntries={[path]}>
        <Page />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
