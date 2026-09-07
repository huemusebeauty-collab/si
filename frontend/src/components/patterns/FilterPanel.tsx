"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/basic/Checkbox";
import { Label } from "@/components/basic/Label";

export interface FilterGroup {
  id: string;
  label: string;
  options: { id: string; label: string }[];
}

export function FilterPanel({ groups }: { groups: FilterGroup[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(groupId: string, optionId: string, checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(groupId);
    params.delete(groupId);
    const next = checked ? [...current, optionId] : current.filter((v) => v !== optionId);
    for (const v of next) params.append(groupId, v);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <aside aria-label="Filter products" className="w-full border-fog sm:w-64 sm:border-r sm:pr-6">
      {groups.map((group) => (
        <div key={group.id} className="mb-6">
          <Label as="label">{group.label}</Label>
          <div className="mt-2 flex flex-col gap-2">
            {group.options.map((opt) => (
              <Checkbox
                key={opt.id}
                label={opt.label}
                checked={searchParams.getAll(group.id).includes(opt.id)}
                onChange={(e) => toggle(group.id, opt.id, e.target.checked)}
              />
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
