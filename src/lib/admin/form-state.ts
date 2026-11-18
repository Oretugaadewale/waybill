export interface FormState {
  /** null until the form is sent; then whether it worked. */
  ok: boolean | null;
  /** Message for the whole form, shown above the button. */
  message: string | null;
  /** One message per field name. */
  errors: Record<string, string>;
  /** What was typed, so a failed form keeps its values. */
  values: Record<string, string>;
  /** Changes on every success, so forms can reset. */
  savedAt: number;
}

export const initialFormState: FormState = {
  ok: null,
  message: null,
  errors: {},
  values: {},
  savedAt: 0,
};

/**
 * Database rule violations are raised with code P0001 and a message written
 * for people, so they can be shown as they are. Anything else stays generic.
 */
export function databaseMessage(error: { code?: string; message: string }): string {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "This account is not allowed to do that.";
  return "Something went wrong while saving. Try again.";
}
