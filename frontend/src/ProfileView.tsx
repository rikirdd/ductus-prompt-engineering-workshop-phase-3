import { useEffect, useState, type FormEvent } from "react";
import { fetchProfile, login, saveProfile } from "./api";
import { setUserId } from "./identity";

interface ProfileViewProps {
  /** Called after signing in, because the device now belongs to another user and its data must be reloaded. */
  onSignedIn: () => void;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

export function ProfileView({ onSignedIn }: ProfileViewProps) {
  const [nickname, setNickname] = useState("");
  const [emoji, setEmoji] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  async function loadProfile() {
    setError(null);
    try {
      const profile = await fetchProfile();
      setNickname(profile.nickname);
      setEmoji(profile.emoji);
      setLoaded(true);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const profile = await saveProfile({ nickname, emoji });
      setNickname(profile.nickname);
      setEmoji(profile.emoji);
      setSaved(true);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setLoginError(null);
    try {
      const { userId, profile } = await login(username);
      setUserId(userId);
      setNickname(profile.nickname);
      setEmoji(profile.emoji);
      setUsername("");
      setSaved(false);
      onSignedIn();
    } catch (err) {
      setLoginError(messageOf(err));
    }
  }

  return (
    <section className="profile-view">
      <h2>Your profile</h2>
      {loaded && (
        <p className="profile-summary">
          <span aria-hidden="true">{emoji}</span> {nickname}
        </p>
      )}
      <form onSubmit={save}>
        <label>
          Nickname
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} />
        </label>
        <label>
          Emoji
          <input value={emoji} onChange={(event) => setEmoji(event.target.value)} />
        </label>
        <button type="submit" disabled={!loaded}>
          Save profile
        </button>
        {saved && <p role="status">Profile saved</p>}
        {error && <p role="alert">{error}</p>}
      </form>

      <h3>Already have a profile?</h3>
      <p>Sign in with your nickname to get your memes and likes on this device. There is no password.</p>
      <form onSubmit={signIn}>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={20} />
        </label>
        <button type="submit" disabled={!username.trim()}>
          Sign in
        </button>
        {loginError && <p role="alert">{loginError}</p>}
      </form>
    </section>
  );
}
