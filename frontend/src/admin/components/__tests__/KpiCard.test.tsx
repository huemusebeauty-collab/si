import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "../KpiCard";

describe("KpiCard", () => {
  it("renders the label and value", () => {
    render(<KpiCard label="Today's Orders" value={12} />);
    expect(screen.getByText("Today's Orders")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders a formatted string value as-is", () => {
    render(<KpiCard label="Revenue" value="$1,204.50" />);
    expect(screen.getByText("$1,204.50")).toBeInTheDocument();
  });
});
