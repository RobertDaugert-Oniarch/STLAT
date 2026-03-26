import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";

interface AuthGuardOptions {
  /** If true, redirects verified users to /profile (for VerifyEmailPage) */
  requireUnverified?: boolean;
}

/**
 * Listens to Firebase auth state. Redirects to /login if no user.
 * Returns the authenticated user and a loading flag.
 */
export function useAuthGuard(options?: AuthGuardOptions) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
        return;
      }
      if (options?.requireUnverified && firebaseUser.emailVerified) {
        navigate("/profile");
        return;
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate, options?.requireUnverified]);

  return { user, loading };
}
