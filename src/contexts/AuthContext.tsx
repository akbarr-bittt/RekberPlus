import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  balance: number;
  pin?: string;
  notificationsEnabled?: boolean;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  role?: 'user' | 'admin' | 'owner';
  isBlocked?: boolean;
  blockedReason?: string;
  hasAgreedToTOS?: boolean;
  termsAgreedAt?: any;
  bio?: string;
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAppLocked: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  platformSettings: any | null;
  unlockApp: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  systemStatus: 'ONLINE' | 'OFFLINE';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [platformSettings, setPlatformSettings] = useState<any | null>(null);
  const hasInitializedLock = React.useRef(false);

  const isAdmin = profile?.role === 'admin' || 
                  user?.email === 'akbar.is.messi@gmail.com' || 
                  user?.email === 'ralif152007@gmail.com' ||
                  user?.email === 'indonesiaronaldomessi@gmail.com';
  
  const isOwner = profile?.role === 'owner' || 
                  user?.email === 'akbar.is.messi@gmail.com' || 
                  user?.email === 'ralif152007@gmail.com' ||
                  user?.email === 'indonesiaronaldomessi@gmail.com';

  useEffect(() => {
    if (!user) {
      setSystemStatus('ONLINE');
      return;
    }
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlatformSettings(data);
        if (data.isOffline) {
          setSystemStatus('OFFLINE');
        } else {
          setSystemStatus('ONLINE');
        }
      } else {
        setSystemStatus('ONLINE');
      }
    }, (error) => {
      console.log('Settings snapshot error:', error);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    let profileUnsubscribe: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          
          // Use onSnapshot instead of getDoc for real-time profile (balance, etc.) updates
          profileUnsubscribe = onSnapshot(userRef, async (userSnap) => {
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              setProfile(data);
              
              // Only lock app initially if we haven't already processed it for this session
              if (data.pin && !hasInitializedLock.current) {
                 setIsAppLocked(true);
                 hasInitializedLock.current = true;
              }
              setLoading(false);
            } else {
              // Create new user profile
              const newProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                name: currentUser.displayName || 'User',
                balance: 0,
                createdAt: serverTimestamp(),
              };
              await setDoc(userRef, newProfile);
              // snapshot listener will catch the create and update profile
            }
          }, (error) => {
             handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`, auth);
             setLoading(false);
          });

        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`, auth);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setIsAppLocked(false);
        hasInitializedLock.current = false;
        setLoading(false);
        if (profileUnsubscribe) profileUnsubscribe();
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const unlockApp = () => {
    setIsAppLocked(false);
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAppLocked, isAdmin, isOwner, platformSettings, unlockApp, signInWithGoogle, signOut, systemStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
