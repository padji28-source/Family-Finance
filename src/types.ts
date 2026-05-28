export interface UserProfile {
  name: string;
  email: string;
  familyId: string | null;
  createdAt: any; // Timestamp
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: any; // Timestamp
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: any; // Timestamp
  description: string;
  addedBy: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface UIError {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: any;
}
