import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App";
import "react-loading-skeleton/dist/skeleton.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("No se encontró el elemento raíz");

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
