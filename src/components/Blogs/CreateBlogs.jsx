import imageCompression from 'browser-image-compression';
import { Editor } from '@tinymce/tinymce-react';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase';
import './CreateBlogs.css';

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

const CreateBlogs = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef(null);

  const readableDate = useMemo(() => {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) {
      return '-';
    }
    const dd = String(value.getDate()).padStart(2, '0');
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const yy = String(value.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }, [date]);

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
    const input = document.getElementById('blogImage');
    if (input) {
      input.value = '';
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate(todayISO());
    setImageName('');
    setImagePreview('');
    setImageFile(null);
    setContent('');
    if (editorRef.current) {
      editorRef.current.setContent('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Strip HTML tags and decode HTML entities
    const strippedContent = decodeHtmlEntities(content.replace(/<[^>]*>/g, '')).trim();
    if (!title.trim()) {
      alert('Please enter a blog title.');
      return;
    }

    if (!date) {
      alert('Please select a date.');
      return;
    }

    if (!imageFile) {
      alert('Please upload a blog image.');
      return;
    }

    if (!strippedContent) {
      alert('Please add blog content.');
      return;
    }

    setSubmitting(true);
    try {
      const blogsRef = collection(db, 'blogs');
      const latestQuery = query(blogsRef, orderBy('blog_id', 'desc'), limit(1));
      const snapshot = await getDocs(latestQuery);
      let nextBlogId = 1;
      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data().blog_id;
        const latestNumber = typeof latest === 'number' ? latest : parseInt(latest, 10) || 0;
        nextBlogId = latestNumber + 1;
      }

      const storageRef = ref(storage, `blogImages/${Date.now()}-${imageName || 'blog-image'}`);
      await uploadBytes(storageRef, imageFile, {
        contentType: imageFile.type
      });
      const imageUrl = await getDownloadURL(storageRef);

      // Format date as dd/mm/yy string
      const formattedDate = (() => {
        const value = new Date(date);
        const dd = String(value.getDate()).padStart(2, '0');
        const mm = String(value.getMonth() + 1).padStart(2, '0');
        const yy = String(value.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      })();

      await addDoc(blogsRef, {
        blog_id: nextBlogId,
        title: title.trim(),
        date_created: formattedDate,
        img: imageUrl,
        blog_content: strippedContent,
        blog_content_html: content,
        created_at: serverTimestamp()
      });

      alert('Blog created successfully!');
      resetForm();
      navigate('/blogs');
    } catch (err) {
      console.error('Failed to create blog:', err);
      alert('Failed to create blog. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="dashboard create-blogs">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Create Blogs</h1>
          <p className="dashboard-subtitle">Set up a new blog entry for the Er. Rishav Sethi platform.</p>
        </div>
        <button
          type="button"
          className="create-blogs__back"
          onClick={() => navigate('/blogs')}
        >
          Back to Blogs
        </button>
      </div>

      <form className="create-blogs__form" onSubmit={handleSubmit}>
        <div className="create-blogs__row">
          <div className="create-blogs__field">
            <label className="create-blogs__label" htmlFor="blogTitle">Blog Title</label>
            <input
              id="blogTitle"
              type="text"
              className="create-blogs__input"
              placeholder="Enter blog title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="create-blogs__field create-blogs__field--date">
            <label className="create-blogs__label" htmlFor="blogDate">Date</label>
            <input
              id="blogDate"
              type="date"
              className="create-blogs__input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>

        <div className="create-blogs__field">
          <label className="create-blogs__label" htmlFor="blogImage">Blog Image</label>
          <input
            id="blogImage"
            type="file"
            accept="image/*"
            className="create-blogs__file-input"
            onChange={handleImageChange}
          />
          {imageName ? (
            <span className="create-blogs__file-name">Selected file: {imageName}</span>
          ) : (
            <span className="create-blogs__file-hint">Only image formats (PNG, JPG, WEBP, etc.) are allowed.</span>
          )}
          {imagePreview && (
            <div className="create-blogs__preview">
              <img src={imagePreview} alt="Blog" />
              <button type="button" className="create-blogs__remove-preview" onClick={handleRemoveImage}>
                ×
              </button>
            </div>
          )}
        </div>

        <div className="create-blogs__field">
          <label className="create-blogs__label">Blog Content</label>
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
              placeholder: 'Write your article content here... Use the toolbar above to format your text.',
              branding: false,
              promotion: false,
              resize: true,
              statusbar: false,
              block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote',
              setup: (editor) => {
                editor.on('init', () => {
                  if (!content) {
                    editor.setContent('');
                  }
                });
              }
            }}
          />
        </div>

        <div className="create-blogs__actions">
          <button type="submit" className="create-blogs__submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Blog'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateBlogs;
