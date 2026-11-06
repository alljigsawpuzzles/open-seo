export class GoogleTokenError extends Error {
  constructor(
    public readonly reason:
      | "grant_missing"
      | "refresh_token_missing"
      | "invalid_grant"
      | "invalid_client"
      | "unauthorized_client"
      | "temporarily_unavailable"
      | "unknown_error",
    public readonly status = 0,
  ) {
    super("Google access token could not be obtained.");
    this.name = "GoogleTokenError";
  }

  get requiresReconnect(): boolean {
    return (
      this.reason === "grant_missing" ||
      this.reason === "refresh_token_missing" ||
      (this.reason === "invalid_grant" && this.status === 400)
    );
  }
}
