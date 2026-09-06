import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, Users, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';

export function AdminView() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newAdminId, setNewAdminId] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const usersData: UserProfile[] = [];
      snapshot.forEach(doc => {
        usersData.push(doc.data() as UserProfile);
      });
      setUsers(usersData);
    } catch (err: any) {
      setError('Failed to fetch users. You might not have admin permissions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminId.trim()) return;
    
    try {
      await setDoc(doc(db, 'admins', newAdminId.trim()), {
        grantedAt: Date.now()
      });
      setNewAdminId('');
      alert('Admin privileges granted successfully.');
    } catch (err: any) {
      setError('Failed to grant admin privileges.');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-neutral-950">
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
        <Shield className="text-blue-500" size={24} />
        <h2 className="text-xl font-bold font-serif">Admin Dashboard</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <section className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Shield size={18} />
            Grant Admin Privileges
          </h3>
          <form onSubmit={handleGrantAdmin} className="flex gap-3">
            <input
              type="text"
              value={newAdminId}
              onChange={(e) => setNewAdminId(e.target.value)}
              placeholder="User ID (UID)"
              className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Grant Admin
            </button>
          </form>
        </section>

        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Users size={18} />
            All Users ({users.length})
          </h3>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="px-6 py-3 font-medium text-neutral-500">User ID</th>
                  <th className="px-6 py-3 font-medium text-neutral-500">Name</th>
                  <th className="px-6 py-3 font-medium text-neutral-500">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 font-mono text-xs text-neutral-500">{user.id}</td>
                    <td className="px-6 py-4 font-medium">{user.displayName || 'Unknown'}</td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">{user.email}</td>
                  </tr>
                ))}
                {users.length === 0 && !error && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
