import { useState } from "react";
import { describe, expect, it, } from "vitest";
import { render, fireEvent, screen, } from "@testing-library/react";
import { useConfirm } from "./useConfirm";

// A test helper component to interact with useConfirm
function TestConfirmComponent() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [result, setResult] = useState<string>("none");

  const handleShow = async () => {
    const res = await confirm({
      title: "Test Title",
      message: "Test Message",
      confirmLabel: "Yes",
      cancelLabel: "No",
    });
    setResult(String(res));
  };

  return (
    <div>
      <button data-testid="show-btn" onClick={handleShow}>
        Show Dialog
      </button>
      <span data-testid="result-span">{result}</span>
      {ConfirmDialog}
    </div>
  );
}

describe("useConfirm Hook", () => {
  it("resolves to true when clicking confirm", async () => {
    render(<TestConfirmComponent />);
    
    const showBtn = screen.getByTestId("show-btn");
    fireEvent.click(showBtn);

    // Dialog is visible (rendered by Radix Portal)
    const title = await screen.findByText("Test Title");
    expect(title).toBeInTheDocument();

    const confirmBtn = screen.getByText("Yes");
    fireEvent.click(confirmBtn);

    // Dialog should close and resolve promise to true
    const resultSpan = await screen.findByTestId("result-span");
    expect(resultSpan.textContent).toBe("true");
  });

  it("resolves to false when clicking cancel", async () => {
    render(<TestConfirmComponent />);
    
    const showBtn = screen.getByTestId("show-btn");
    fireEvent.click(showBtn);

    const title = await screen.findByText("Test Title");
    expect(title).toBeInTheDocument();

    const cancelBtn = screen.getByText("No");
    fireEvent.click(cancelBtn);

    const resultSpan = await screen.findByTestId("result-span");
    expect(resultSpan.textContent).toBe("false");
  });
});
