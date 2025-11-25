import { Editor } from '@tinymce/tinymce-react';
import imageCompression from 'browser-image-compression';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase';
import './CreateEvents.css';

const todayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const CreateEvents = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [dateVisited, setDateVisited] = useState(todayISO());
  const [location, setLocation] = useState('');
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef(null);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageName('');
      setImagePreview('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setImageName('');
      setImagePreview('');
      event.target.value = '';
      return;
    }
    const maxSizeBytes = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSizeBytes) {
      setImageName('');
      setImagePreview('');
      event.target.value = '';
      alert('Please select an image smaller than 3MB.');
      return;
    }

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1400,
        useWebWorker: true
      });
      setImageName(compressed.name || file.name);
      setImageFile(compressed);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result || '');
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
      setImageName('');
      setImagePreview('');
      setImageFile(null);
      event.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageName('');
    setImagePreview('');
    setImageFile(null);
    const input = document.getElementById('eventImage');
    if (input) input.value = '';
  };

  const resetForm = () => {
    setTitle('');
    setDateVisited(todayISO());
    setLocation('');
    setImageName('');
    setImagePreview('');
    setImageFile(null);
    setContent('');
    if (editorRef.current) editorRef.current.setContent('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const strippedContent = decodeHtmlEntities(content.replace(/<[^>]*>/g, '')).trim();
    if (!title.trim()) {
      alert('Please enter an event title.');
      return;
    }
    if (!dateVisited) {
      alert('Please select a date.');
      return;
    }
    if (!location.trim()) {
      alert('Please enter event location.');
      return;
    }
    if (!imageFile) {
      alert('Please upload an event image.');
      return;
    }
    if (!strippedContent) {
      alert('Please add event details.');
      return;
    }

    setSubmitting(true);
    try {
      const eventsRef = collection(db, 'events');
      const latestQuery = query(eventsRef, orderBy('event_id', 'desc'), limit(1));
      const snapshot = await getDocs(latestQuery);
      let nextEventId = 1;
      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data().event_id;
        const latestNumber = typeof latest === 'number' ? latest : parseInt(latest, 10) || 0;
        nextEventId = latestNumber + 1;
      }

      const storageRef = ref(storage, `eventImages/${Date.now()}-${imageName || 'event-image'}`);
      await uploadBytes(storageRef, imageFile, { contentType: imageFile.type });
      const imageUrl = await getDownloadURL(storageRef);

      const formattedDate = (() => {
        const value = new Date(dateVisited);
        const dd = String(value.getDate()).padStart(2, '0');
        const mm = String(value.getMonth() + 1).padStart(2, '0');
        const yy = String(value.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      })();

      await addDoc(eventsRef, {
        event_id: nextEventId,
        event_title: title.trim(),
        date_visited: formattedDate,
        location: location.trim(),
        event_img: imageUrl,
        event_description: strippedContent,
        event_description_html: content,
        created_at: serverTimestamp()
      });

      alert('Event created successfully!');
      resetForm();
      navigate('/events');
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="dashboard create-events">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Create Events</h1>
          <p className="dashboard-subtitle">Add details for a new event.</p>
        </div>
        <button type="button" className="create-events__back" onClick={() => navigate('/events')}>
          Back to Events
        </button>
      </div>

      <form className="create-events__form" onSubmit={handleSubmit}>
        <div className="create-events__row">
          <div className="create-events__field">
            <label className="create-events__label" htmlFor="eventTitle">Event Title</label>
            <input
              id="eventTitle"
              type="text"
              className="create-events__input"
              placeholder="Enter event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="create-events__field">
            <label className="create-events__label" htmlFor="eventDate">Event Date</label>
            <input
              id="eventDate"
              type="date"
              className="create-events__input"
              value={dateVisited}
              onChange={(e) => setDateVisited(e.target.value)}
            />
          </div>
        </div>

        <div className="create-events__field">
          <label className="create-events__label" htmlFor="eventLocation">Event Location</label>
          <input
            id="eventLocation"
            type="text"
            className="create-events__input"
            placeholder="Enter event location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="create-events__field">
          <label className="create-events__label" htmlFor="eventImage">Event Image</label>
          <input
            id="eventImage"
            type="file"
            accept="image/*"
            className="create-events__file-input"
            onChange={handleImageChange}
          />
          {imageName ? (
            <span className="create-events__file-name">Selected file: {imageName}</span>
          ) : (
            <span className="create-events__file-hint">Only image formats (PNG, JPG, WEBP, etc.) are allowed.</span>
          )}
          {imagePreview && (
            <div className="create-events__preview">
              <img src={imagePreview} alt="Event" />
              <button type="button" className="create-events__remove-preview" onClick={handleRemoveImage}>
                ×
              </button>
            </div>
          )}
        </div>

        <div className="create-events__field">
          <label className="create-events__label">Event Details</label>
          <Editor
            apiKey="8kkw34lep0u86hul0w8bh88120xcr7hs1zmrga7890rgicp5"
            onInit={(_, editor) => (editorRef.current = editor)}
            value={content}
            onEditorChange={(value) => setContent(value)}
            init={{
              height: 500,
              menubar: false,
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
              ],
              toolbar:
                'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | removeformat | help | link image',
              content_style:
                'body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; }',
              placeholder: 'Write your event details here... Use the toolbar above to format your text.',
              branding: false,
              promotion: false,
              resize: true,
              statusbar: false,
              block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote',
              setup: (editor) => {
                editor.on('init', () => {
                  if (!content) editor.setContent('');
                });
              }
            }}
          />
        </div>

        <div className="create-events__actions">
          <button type="submit" className="create-events__submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Event'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateEvents;
