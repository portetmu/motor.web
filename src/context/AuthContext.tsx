import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface AuthContextValue {
  firebaseUser: User | null;
  idToken: string | null;
  loadingAuth: boolean;
  signInWithGoogle: () => Promise<string | null>;
  logoutFirebase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  idToken: null,
  loadingAuth: true,
  signInWithGoogle: async () => null,
  logoutFirebase: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<string | null> => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const token = await cred.user.getIdToken();
    setFirebaseUser(cred.user);
    setIdToken(token);
    return token;
  };

  const logoutFirebase = async (): Promise<void> => {
    await signOut(auth);
    setFirebaseUser(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        idToken,
        loadingAuth,
        signInWithGoogle,
        logoutFirebase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useFirebaseAuth = () => useContext(AuthContext);
