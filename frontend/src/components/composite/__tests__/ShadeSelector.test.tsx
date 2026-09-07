import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShadeSelector } from "../ShadeSelector";

const shades = [
  { id: "s1", name: "Muse Rose", hex: "#B5486B", inStock: true },
  { id: "s2", name: "Deep Berry", hex: "#4A1030", inStock: false },
];

describe("ShadeSelector", () => {
  it("disables out-of-stock shades but still renders them", () => {
    render(<ShadeSelector shades={shades} />);
    const outOfStock = screen.getByRole("radio", { name: /Deep Berry \(out of stock\)/i });
    expect(outOfStock).toBeDisabled();
  });

  it("has an accessible radiogroup", () => {
    render(<ShadeSelector shades={shades} />);
    expect(screen.getByRole("radiogroup", { name: "Select a shade" })).toBeInTheDocument();
  });
});
