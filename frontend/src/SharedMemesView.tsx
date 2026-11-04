import { useEffect, useState } from "react";
import { fetchSharedMemes, type Meme } from "./api";

interface SharedMemesViewProps {
  nickname: string;
  onBack: () => void;
}

/** The memes you and another person both liked. */
export function SharedMemesView({ nickname, onBack }: SharedMemesViewProps) {
  const [memes, setMemes] = useState<Meme[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetchSharedMemes(nickname)
      .then((result) => current && setMemes(result))
      .catch((err) => current && setError(err instanceof Error ? err.message : "Unknown error"));
    return () => {
      current = false;
    };
  }, [nickname]);

  return (
    <section className="shared-memes-view">
      <button type="button" onClick={onBack}>
        Back to people
      </button>
      <h2>Memes you and {nickname} both loved</h2>
      {error && <p role="alert">Something went wrong: {error}</p>}
      {!error && !memes && <p>Loading…</p>}
      {memes && memes.length === 0 && <p>You have not both liked the same meme yet.</p>}
      {memes && memes.length > 0 && (
        <ul>
          {memes.map((meme) => (
            <li key={meme.id}>
              <figure className="meme-card">
                <img src={meme.imageUrl} alt={meme.caption} />
                <figcaption>{meme.caption}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
