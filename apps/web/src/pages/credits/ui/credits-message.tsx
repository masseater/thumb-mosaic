import type { ReactNode } from "react";

const MESSAGES = {
  pending: "一覧を読み込んでいます",
  error: "一覧を読み込めませんでした",
} as const;

const CreditsMessage = ({ status }: Readonly<{ status: keyof typeof MESSAGES }>): ReactNode => (
  <main className="mx-auto max-w-3xl p-6 sm:p-8">
    <p className="text-muted-foreground text-sm">{MESSAGES[status]}</p>
  </main>
);

export { CreditsMessage };
