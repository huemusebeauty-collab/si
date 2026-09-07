"use client";
import { useState } from "react";
import { RequireAdminAuth } from "@/admin/components/RequireAdminAuth";
import { AdminShell } from "@/admin/components/AdminShell";
import { RoleGate } from "@/admin/components/RoleGate";
import { useAdminQuery } from "@/admin/hooks/useAdminQuery";
import { adminApi } from "@/admin/lib/admin-api-client";
import { Button } from "@/components/basic/Button";
import { Input } from "@/components/basic/Input";

function FaqsContent() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const { data, isLoading, refetch } = useAdminQuery(() => adminApi.listFaqs(), []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] font-semibold text-ink">FAQ Management</h1>
      <ul className="flex flex-col divide-y divide-fog rounded-md bg-white shadow-rest">
        {isLoading && <li className="p-4 text-stone">Loading...</li>}
        {!isLoading && (data ?? []).length === 0 && <li className="p-4 text-stone">No FAQs yet.</li>}
        {(data ?? []).map((faq) => (
          <li key={faq.id} className="p-4">
            <p className="font-semibold text-ink">{faq.question}</p>
            <p className="text-stone">{faq.answer}</p>
          </li>
        ))}
      </ul>
      <RoleGate module="content" level="full">
        <div className="flex flex-col gap-4 rounded-md bg-white p-6 shadow-rest">
          <h2 className="font-semibold text-ink">New FAQ</h2>
          <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Input label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <Button
            variant="primary"
            className="w-fit"
            onClick={async () => {
              await adminApi.upsertFaq({ question, answer });
              setQuestion("");
              setAnswer("");
              refetch();
            }}
          >
            Add FAQ
          </Button>
        </div>
      </RoleGate>
    </div>
  );
}

export default function FaqsPage() {
  return (
    <RequireAdminAuth>
      <AdminShell><FaqsContent /></AdminShell>
    </RequireAdminAuth>
  );
}
