import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { MAX_IMAGE_BYTES } from "../src/api";
import { PostMemeView } from "../src/PostMemeView";

afterEach(() => vi.unstubAllGlobals());

const posted = { id: "new1", caption: "My meme", imageUrl: "/api/memes/images/new1.png" };
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "meme.png", { type: "image/png" });
const created = () => ({ ok: true, status: 201, json: async () => ({ meme: posted }) });

function fillForm(file: File = png(), caption = "My meme") {
  fireEvent.change(screen.getByLabelText(/Image/), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText("Caption"), { target: { value: caption } });
}

describe("PostMemeView", () => {
  it("keeps the submit button disabled until there is an image and a caption", () => {
    render(<PostMemeView onSwipeInstead={() => {}} />);
    const button = screen.getByRole("button", { name: "Post meme" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Caption"), { target: { value: "Funny" } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Image/), { target: { files: [png()] } });
    expect(button).toBeEnabled();
  });

  it("posts the caption and the image as a data URL, then shows the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(created());
    vi.stubGlobal("fetch", fetchMock);
    render(<PostMemeView onSwipeInstead={() => {}} />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Post meme" }));

    expect(await screen.findByText(/Posted!/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "My meme" })).toHaveAttribute("src", posted.imageUrl);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/memes");
    expect(init.method).toBe("POST");
    expect(init.headers["X-User-Id"]).toEqual(expect.any(String));
    const body = JSON.parse(init.body);
    expect(body.caption).toBe("My meme");
    expect(body.image).toMatch(/^data:image\/png;base64,/);
    expect(screen.getByLabelText("Caption")).toHaveValue("");
  });

  it("shows the error message from the server and keeps the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "image must be a PNG or JPEG file" }) }),
    );
    render(<PostMemeView onSwipeInstead={() => {}} />);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Post meme" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("image must be a PNG or JPEG file");
    expect(screen.getByLabelText("Caption")).toHaveValue("My meme");
  });

  it("rejects an oversized image without calling the backend", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PostMemeView onSwipeInstead={() => {}} />);
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", { type: "image/png" });

    fillForm(big);

    expect(screen.getByRole("alert")).toHaveTextContent(/too large/);
    expect(screen.getByRole("button", { name: "Post meme" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers a way back to swiping after posting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(created()));
    const onSwipeInstead = vi.fn();
    render(<PostMemeView onSwipeInstead={onSwipeInstead} />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Post meme" }));

    fireEvent.click(await screen.findByRole("button", { name: "Back to swiping" }));

    expect(onSwipeInstead).toHaveBeenCalled();
  });
});

describe("App post tab", () => {
  it("opens the post form from the navigation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meme: null }) }));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Post your own meme" })).toBeInTheDocument());
  });
});
