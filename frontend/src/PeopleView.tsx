import { useEffect, useState } from "react";
import { fetchPeople, type Person } from "./api";
import { SharedMemesView } from "./SharedMemesView";

function compatibilityText(person: Person): string {
  return person.compatibility === null
    ? `No memes in common with ${person.nickname} yet`
    : `You and ${person.nickname} are ${person.compatibility}% compatible!`;
}

/** "People like you": everyone else, best match first. Tapping a person shows the memes you both loved. */
export function PeopleView() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetchPeople()
      .then((result) => current && setPeople(result))
      .catch((err) => current && setError(err instanceof Error ? err.message : "Unknown error"));
    return () => {
      current = false;
    };
  }, []);

  if (selected) return <SharedMemesView nickname={selected} onBack={() => setSelected(null)} />;

  return (
    <section className="people-view">
      <h2>People like you</h2>
      {error && <p role="alert">Something went wrong: {error}</p>}
      {!error && !people && <p>Loading…</p>}
      {people && people.length === 0 && <p>Nobody else is here yet.</p>}
      {people && people.length > 0 && (
        <ul>
          {people.map((person) => (
            <li key={person.nickname}>
              <button type="button" onClick={() => setSelected(person.nickname)}>
                <span aria-hidden="true">{person.emoji}</span> {compatibilityText(person)}
                {person.demo && <span className="demo-label"> (demo person)</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
