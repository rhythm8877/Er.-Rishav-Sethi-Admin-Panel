import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiTrash2 } from 'react-icons/fi';
import Select from 'react-select';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseReady } from '../../firebase';
import './Blogs.css';

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
    // try dd/mm/yy or dd/mm/yyyy
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
  // Decode HTML entities before displaying
  const decodedText = decodeHtmlEntities(text);
  if (decodedText.length <= 160) return decodedText;
  return `${decodedText.slice(0, 160)}…`;
};

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
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
      const q = collection(db, 'blogs');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const records = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          setBlogs(records);
          setLoading(false);
        },
        (err) => {
          setError(err.message || 'Failed to load blogs');
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      setError('Failed to initialize blogs listener');
      setLoading(false);
      return undefined;
    }
  }, []);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredBlogs = useMemo(() => {
    if (!normalizedQuery) return blogs;
    return blogs.filter((blog) => {
      const title = normalizeText(blog.title);
      const content = normalizeText(blog.blog_content || blog.blog_content_html);
      return title.includes(normalizedQuery) || content.includes(normalizedQuery);
    });
  }, [blogs, normalizedQuery]);

  const sortedBlogs = useMemo(() => {
    return [...filteredBlogs].sort((a, b) => {
      const aTime = parseDateForSort(a.date_created);
      const bTime = parseDateForSort(b.date_created);
      return order === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }, [filteredBlogs, order]);

  const toggleExpanded = (blogId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(blogId)) {
        next.delete(blogId);
      } else {
        next.add(blogId);
      }
      return next;
    });
  };

  const openDeleteModal = (blog) => setPendingDelete(blog);
  const closeDeleteModal = () => setPendingDelete(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (!isFirebaseReady() || !db) {
      setError('Firebase is not configured. Cannot delete blog.');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'blogs', pendingDelete.id));
    } catch (err) {
      setError(err?.message || 'Failed to delete blog');
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  };

  return (
    <section className="blogs-section">
      <div className="blogs-header">
        <h1 className="blogs-title">Blogs</h1>
        <p className="blogs-subtitle">Review and manage the published blog content.</p>
      </div>

      <div className="blogs-card">
        <div className="blogs-card-actions">
          <div className="blogs-search-field">
            <FiSearch className="blogs-search-icon" />
            <input
              type="text"
              className="blogs-search-input"
              placeholder="Search blogs by title or keywords"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="blogs-actions-right">
            <div className="blogs-select-wrapper">
              <Select
                classNamePrefix="blogs-select"
                value={{ value: order, label: order === 'latest' ? 'Latest first' : 'Oldest first' }}
                onChange={(option) => setOrder(option?.value || 'latest')}
                options={[
                  { value: 'latest', label: 'Latest first' },
                  { value: 'oldest', label: 'Oldest first' }
                ]}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
            <button
              type="button"
              className="blogs-btn blogs-btn-primary"
              onClick={() => navigate('/blogs/create')}
            >
              Create Blog
            </button>
          </div>
        </div>

        <div className="blogs-table-wrapper">
          <table className="blogs-table">
            <thead>
              <tr>
                <th className="blogs-slno">Sl. No.</th>
                <th>Blog Image</th>
                <th>Blog Title</th>
                <th>Blog Content</th>
                <th>Date Created</th>
                <th className="blogs-delete-column">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="blogs-empty">Loading blogs…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="blogs-empty">{error}</td>
                </tr>
              ) : sortedBlogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="blogs-empty">No blogs found.</td>
                </tr>
              ) : (
                sortedBlogs.map((blog, index) => {
                  const previewSource = blog.blog_content || blog.blog_content_html;
                  const isExpanded = expanded.has(blog.id);
                  return (
                    <tr key={blog.id}>
                      <td className="blogs-slno">{index + 1}</td>
                      <td>
                        <div className="blogs-image">
                          <img
                            src={formatValue(blog.img) !== '-' ? blog.img : fallbackImage}
                            alt={formatValue(blog.title)}
                          />
                        </div>
                      </td>
                      <td>{formatValue(blog.title)}</td>
                      <td className="blogs-content-cell">
                        <p>{getPreview(previewSource, isExpanded)}</p>
                        {formatValue(previewSource) !== '-' && (
                          <button type="button" className="blogs-read-toggle" onClick={() => toggleExpanded(blog.id)}>
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </td>
                      <td>{formatDate(blog.date_created)}</td>
                      <td className="blogs-delete-column">
                        <button
                          type="button"
                          className="blogs-delete-btn"
                          onClick={() => openDeleteModal(blog)}
                          aria-label={`Delete ${formatValue(blog.title)}`}
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
        <div className="blogs-modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div className="blogs-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2 className="blogs-modal-title">Confirm deletion</h2>
            <p className="blogs-modal-text">
              Are you sure you want to delete the blog "{formatValue(pendingDelete.title)}"?
            </p>
            <div className="blogs-modal-actions">
              <button type="button" className="blogs-btn" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="blogs-btn blogs-btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete blog'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Blogs;
