import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiTrash2 } from 'react-icons/fi';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, callDeleteUser } from '../../firebase';
import './Users.css';

const fallbackAvatar = 'https://placehold.co/80x80?text=No+Img';

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : '-';
  }
  return value || '-';
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const q = query(collection(db, 'users'), orderBy('fullName'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const records = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          setUsers(records);
          setLoading(false);
        },
        (err) => {
          setError(err.message || 'Failed to load users');
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      setError('Failed to initialize users listener');
      setLoading(false);
      return undefined;
    }
  }, []);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) return users;
    return users.filter((user) => {
      const name = (user.fullName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const phone = (user.phone || '').toLowerCase();
      return (
        name.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        phone.includes(normalizedQuery)
      );
    });
  }, [users, normalizedQuery]);

  const openDeleteModal = (user) => setPendingDelete(user);
  const closeDeleteModal = () => setPendingDelete(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');

    try {
      const uid = pendingDelete.uid || null;
      const email = pendingDelete.email || null;

      await deleteDoc(doc(db, 'users', pendingDelete.id));

      try {
        await callDeleteUser({ uid, email });
      } catch (fnError) {
        console.error('Failed to delete auth user', fnError);
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  };

  return (
    <section className="users-section">
      <div className="users-header">
        <h1 className="users-title">Registered Users</h1>
        <p className="users-subtitle">Manage the users of the Er. Rishav Sethi application.</p>
      </div>

      <div className="users-card">
        <div className="users-card-actions">
          <div className="users-search-field">
            <FiSearch className="users-search-icon" />
            <input
              type="text"
              className="users-search-input"
              placeholder="Search users by name, email, or phone"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th className="users-slno-column">Sl. No.</th>
                <th>Profile Image</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Gender</th>
                <th className="users-delete-column">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="users-empty-state">Loading users…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="users-empty-state">{error}</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="users-empty-state">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td className="users-slno-column">{index + 1}</td>
                    <td>
                      <div className="users-avatar">
                        <img
                          src={formatValue(user.profileImageUrl) !== '-' ? user.profileImageUrl : fallbackAvatar}
                          alt={formatValue(user.fullName)}
                        />
                      </div>
                    </td>
                    <td>{formatValue(user.fullName)}</td>
                    <td>{formatValue(user.email)}</td>
                    <td>{formatValue(user.phone)}</td>
                    <td>{formatValue(user.gender)}</td>
                    <td className="users-delete-column">
                      <button
                        type="button"
                        className="users-delete-btn"
                        onClick={() => openDeleteModal(user)}
                        aria-label={`Delete ${formatValue(user.fullName)}`}
                        disabled={deleting}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingDelete && (
        <div className="users-modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div className="users-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2 className="users-modal-title">Confirm deletion</h2>
            <p className="users-modal-text">
              Are you sure you want to delete the user "{formatValue(pendingDelete.fullName || pendingDelete.email)}"?
            </p>
            <div className="users-modal-actions">
              <button type="button" className="users-btn" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="users-btn users-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Users;
