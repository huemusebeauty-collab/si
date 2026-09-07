import { ErrorRecovery } from "@/components/patterns/ErrorRecovery";
import { StorefrontLayout } from "@/layouts/StorefrontLayout";

export default function NotFound() {
  return (
    <StorefrontLayout>
      <div className="py-24">
        <ErrorRecovery
          heading="Page not found"
          body="The page you're looking for doesn't exist or may have moved."
        />
      </div>
    </StorefrontLayout>
  );
}
