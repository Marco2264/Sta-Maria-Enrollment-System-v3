import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'subadmin' | 'teacher' | 'parent' | null;
  userData: Record<string, unknown> | null;
  loading: boolean;
  updateUserData?: (updates: Record<string, unknown>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  userData: null,
  loading: true,
  updateUserData: () => {}
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'subadmin' | 'teacher' | 'parent' | null>(null);
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUserData = (updates: Record<string, unknown>) => {
    setUserData((prev) => (prev ? { ...prev, ...updates } : updates));
  };

  useEffect(() => {
    // Safety fallback: Ensure auth loading completes within 2s even if network is slow
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // Fetch user role and profile from Firestore
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setRole(data.role || 'parent');
            setUserData(data);
          } else {
            // Default fallback for newly registered parent users
            setRole('parent');
            setUserData({ email: user.email, fullName: user.displayName || 'Parent User', role: 'parent' });
          }
        } catch (err) {
          console.warn("AuthContext user doc fetch failed, falling back to default role:", err);
          setRole('parent');
          setUserData({ email: user.email, fullName: user.displayName || 'Parent User', role: 'parent' });
        }
      } else {
        setRole(null);
        setUserData(null);
      }
      clearTimeout(safetyTimer);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, userData, loading, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};
