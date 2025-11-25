import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { db, isFirebaseReady } from '../../firebase';
import './Events.css';

const fallbackImage = 'https://placehold.co/80x80?text=No+Img';

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

const decodeHtmlEntities = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (typeof document === 'undefined') return text;
  
  // Handle double-encoded entities by decoding multiple times until no change
  let decoded = text;
  let previous = '';
  let iterations = 0;
  const maxIterations = 10; // Safety limit
  
  while (decoded !== previous && iterations < maxIterations) {
    previous = decoded;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = decoded;
    decoded = textarea.value;
    iterations++;
  }
  
  return decoded;
};

const getPreview = (content = '', expanded) => {
  if (!content) return '-';
  const formatted = formatValue(content);
  if (formatted === '-' || expanded) return formatted;
  const text = typeof content === 'string' ? content.trim() : String(content || '');
  const decodedText = decodeHtmlEntities(text);
  if (decodedText.length <= 160) return decodedText;
  return `${decodedText.slice(0, 160)}…`;
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [order, setOrder] = useState('latest');
  const [expanded, setExpanded] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError('');
    
    if (!isFirebaseReady() || !db) {
      setError('Firebase is not configured. Please set environment variables in Netlify dashboard.');
      setLoading(false);
      return;
    }
    
    try {
      const q = collection(db, 'events');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const records = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          setEvents(records);
          setLoading(false);
        },
        (err) => {
          setError(err.message || 'Failed to load events');
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      setError('Failed to initialize events listener');
      setLoading(false);
      return undefined;
    }
  }, []);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredEvents = useMemo(() => {
    if (!normalizedQuery) return events;
    return events.filter((eventDoc) => {
      const title = normalizeText(eventDoc.event_title);
      const description = normalizeText(eventDoc.event_description_text || eventDoc.event_description);
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  }, [events, normalizedQuery]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const aTime = parseDateForSort(a.date_visited);
      const bTime = parseDateForSort(b.date_visited);
      return order === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }, [filteredEvents, order]);

  const toggleExpanded = (eventId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const openDeleteModal = (eventDoc) => setPendingDelete(eventDoc);
  const closeDeleteModal = () => setPendingDelete(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'events', pendingDelete.id));
    } catch (err) {
      setError(err?.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  };

  return (
    <section className="events-section">
      <div className="events-header">
        <h1 className="events-title">Events</h1>
        <p className="events-subtitle">Review and manage upcoming and past events.</p>
      </div>

      <div className="events-card">
        <div className="events-card-actions">
          <div className="events-search-field">
            <FiSearch className="events-search-icon" />
            <input
              type="text"
              className="events-search-input"
              placeholder="Search events by title or keywords"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="events-actions-right">
            <div className="events-select-wrapper">
              <Select
                classNamePrefix="events-select"
                value={{ value: order, label: order === 'latest' ? 'Latest events' : 'Oldest events' }}
                onChange={(option) => setOrder(option?.value || 'latest')}
                options={[
                  { value: 'latest', label: 'Latest events' },
                  { value: 'oldest', label: 'Oldest events' }
                ]}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
            <button
              type="button"
              className="events-btn events-btn-primary"
              onClick={() => navigate('/events/create')}
            >
              Create Event
            </button>
          </div>
        </div>

        <div className="events-table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th className="events-slno">Sl. No.</th>
                <th>Event Image</th>
                <th>Event Title</th>
                <th>Event Details</th>
                <th>Event Location</th>
                <th>Event Date</th>
                <th className="events-delete-column">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="events-empty">Loading events…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="events-empty">{error}</td>
                </tr>
              ) : sortedEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="events-empty">No events found.</td>
                </tr>
              ) : (
                sortedEvents.map((eventDoc, index) => {
                  const previewSource = eventDoc.event_description_text || eventDoc.event_description;
                  const isExpanded = expanded.has(eventDoc.id);
                  return (
                    <tr key={eventDoc.id}>
                      <td className="events-slno">{index + 1}</td>
                      <td>
                        <div className="events-image">
                          <img
                            src={formatValue(eventDoc.event_img) !== '-' ? eventDoc.event_img : fallbackImage}
                            alt={formatValue(eventDoc.event_title)}
                          />
                        </div>
                      </td>
                      <td>{formatValue(eventDoc.event_title)}</td>
                      <td className="events-content-cell">
                        <p>{getPreview(previewSource, isExpanded)}</p>
                        {formatValue(previewSource) !== '-' && (
                          <button type="button" className="events-read-toggle" onClick={() => toggleExpanded(eventDoc.id)}>
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </td>
                      <td>{formatValue(eventDoc.location)}</td>
                      <td>{formatDate(eventDoc.date_visited)}</td>
                      <td className="events-delete-column">
                        <button
                          type="button"
                          className="events-delete-btn"
                          onClick={() => openDeleteModal(eventDoc)}
                          aria-label={`Delete ${formatValue(eventDoc.event_title)}`}
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
        <div className="events-modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div className="events-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2 className="events-modal-title">Confirm deletion</h2>
            <p className="events-modal-text">
              Are you sure you want to delete the event "{formatValue(pendingDelete.event_title)}"?
            </p>
            <div className="events-modal-actions">
              <button type="button" className="events-btn" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="events-btn events-btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Events;
