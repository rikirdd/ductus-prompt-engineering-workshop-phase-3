import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { PeopleView } from "../src/PeopleView";

const sara = { nickname: "Sara", emoji: "🦄", demo: false, compatibility: 91, sharedSwipes: 11 };
const mei = { nickname: "Mei (demo)", emoji: "🐙", demo: true, compatibility: null, sharedSwipes: 0 };
const meme = { id: "m1", caption: "It works on my machine", imageUrl: "/api/memes/images/m1.svg" };

const ok = (body: unknown) => ({ ok: true, json: async () => body });

afterEach(() => vi.unstubAllGlobals());

describe("PeopleView", () => {
  it("lists people with their compatibility, in the order the backend sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ people: [sara, mei] })));

    render(<PeopleView />);

    const buttons = await screen.findAllByRole("button");
    expect(buttons[0]).toHaveTextContent("You and Sara are 91% compatible!");
    expect(buttons[1]).toHaveTextContent("No memes in common with Mei (demo) yet");
  });

  it("labels demo people and not real ones", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ people: [sara, mei] })));

    render(<PeopleView />);

    const [real, demo] = await screen.findAllByRole("button");
    expect(real).not.toHaveTextContent("demo person");
    expect(demo).toHaveTextContent("(demo person)");
  });

  it("sends the user id when it asks for people", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ people: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PeopleView />);

    expect(await screen.findByText("Nobody else is here yet.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/people");
    expect(fetchMock.mock.calls[0][1].headers["X-User-Id"]).toEqual(expect.any(String));
  });

  it("shows the memes you both loved when a person is tapped, and goes back", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ people: [sara] }))
      .mockResolvedValueOnce(ok({ memes: [meme] }))
      .mockResolvedValueOnce(ok({ people: [sara] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PeopleView />);

    fireEvent.click(await screen.findByRole("button", { name: /Sara/ }));

    expect(await screen.findByRole("img", { name: meme.caption })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Memes you and Sara both loved" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/people/Sara/shared-memes");

    fireEvent.click(screen.getByRole("button", { name: "Back to people" }));
    expect(await screen.findByRole("heading", { name: "People like you" })).toBeInTheDocument();
  });

  it("encodes the nickname in the request and shows an empty state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ people: [mei] }))
      .mockResolvedValueOnce(ok({ memes: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PeopleView />);

    fireEvent.click(await screen.findByRole("button", { name: /Mei/ }));

    expect(await screen.findByText("You have not both liked the same meme yet.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/people/Mei%20(demo)/shared-memes");
  });

  it("shows an error when people cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    render(<PeopleView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("shows an error when the shared memes cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(ok({ people: [sara] }))
        .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'No person with the nickname "Sara"' }) }),
    );
    render(<PeopleView />);

    fireEvent.click(await screen.findByRole("button", { name: /Sara/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent('No person with the nickname "Sara"');
  });
});

describe("People tab in the app", () => {
  it("opens the people list from the navigation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(ok({ meme })).mockResolvedValueOnce(ok({ people: [sara] })),
    );
    render(<App />);
    await screen.findByRole("img", { name: meme.caption });

    fireEvent.click(screen.getByRole("button", { name: "People" }));

    expect(await screen.findByText(/You and Sara are 91% compatible!/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "People" })).toHaveAttribute("aria-current", "page");
  });
});
