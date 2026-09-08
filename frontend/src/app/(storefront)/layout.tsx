import type { ReactNode } from "react";
import { StorefrontLayout } from "@/layouts/StorefrontLayout";
import { WebsiteEventTracker } from "@/components/WebsiteEventTracker";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <WebsiteEventTracker />
      <StorefrontLayout>{children}</StorefrontLayout>
    </>
  );
}
