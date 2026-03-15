import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { app } from '@/config/firebaseConfig';

export const db = getFirestore(app);

export type Expense = {
  id?: string;
  title: string;
  note: string;
  amount: number;
  category: string;
  categoryIcon: string;
  date: string; // ISO string
  uid: string;
};

export async function addExpense(expense: Omit<Expense, 'id'>) {
  const expensesRef = collection(db, 'users', expense.uid, 'expenses');
  await addDoc(expensesRef, {
    ...expense,
    createdAt: Timestamp.now(),
  });
}

export function subscribeToExpenses(uid: string, callback: (expenses: Expense[]) => void) {
  const expensesRef = collection(db, 'users', uid, 'expenses');
  const q = query(expensesRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data: Expense[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Expense, 'id'>),
    }));
    callback(data);
  });
}

export async function deleteExpense(uid: string, expenseId: string) {
  await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
}

export async function updateExpense(uid: string, expenseId: string, data: Partial<Omit<Expense, 'id' | 'uid'>>) {
  await updateDoc(doc(db, 'users', uid, 'expenses', expenseId), data);
}
