import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { app } from '@/config/firebaseConfig';

export const db = getFirestore(app);

// ─── Expense ──────────────────────────────────────────────────────────────────
export type Expense = {
  id?: string;
  title: string;
  note: string;
  amount: number;
  category: string;
  categoryIcon: string;     // Ionicon name (e.g. 'restaurant-outline')
  date: string;             // ISO string
  uid: string;
  budgetId?: string;        // links expense to a budget envelope
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

// ─── Budget Envelope ──────────────────────────────────────────────────────────
export type Budget = {
  id?: string;
  name: string;             // e.g. "Food", "Travel", "Promise 1"
  threshold: number;        // income cap for this envelope
  iconName: string;         // Ionicon name
  uid: string;
};

export async function addBudget(budget: Omit<Budget, 'id'>) {
  const ref = collection(db, 'users', budget.uid, 'budgets');
  const docRef = await addDoc(ref, {
    ...budget,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateBudget(uid: string, budgetId: string, data: Partial<Omit<Budget, 'id' | 'uid'>>) {
  await updateDoc(doc(db, 'users', uid, 'budgets', budgetId), data);
}

export async function deleteBudget(uid: string, budgetId: string) {
  await deleteDoc(doc(db, 'users', uid, 'budgets', budgetId));
}

export function subscribeToBudgets(uid: string, callback: (budgets: Budget[]) => void) {
  const ref = collection(db, 'users', uid, 'budgets');
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data: Budget[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Budget, 'id'>),
    }));
    callback(data);
  });
}
