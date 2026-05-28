import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, setDoc, updateDoc, serverTimestamp, arrayUnion, orderBy } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Family, Transaction } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  family: Family | null;
  transactions: Transaction[];
  loading: boolean;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (familyId: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'addedBy'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const useData = () => useContext(DataContext);

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.familyId) {
      setFamily(null);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const familyRef = doc(db, 'families', profile.familyId);
    const unsubFamily = onSnapshot(familyRef, (docSnap) => {
      if (docSnap.exists()) {
        setFamily({ id: docSnap.id, ...docSnap.data() } as Family);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'families'));

    const txRef = collection(db, 'families', profile.familyId, 'transactions');
    const q = query(txRef, orderBy('date', 'desc'));
    const unsubTx = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach(doc => {
        txs.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(txs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'transactions'));

    return () => {
      unsubFamily();
      unsubTx();
    };
  }, [profile?.familyId]);

  const createFamily = async (name: string) => {
    if (!user) return;
    const familyId = generateId();
    const newFamily = {
      name,
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'families', familyId), newFamily);
      await updateDoc(doc(db, 'users', user.uid), { familyId });
      await refreshProfile();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'families');
    }
  };

  const joinFamily = async (familyId: string) => {
    if (!user) return;
    try {
      const familyRef = doc(db, 'families', familyId);
      const docSnap = await getDoc(familyRef);
      if (!docSnap.exists()) throw new Error("Family not found");
      
      await updateDoc(familyRef, { memberIds: arrayUnion(user.uid) });
      await updateDoc(doc(db, 'users', user.uid), { familyId });
      await refreshProfile();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'families');
    }
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'addedBy'>) => {
    if (!user || !profile?.familyId) return;
    const txId = generateId();
    const newTx = {
      ...tx,
      addedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'families', profile.familyId, 'transactions', txId), newTx);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!profile?.familyId) return;
    try {
      // Actually delete
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'families', profile.familyId, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  };

  return (
    <DataContext.Provider value={{ family, transactions, loading, createFamily, joinFamily, addTransaction, deleteTransaction }}>
      {children}
    </DataContext.Provider>
  );
};
