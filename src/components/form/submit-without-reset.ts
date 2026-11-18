import { startTransition, type FormEvent } from "react";

/**
 * Submits a form to a server action without React's automatic form reset.
 *
 * React resets a form after its action runs. Inputs come back from their
 * default values, but a <select> whose value the page controls can come back
 * blank: after a failed booking, "Ships to" showed "Choose a country" while
 * the price still showed the UK. Keeping what the person typed is what they
 * expect when a form has an error, so these forms opt out.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
