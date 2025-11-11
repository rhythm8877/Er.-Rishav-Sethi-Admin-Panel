import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiTrash2 } from 'react-icons/fi';
import Select from 'react-select';
import { db } from '../../firebase';
import './Connect.css';

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : '-';
  }
  return value || '-';
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number') return String(value).toLowerCase();
  try {
    return JSON.stringify(value).toLowerCase();
  } catch (err) {
    return '';
  }
};

const formatDate = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;

  let dateValue = value;
  if (typeof value.toDate === 'function') {
    dateValue = value.toDate();
  } else if (!(value instanceof Date)) {
    dateValue = new Date(value);
  }

  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return '-';
  }

  const dd = String(dateValue.getDate()).padStart(2, '0');
  const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
  const yy = String(dateValue.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const parseDateForSort = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const parts = value.split(/[\/-]/);
    if (parts.length >= 3) {
      const [day, month, yearRaw] = parts;
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      const iso = `${year}-${month}-${day}`;
      const time = new Date(iso).getTime();
      if (!Number.isNaN(time)) return time;
    }
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }
  try {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  } catch (err) {
    return 0;
  }
};

const getPreview = (content = '', expanded) => {
  if (!content) return '-';
  const formatted = formatValue(content);
  if (formatted === '-' || expanded) return formatted;
  const text = typeof content === 'string' ? content.trim() : String(content || '');
  if (text.length <= 160) return text;
  return `${text.slice(0, 160)}…`;
};

const Connect = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [order, setOrder] = useState('latest');
  const [expanded, setExpanded] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    try {
      const q = collection(db, 'connectForm');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const records = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          setRequests(records);
          setLoading(false);
        },
        (err) => {
          setError(err.message || 'Failed to load connection requests');
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      setError('Failed to initialize connection requests listener');
      setLoading(false);
      return undefined;
    }
  }, []);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (normalizedQuery) {
      filtered = requests.filter((req) => {
        const name = normalizeText(req.name);
        const email = normalizeText(req.email);
        const contact = normalizeText(req.contact);
        return name.includes(normalizedQuery) || email.includes(normalizedQuery) || contact.includes(normalizedQuery);
      });
    }
    return [...filtered].sort((a, b) => {
      const aTime = parseDateForSort(a.submittedAt);
      const bTime = parseDateForSort(b.submittedAt);
      return order === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }, [requests, normalizedQuery, order]);

  const toggleExpanded = (requestId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const openDeleteModal = (request) => setPendingDelete(request);
  const closeDeleteModal = () => setPendingDelete(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'connectForm', pendingDelete.id));
    } catch (err) {
      setError(err?.message || 'Failed to delete request');
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  };

  return (
    <section className="connect-section">
      <div className="connect-header">
        <h1 className="connect-title">Connection Requests</h1>
        <p className="connect-subtitle">Manage incoming connection requests from the app.</p>
      </div>

      <div className="connect-card">
        <div className="connect-card-actions">
          <div className="connect-search-field">
            <FiSearch className="connect-search-icon" />
            <input
              type="text"
              className="connect-search-input"
              placeholder="Search requests by name, email, or phone number"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="connect-actions-right">
            <div className="connect-select-wrapper">
              <Select
                classNamePrefix="connect-select"
                value={{ value: order, label: order === 'latest' ? 'Latest requests' : 'Oldest requests' }}
                onChange={(option) => setOrder(option?.value || 'latest')}
                options={[
                  { value: 'latest', label: 'Latest requests' },
                  { value: 'oldest', label: 'Oldest requests' }
                ]}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
          </div>
        </div>

        <div className="connect-table-wrapper">
          <table className="connect-table">
            <thead>
              <tr>
                <th className="connect-slno">Sl. No.</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Message</th>
                <th>Request Date</th>
                <th className="connect-delete-column">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="connect-empty">Loading requests…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="connect-empty">{error}</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="connect-empty">No connection requests found.</td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => {
                  const previewSource = request.message;
                  const isExpanded = expanded.has(request.id);
                  return (
                    <tr key={request.id}>
                      <td className="connect-slno">{index + 1}</td>
                      <td>{formatValue(request.name)}</td>
                      <td>{formatValue(request.email)}</td>
                      <td>{formatValue(request.contact)}</td>
                      <td className="connect-content-cell">
                        <p>{getPreview(previewSource, isExpanded)}</p>
                        {formatValue(previewSource) !== '-' && previewSource.length > 160 && (
                          <button type="button" className="connect-read-toggle" onClick={() => toggleExpanded(request.id)}>
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </td>
                      <td>{formatDate(request.submittedAt)}</td>
                      <td className="connect-delete-column">
                        <button
                          type="button"
                          className="connect-delete-btn"
                          onClick={() => openDeleteModal(request)}
                          aria-label={`Delete request from ${formatValue(request.name)}`}
                          disabled={deleting}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingDelete && (
        <div className="connect-modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div className="connect-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2 className="connect-modal-title">Confirm deletion</h2>
            <p className="connect-modal-text">
              Are you sure you want to delete the request from "{formatValue(pendingDelete.name)}"?
            </p>
            <div className="connect-modal-actions">
              <button type="button" className="connect-btn" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="connect-btn connect-btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Connect;
