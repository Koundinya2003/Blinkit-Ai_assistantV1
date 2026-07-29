"use client";

import { useState, useEffect, useCallback } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User as FirebaseUser,
  type AuthError
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { User, AuthProvider } from "./types";

type AuthState = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
};

type AuthActions = {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

type AuthContextValue = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  loading: true,
  isAuthenticated: false,
  error: null
};

export const AuthContext = {
  ...initialState,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signInAsGuest: async () => {},
  signOut: async () => {},
  clearError: () => {}
} as AuthContextValue;

export function useAuth(): AuthContextValue {
  const [state, setState] = useState<AuthState>(initialState);

  const createUserProfile = useCallback(async (firebaseUser: FirebaseUser, provider: AuthProvider): Promise<User> => {
    if (!db) throw new Error("Firestore not initialized");

    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    const now = new Date();
    const userData: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      phoneNumber: firebaseUser.phoneNumber,
      provider,
      addresses: [],
      defaultAddressId: null,
      createdAt: userSnap.exists() ? userSnap.data().createdAt : now,
      lastLoginAt: now
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
    } else {
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }

    return userData;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, loading: true }));
      if (!auth) throw new Error("Firebase Auth not initialized");

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = await createUserProfile(result.user, "google");
      
      setState({
        user,
        loading: false,
        isAuthenticated: true,
        error: null
      });
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = "Failed to sign in with Google";
      
      if (authError.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign in cancelled";
      } else if (authError.code === "auth/popup-blocked") {
        errorMessage = "Popup blocked. Please allow popups for this site.";
      } else if (authError.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [createUserProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, error: null, loading: true }));
      if (!auth) throw new Error("Firebase Auth not initialized");

      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = await createUserProfile(result.user, "email");
      
      setState({
        user,
        loading: false,
        isAuthenticated: true,
        error: null
      });
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = "Failed to sign in";
      
      if (authError.code === "auth/invalid-credential" || authError.code === "auth/wrong-password" || authError.code === "auth/user-not-found") {
        errorMessage = "Invalid email or password";
      } else if (authError.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      } else if (authError.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      } else if (authError.code === "auth/email-already-in-use") {
        errorMessage = "Email already in use. Please sign in instead.";
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [createUserProfile]);

  const signInAsGuest = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, loading: true }));
      if (!auth) throw new Error("Firebase Auth not initialized");

      const result = await signInAnonymously(auth);
      const user = await createUserProfile(result.user, "anonymous");
      
      setState({
        user,
        loading: false,
        isAuthenticated: true,
        error: null
      });
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = "Failed to sign in as guest";
      
      if (authError.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [createUserProfile]);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, loading: true }));
      if (!auth) throw new Error("Firebase Auth not initialized");

      await firebaseSignOut(auth);
      
      setState({
        user: null,
        loading: false,
        isAuthenticated: false,
        error: null
      });
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = "Failed to sign out";
      
      if (authError.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection.";
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    if (!auth) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const provider: AuthProvider = firebaseUser.isAnonymous ? "anonymous" : 
            firebaseUser.providerData[0]?.providerId === "google.com" ? "google" : "email";
          const user = await createUserProfile(firebaseUser, provider);
          
          setState({
            user,
            loading: false,
            isAuthenticated: true,
            error: null
          });
        } catch (error) {
          console.error("Error creating user profile:", error);
          setState(prev => ({
            ...prev,
            loading: false,
            error: "Failed to load user profile"
          }));
        }
      } else {
        setState({
          user: null,
          loading: false,
          isAuthenticated: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, [createUserProfile]);

  return {
    ...state,
    signInWithGoogle,
    signInWithEmail,
    signInAsGuest,
    signOut,
    clearError
  };
}

export function useAuthStatus() {
  const { isAuthenticated, loading } = useAuth();
  return { isAuthenticated, loading };
}