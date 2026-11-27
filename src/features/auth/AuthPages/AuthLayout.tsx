import type { ReactNode } from "react";
import gmLogoSmall from "../../../assets/gm-logo-small.png";

interface AuthLayoutProps {
  title: string;
  intro: string;
  children: ReactNode;
}

export default function AuthLayout({
  title,
  intro,
  children,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mx-auto grid min-h-screen w-full max-w-sm content-center gap-5 px-6 py-12">
        <header className="grid gap-2">
          <img
            className="h-7 w-auto max-w-10 object-contain object-left invert dark:invert-0"
            src={gmLogoSmall}
            alt="GM Ingenieros y Consultores"
          />
          <div className="flex flex-col">
            <h1 className="m-0 text-lg text-neutral-800 dark:text-neutral-100">
              {title}
            </h1>
            <p className="m-0 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              {intro}
            </p>
          </div>
        </header>
        <div className="grid gap-4">{children}</div>
      </div>
    </main>
  );
}
