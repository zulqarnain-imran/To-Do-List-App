"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Shell";
import { useStore } from "@/components/store";
import { apiFetch } from "@/lib/client";

/**
 * Downscales an image to a small square data URL.
 *
 * Serverless functions have no writable disk and no object store is in play, so
 * the avatar is stored inline in the user document. Resizing in the browser
 * first is what keeps that document small: a phone photo is often several
 * megabytes, which would be rejected long before it was a problem for Atlas.
 */
async function toSquareDataUrl(file: File, size = 192): Promise<string> {
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process that image");

  // Centre-crop to a square before scaling, so faces are not stretched.
  const side = Math.min(bitmap.width, bitmap.height);
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ProfileView() {
  const { state, updateProfile } = useStore();
  const [name, setName] = useState(state.user.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    if (trimmed === state.user.name) return;

    setSavingName(true);
    setNameError(null);
    try {
      await updateProfile({ name: trimmed });
    } catch (cause) {
      setNameError(cause instanceof Error ? cause.message : "Could not save");
    } finally {
      setSavingName(false);
    }
  }

  async function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError("That image is too large. Pick one under 8 MB.");
      return;
    }

    setAvatarError(null);
    try {
      const dataUrl = await toSquareDataUrl(file);
      await updateProfile({ avatar: dataUrl });
    } catch (cause) {
      setAvatarError(cause instanceof Error ? cause.message : "Could not use that image");
    } finally {
      // Allow re-picking the same file.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ tone: "error", text: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ tone: "error", text: "New passwords do not match" });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMessage({ tone: "error", text: "New password must be different" });
      return;
    }

    setPasswordBusy(true);
    try {
      const result = await apiFetch<{ ok: boolean; otherSessionsRevoked: number }>(
        "/api/profile",
        { method: "POST", json: { currentPassword, newPassword } },
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        tone: "success",
        text:
          result.otherSessionsRevoked > 0
            ? `Password changed. Signed out of ${result.otherSessionsRevoked} other device${
                result.otherSessionsRevoked === 1 ? "" : "s"
              }.`
            : "Password changed.",
      });
    } catch (cause) {
      setPasswordMessage({
        tone: "error",
        text: cause instanceof Error ? cause.message : "Could not change your password",
      });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Profile</h1>
        <p className="mt-0.5 text-sm text-muted">
          How you appear in the app, and how you sign in.
        </p>
      </div>

      <section className="card p-5">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <Avatar name={state.user.name} avatar={state.user.avatar} size={80} />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold">{state.user.name}</p>
            <p className="text-sm text-muted">{state.user.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn btn-ghost"
              >
                <Icon name="user" size={16} />
                {state.user.avatar ? "Change photo" : "Upload photo"}
              </button>
              {state.user.avatar && (
                <button
                  type="button"
                  onClick={() => void updateProfile({ avatar: null })}
                  className="btn btn-quiet"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={pickAvatar}
            />
            {avatarError && (
              <p role="alert" className="mt-2 text-sm font-medium text-danger">
                {avatarError}
              </p>
            )}
            <p className="mt-2 text-xs text-faint">
              Cropped to a square and stored with your account.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
          Display name
        </h2>
        <form onSubmit={saveName} className="card p-4">
          <label htmlFor="profile-name" className="sr-only">
            Display name
          </label>
          <input
            id="profile-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
          />
          {nameError && (
            <p role="alert" className="mt-2 text-sm font-medium text-danger">
              {nameError}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={savingName || !name.trim() || name.trim() === state.user.name}
              className="btn btn-primary"
            >
              {savingName ? "Saving…" : "Save name"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
          Password
        </h2>
        <form onSubmit={changePassword} className="card space-y-4 p-4">
          <div>
            <label htmlFor="current-password" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              className="field"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                className="field"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                Confirm
              </label>
              <input
                id="confirm-password"
                type="password"
                className="field"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
          </div>

          {passwordMessage && (
            <p
              role="status"
              className={`flex items-center gap-2 text-sm font-medium ${
                passwordMessage.tone === "error" ? "text-danger" : "text-success"
              }`}
            >
              <Icon
                name={passwordMessage.tone === "error" ? "warning" : "circle-check"}
                size={16}
              />
              {passwordMessage.text}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Changing your password signs out every other device.
            </p>
            <button
              type="submit"
              disabled={passwordBusy || !currentPassword || !newPassword}
              className="btn btn-primary shrink-0"
            >
              {passwordBusy ? "Updating…" : "Change password"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
          Account
        </h2>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-4 text-sm">
            <span className="text-muted">Email</span>
            <span className="font-medium">{state.user.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4 p-4 text-sm">
            <span className="text-muted">Tasks stored</span>
            <span className="font-medium">
              {state.tasks.length} in this account
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
