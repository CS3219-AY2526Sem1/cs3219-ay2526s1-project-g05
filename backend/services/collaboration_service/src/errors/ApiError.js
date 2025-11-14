export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (details !== null) {
      this.details = details;
    }
  }
}
