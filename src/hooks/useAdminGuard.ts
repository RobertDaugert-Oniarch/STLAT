import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { USERS } from "../firebase/collections";
import type { UserRole } from "../types/user";

/**
 * Listens to Firebase auth state and checks Firestore role.
 * Redirects to /login if not authenticated, to /profile if not admin.
 * Returns the authenticated user, admin status, and loading flag.
 */
export function useAdminGuard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const cachedUid = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        cachedUid.current = null;
        navigate("/login");
        return;
      }

      // Skip Firestore fetch if role was already checked for this uid
      if (cachedUid.current === firebaseUser.uid && user) {
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, USERS, firebaseUser.uid));
        const role = userDoc.data()?.role as UserRole | undefined;

        if (role === "admin") {
          cachedUid.current = firebaseUser.uid;
          setUser(firebaseUser);
          setIsAdmin(true);
          setLoading(false);
        } else {
          navigate("/profile");
        }
      } catch (err) {
        console.error("Admin guard: failed to verify role", err);
        setError("Failed to verify admin access. Please try again.");
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate, user]);

  return { user, isAdmin, loading, error };
}
