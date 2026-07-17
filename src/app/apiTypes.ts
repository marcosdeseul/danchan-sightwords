import type { ProgressState, User } from "../types";

export interface MeResponse {
  user: User | null;
}

export interface ProgressResponse {
  progress: ProgressState;
}

export interface AuthResponse {
  user: User;
  progress: ProgressState;
}
