import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuantitySelector } from "../QuantitySelector";

describe("QuantitySelector", () => {
  it("does not go below the minimum value", () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={1} onChange={onChange} min={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("increments on click", () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
