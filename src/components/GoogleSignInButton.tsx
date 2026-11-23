import { GoogleLogin } from "@react-oauth/google";
import { useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { GOOGLE_CLIENT_ID } from "../auth/google";

// Google renders its button at a fixed pixel width between 200 and 400.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

interface Props {
  /** The button's wording. */
  text: "signin_with" | "signup_with" | "continue_with";
  /** Called once the portal session has started. */
  onSignedIn: () => void;
  /** Shows a failure message, or clears it (null) when a new attempt starts. */
  onError: (message: string | null) => void;
}

/** An "or" divider and Google's sign-in button; nothing when Google sign-in isn't configured. */
export function GoogleSignInButton({ text, onSignedIn, onError }: Props) {
  const { loginWithGoogle } = useAuth();
  const slot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  // Full width of the card, like the password form's button.
  useLayoutEffect(() => {
    if (slot.current) setWidth(slot.current.clientWidth);
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  async function handleCredential(credential: string | undefined) {
    if (!credential) {
      onError("Google did not return a sign-in token. Please try again.");
      return;
    }
    onError(null);
    try {
      await loginWithGoogle(credential);
      onSignedIn();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <>
      <div className="auth-divider">or</div>
      <div className="google-signin" ref={slot}>
        {width !== null && (
          <GoogleLogin
            text={text}
            size="large"
            shape="rectangular"
            logo_alignment="center"
            width={Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))}
            onSuccess={({ credential }) => void handleCredential(credential)}
            onError={() => onError("Google sign-in failed. Please try again.")}
          />
        )}
      </div>
    </>
  );
}
