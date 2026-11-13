import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../actions", () => ({
  signIn: vi.fn(),
}));

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("has labelled email and password fields that password managers recognise", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});
