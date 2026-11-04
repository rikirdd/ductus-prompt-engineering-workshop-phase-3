import { useState, type FormEvent } from "react";
import { MAX_CAPTION_LENGTH, MAX_IMAGE_BYTES, postMeme, type Meme } from "./api";

export function PostMemeView({ onSwipeInstead }: { onSwipeInstead: () => void }) {
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<Meme | null>(null);
  // Changing the key clears the file input, which React does not control.
  const [formKey, setFormKey] = useState(0);

  function chooseImage(file: File | null) {
    setPosted(null);
    if (file && file.size > MAX_IMAGE_BYTES) {
      setImage(null);
      setError(`The image is too large. The limit is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    setError(null);
    setImage(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!image || !caption.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      setPosted(await postMeme(caption, image));
      setCaption("");
      setImage(null);
      setFormKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="post-view">
      <h2>Post your own meme</h2>
      <form key={formKey} onSubmit={submit}>
        <label>
          Image (PNG or JPEG)
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Caption
          <input
            type="text"
            value={caption}
            maxLength={MAX_CAPTION_LENGTH}
            onChange={(event) => {
              setCaption(event.target.value);
              setPosted(null);
            }}
          />
        </label>
        <button type="submit" disabled={!image || !caption.trim() || posting}>
          {posting ? "Posting…" : "Post meme"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {posted && (
        <div role="status" className="post-success">
          <p>Posted! Everyone will see it in their pile.</p>
          <figure className="meme-card">
            <img src={posted.imageUrl} alt={posted.caption} />
            <figcaption>{posted.caption}</figcaption>
          </figure>
          <button type="button" onClick={onSwipeInstead}>
            Back to swiping
          </button>
        </div>
      )}
    </section>
  );
}
