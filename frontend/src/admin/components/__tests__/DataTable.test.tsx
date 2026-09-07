import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type Column } from "../DataTable";

interface Row { id: string; name: string }
const columns: Column<Row>[] = [{ header: "Name", render: (r) => r.name }];

describe("DataTable", () => {
  it("renders an empty state when there are no rows", () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="Nothing to see." />);
    expect(screen.getByText("Nothing to see.")).toBeInTheDocument();
  });

  it("renders a skeleton while loading, not the empty state", () => {
    render(<DataTable columns={columns} rows={[]} isLoading emptyMessage="Nothing to see." />);
    expect(screen.queryByText("Nothing to see.")).not.toBeInTheDocument();
  });

  it("renders each row's cells via the column render function", () => {
    render(<DataTable columns={columns} rows={[{ id: "1", name: "Muse Rose" }]} />);
    expect(screen.getByText("Muse Rose")).toBeInTheDocument();
  });

  it("calls onToggleSelect with the row id when its checkbox is clicked", () => {
    const onToggleSelect = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Muse Rose" }]}
        selectable
        selectedIds={new Set()}
        onToggleSelect={onToggleSelect}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select row 1" }));
    expect(onToggleSelect).toHaveBeenCalledWith("1");
  });

  it("calls onPageChange when pagination changes page", () => {
    const onPageChange = vi.fn();
    render(
      <DataTable columns={columns} rows={[{ id: "1", name: "Muse Rose" }]} page={1} totalPages={3} onPageChange={onPageChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
