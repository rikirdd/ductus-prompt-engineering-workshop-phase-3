import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { ProfileView } from "../src/ProfileView";

const profile = { nickname: "Meme Fan 1234", emoji: "🐸" };
const ok = (body: unknown) => ({ ok: true, json: async () => body });
const failed = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("ProfileView", () => {
  it("shows the profile and saves a new nickname and emoji", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ profile }))
      .mockResolvedValueOnce(ok({ profile: { nickname: "Sara", emoji: "🦄" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProfileView onSignedIn={() => {}} />);
    const nickname = await screen.findByLabelText("Nickname");
    expect(nickname).toHaveValue("Meme Fan 1234");
    expect(screen.getByLabelText("Emoji")).toHaveValue("🐸");

    fireEvent.change(nickname, { target: { value: "Sara" } });
    fireEvent.change(screen.getByLabelText("Emoji"), { target: { value: "🦄" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Profile saved");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/profile");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ nickname: "Sara", emoji: "🦄" });
    expect(init.headers["X-User-Id"]).toEqual(expect.any(String));
  });

  it("shows the error from the API when the nickname is taken", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(ok({ profile }))
        .mockResolvedValueOnce(failed(409, 'The nickname "Sara" is already taken')),
    );
    render(<ProfileView onSignedIn={() => {}} />);
    fireEvent.change(await screen.findByLabelText("Nickname"), { target: { value: "Sara" } });

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent('The nickname "Sara" is already taken');
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("signs in with a username, switches this device to that user and tells the app", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ profile }))
      .mockResolvedValueOnce(ok({ userId: "laptop-id", profile: { nickname: "Sara", emoji: "🦄" } }));
    vi.stubGlobal("fetch", fetchMock);
    const onSignedIn = vi.fn();
    render(<ProfileView onSignedIn={onSignedIn} />);
    await screen.findByLabelText("Nickname");

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "sara" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/login");
    expect(JSON.parse(init.body)).toEqual({ nickname: "sara" });
    expect(localStorage.getItem("meme-tinder-user-id")).toBe("laptop-id");
    expect(screen.getByLabelText("Nickname")).toHaveValue("Sara");
  });

  it("shows the error and keeps the user when the username is unknown", async () => {
    localStorage.setItem("meme-tinder-user-id", "this-device");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(ok({ profile }))
        .mockResolvedValueOnce(failed(404, 'No profile with the nickname "nobody"')),
    );
    const onSignedIn = vi.fn();
    render(<ProfileView onSignedIn={onSignedIn} />);
    await screen.findByLabelText("Nickname");

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "nobody" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent('No profile with the nickname "nobody"');
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(localStorage.getItem("meme-tinder-user-id")).toBe("this-device");
  });
});

describe("Profile tab in the app", () => {
  const meme = { id: "m1", caption: "It works on my machine", imageUrl: "/api/memes/images/m1.svg" };

  it("opens the profile view, and after signing in loads the memes of the signed-in user", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ meme }))
      .mockResolvedValueOnce(ok({ profile }))
      .mockResolvedValueOnce(ok({ userId: "laptop-id", profile: { nickname: "Sara", emoji: "🦄" } }))
      .mockResolvedValueOnce(ok({ meme: null }));
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    await screen.findByRole("img", { name: meme.caption });

    fireEvent.click(screen.getByRole("button", { name: "Profile" }));
    await screen.findByLabelText("Nickname");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "Sara" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][0]).toBe("/api/memes/next");
    expect(fetchMock.mock.calls[3][1].headers["X-User-Id"]).toBe("laptop-id");
  });
});
