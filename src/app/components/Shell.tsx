import { useEffect, useState } from "react";
import { Icon } from "../../icons";
import type { ProgressState, SightWordsContent, User } from "../../types";

export { VoiceMenu } from "./VoiceMenu";

export function Brand({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div className="brand">
      <div className="badge" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false">
          <circle cx="32" cy="32" r="30" />
          <path d="m32 11 5.9 12 13.2 1.9-9.6 9.3 2.3 13.1L32 41.1 20.2 47.3l2.3-13.1-9.6-9.3 13.2-1.9L32 11Z" />
        </svg>
      </div>
      <div>
        <p>{subtitle}</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
export function AuthPanel({
  user,
  message,
  onAuthenticate,
  onUpdateEmail,
  onLogout,
  onResetProgress,
}: {
  user: User | null;
  message: string;
  onAuthenticate: (mode: "login" | "signup", username: string, password: string) => void;
  onUpdateEmail: (email: string) => void;
  onLogout: () => void;
  onResetProgress: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [settingsEmail, setSettingsEmail] = useState(user?.email || "");

  useEffect(() => {
    setSettingsEmail(user?.email || "");
  }, [user?.email]);

  if (user) {
    return (
      <section className="auth-panel" aria-label="Account">
        <div className="auth-user">
          <Icon name="user" />
          <span>{user.username}</span>
          <button className="auth-button secondary" type="button" onClick={onLogout}>Log out</button>
        </div>
        <form
          className="account-settings"
          onSubmit={(event) => {
            event.preventDefault();
            onUpdateEmail(settingsEmail);
          }}
        >
          <label className="sr-only" htmlFor="accountEmail">Email</label>
          <input
            id="accountEmail"
            type="email"
            autoComplete="email"
            placeholder="Email (optional)"
            value={settingsEmail}
            onChange={(event) => setSettingsEmail(event.currentTarget.value)}
          />
          <button className="auth-button" type="submit">Save</button>
        </form>
        <details className="parent-controls">
          <summary>Parent controls</summary>
          <button
            className="auth-button danger-account-button"
            type="button"
            onClick={onResetProgress}
          >
            <Icon name="trash" />
            <span>Reset all progress</span>
          </button>
        </details>
        <p className="auth-message" role="status" aria-live="polite">{message}</p>
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="Account">
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          onAuthenticate("login", username, password);
          setPassword("");
        }}
      >
        <input
          type="text"
          autoComplete="username"
          inputMode="text"
          placeholder="Username"
          aria-label="Username"
          value={username}
          onChange={(event) => setUsername(event.currentTarget.value)}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <button className="auth-button" type="submit">Log in</button>
        <button
          className="auth-button secondary"
          type="button"
          onClick={() => {
            onAuthenticate("signup", username, password);
            setPassword("");
          }}
        >
          Sign up
        </button>
      </form>
      <p className="auth-message" role="status" aria-live="polite">{message}</p>
    </section>
  );
}

export function StageTabs({
  content,
  progress,
  onSelect,
}: {
  content: SightWordsContent;
  progress: ProgressState;
  onSelect: (stageId: number) => void;
}) {
  return (
    <nav className="stage-tabs" aria-label="Stages">
      {content.stages.map((stage) => {
        const stageState = progress.stages[String(stage.id)];
        const isUnlocked = progress.unlockedStageIds.includes(stage.id);

        return (
          <button
            key={stage.id}
            type="button"
            className={`stage-tab${progress.activeStageId === stage.id ? " is-active" : ""}`}
            disabled={!isUnlocked}
            onClick={() => onSelect(stage.id)}
          >
            <strong>{stage.title}</strong>
            <span>{stage.subtitle} - {stageState.knownWords.length}/{stage.words.length}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function ScoreStrip({ known, practice, left, total }: {
  known: number;
  practice: number;
  left: number;
  total: number;
}) {
  return (
    <div className="score-strip" aria-label="Progress summary">
      <div className="metric"><strong>{known}</strong><span>Known</span></div>
      <div className="metric"><strong>{practice}</strong><span>Practice</span></div>
      <div className="metric"><strong>{left}</strong><span>Left</span></div>
      <div className="metric"><strong>{total}</strong><span>Total</span></div>
    </div>
  );
}
