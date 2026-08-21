import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Minimal shape of the Google Identity Services API we use.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function GoogleSignInButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!CLIENT_ID) {
      console.warn(
        "VITE_GOOGLE_CLIENT_ID is not set — Sign in with Google is disabled.",
      );
      return;
    }

    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          try {
            await signInWithGoogle(response.credential);
          } catch (error) {
            console.error("Google sign-in failed:", error);
            toast({
              title: "Sign-in failed",
              description: "Something went wrong signing you in. Please try again.",
              variant: "destructive",
            });
          }
        },
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "medium",
        shape: "pill",
        text: "signin_with",
      });
    };

    // The GSI script loads with `async defer`, so it may not be ready yet.
    if (window.google) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, [signInWithGoogle, toast]);

  if (!CLIENT_ID) return null;

  return <div ref={buttonRef} data-testid="button-google-signin" />;
}
