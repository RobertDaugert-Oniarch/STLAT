import { useState, useEffect } from "react";
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, USERS, firebaseUser.uid));
        const role = userDoc.data()?.role as UserRole | undefined;

        if (role === "admin") {
          setUser(firebaseUser);
          setIsAdmin(true);
          setLoading(false);
        } else {
          navigate("/profile");
        }
      } catch {
        navigate("/profile");
      }
    });
    return () => unsub();
  }, [navigate]);

  return { user, isAdmin, loading };
}
