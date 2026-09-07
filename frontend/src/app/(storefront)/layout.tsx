import type { ReactNode } from "react";
import { StorefrontLayout } from "@/layouts/StorefrontLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
