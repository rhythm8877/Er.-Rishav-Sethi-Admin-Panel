import { useEffect, useMemo, useRef, useState } from 'react';
import { FiImage, FiPlus, FiRefreshCw, FiTrash2, FiUpload } from 'react-icons/fi';
import imageCompression from 'browser-image-compression';
import {
  getDownloadURL,
  getMetadata,
  listAll,
  ref as storageRef,
  uploadBytes,
  deleteObject
} from 'firebase/storage';
import Select from 'react-select';
import { storage } from '../../firebase';
import './Carousel.css';

const CAROUSEL_FOLDER = 'carouselImages';
const MAX_MB = 3;

const kb = (bytes) => Math.round(bytes / 1024);

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : '-';
  }
  return value || '-';
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const Carousel = () => {
  const [images, setImages] = useState([]); // {name, url, created, size}
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState('latest');
  const fileInputRef = useRef(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    setError('');
    try {
      const folderRef = storageRef(storage, `${CAROUSEL_FOLDER}/`);
      const res = await listAll(folderRef);
      const withMeta = await Promise.all(
        res.items.map(async (itemRef) => {
          try {
            const [url, meta] = await Promise.all([getDownloadURL(itemRef), getMetadata(itemRef)]);
            return {
              name: itemRef.name,
              url,
              created: meta.timeCreated ? new Date(meta.timeCreated).getTime() : 0,
              size: meta.size || 0,
              fullPath: itemRef.fullPath
            };
          } catch {
            const url = await getDownloadURL(itemRef);
            return { name: itemRef.name, url, created: 0, size: 0, fullPath: itemRef.fullPath };
          }
        })
      );
      setImages(withMeta);
    } catch (err) {
      setError(err?.message || 'Failed to load carousel images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      const aTime = a.created || 0;
      const bTime = b.created || 0;
      return order === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }, [images, order]);

  const triggerPick = () => {
    fileInputRef.current?.click();
  };

  const handlePick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        event.target.value = '';
        return;
      }
      const maxBytes = MAX_MB * 1024 * 1024;
      let uploadFile = file;
      if (file.size > maxBytes) {
        const compressed = await imageCompression(file, {
          maxSizeMB: MAX_MB,
          maxWidthOrHeight: 2000,
          useWebWorker: true
        });
        uploadFile = compressed;
      }
      setUploading(true);
      const name = `${Date.now()}_${file.name.replace(/\\s+/g, '_')}`;
      const ref = storageRef(storage, `${CAROUSEL_FOLDER}/${name}`);
      await uploadBytes(ref, uploadFile, { contentType: uploadFile.type });
      await fetchImages();
    } catch (err) {
      setError(err?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const openDeleteModal = (image) => setPendingDelete(image);
  const closeDeleteModal = () => {
    if (deleting) return;
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.fullPath) return;
    setDeleting(true);
    setError('');
    try {
      const ref = storageRef(storage, pendingDelete.fullPath);
      await deleteObject(ref);
      setPendingDelete(null);
      await fetchImages();
    } catch (err) {
      setError(err?.message || 'Failed to delete image');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="carousel-section">
      <div className="carousel-header">
        <h1 className="carousel-title">Carousel</h1>
        <p className="carousel-subtitle">Upload and manage homepage carousel images.</p>
      </div>

      <div className="carousel-card">
        <div className="carousel-card-actions">
          <div className="carousel-actions-left">
            <button type="button" className="carousel-btn" onClick={fetchImages} disabled={loading || uploading}>
              <FiRefreshCw />
              <span>Refresh</span>
            </button>
          </div>
          <div className="carousel-actions-right">
            <div className="carousel-select-wrapper">
              <Select
                classNamePrefix="carousel-select"
                value={{ value: order, label: order === 'latest' ? 'Latest images' : 'Oldest images' }}
                onChange={(opt) => setOrder(opt?.value || 'latest')}
                options={[
                  { value: 'latest', label: 'Latest images' },
                  { value: 'oldest', label: 'Oldest images' }
                ]}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePick}
              style={{ display: 'none' }}
            />
            <button type="button" className="carousel-btn carousel-btn-primary" onClick={triggerPick} disabled={uploading}>
              <FiUpload />
              <span>{uploading ? 'Uploading…' : 'Upload image'}</span>
            </button>
          </div>
        </div>

        {error && <div className="carousel-error">{error}</div>}

        <div className="carousel-grid">
          {loading ? (
            <div className="carousel-empty">Loading images…</div>
          ) : sortedImages.length === 0 ? (
            <div className="carousel-empty">No images yet. Click “Upload image”.</div>
          ) : (
            sortedImages.map((img, idx) => (
              <div className="carousel-item" key={img.fullPath || img.url}>
                <div className="carousel-thumb">
                  <img src={img.url} alt={img.name} />
                </div>
                <div className="carousel-meta">
                  <div className="carousel-meta-name" title={img.name}>
                    <FiImage /> <span>{img.name}</span>
                  </div>
                  <div className="carousel-meta-sub">
                    <span>#{idx + 1}</span>
                    <span>{formatDate(img.created)}</span>
                    <span>{img.size ? `${kb(img.size)} KB` : '-'}</span>
                  </div>
                </div>
                <div className="carousel-actions">
                  <a className="carousel-btn" href={img.url} target="_blank" rel="noreferrer">
                    <FiPlus />
                    <span>Open</span>
                  </a>
                  <button type="button" className="carousel-btn carousel-btn-danger" onClick={() => openDeleteModal(img)}>
                    <FiTrash2 />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {pendingDelete && (
        <div className="carousel-modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div className="carousel-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2 className="carousel-modal-title">Confirm deletion</h2>
            <p className="carousel-modal-text">
              Are you sure you want to delete the image "{pendingDelete.name}" from the carousel?
            </p>
            <div className="carousel-modal-actions">
              <button type="button" className="carousel-btn" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="carousel-btn carousel-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Carousel;


