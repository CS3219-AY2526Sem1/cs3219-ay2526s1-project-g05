const LOCK_TYPES = ["insert", "delete", "replace", "cursor", "selection"];

export class CollaborationSessionValidator {
  static normalizeString(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  static validateCreateSession(payload = {}) {
    const errors = [];
    const normalized = {};

    const participants = Array.isArray(payload.participants);
    if (!participants) {
      errors.push({
        field: "participants",
        message: "participants is required.",
      });
    }
    normalized.participants = payload.participants;

    const questionId = payload.questionId;
    if (!questionId) {
      errors.push({ field: "questionId", message: "questionId is required." });
    }
    normalized.questionId = questionId;

    const language = this.normalizeString(payload.language) ?? "javascript";
    normalized.language = language;

    return { errors, normalized };
  }

  static validateJoinSession(payload = {}) {
    const errors = [];
    const normalized = {};

    const sessionId = this.normalizeString(payload.sessionId);

    if (!sessionId) {
      errors.push({ field: "sessionId", message: "sessionId is required." });
    }
    normalized.sessionId = sessionId;

    return { errors, normalized };
  }

  static validateOperation(payload = {}) {
    const errors = [];
    const normalized = {};

    const version = Number(payload.version);
    if (!Number.isInteger(version) || version < 0) {
      errors.push({
        field: "version",
        message: "version must be a non-negative integer.",
      });
    } else {
      normalized.version = version;
    }

    const type = this.normalizeString(payload.type);
    if (!type || !LOCK_TYPES.includes(type)) {
      errors.push({
        field: "type",
        message:
          "type must be one of insert, delete, replace, cursor, selection.",
      });
    } else {
      normalized.type = type;
    }

    if (payload.range != null) {
      const range = this.validateRange(payload.range, errors);
      if (range) {
        normalized.range = range;
      }
    }

    if (payload.cursor != null) {
      const cursor = this.validateCursor(payload.cursor, errors);
      if (cursor) {
        normalized.cursor = cursor;
      }
    }

    const content =
      typeof payload.content === "string" ? payload.content : null;
    if (
      content == null &&
      ["insert", "delete", "replace"].includes(normalized.type)
    ) {
      errors.push({
        field: "content",
        message: "content must be provided for text-changing operations.",
      });
    } else if (content != null) {
      normalized.content = content;
    }

    return { errors, normalized };
  }

  static validateRange(range, errors) {
    const start = Number(range?.start);
    const end = Number(range?.end);

    if (!Number.isInteger(start) || start < 0) {
      errors.push({
        field: "range.start",
        message: "range.start must be a non-negative integer.",
      });
      return null;
    }
    if (!Number.isInteger(end) || end < start) {
      errors.push({
        field: "range.end",
        message: "range.end must be an integer greater than or equal to start.",
      });
      return null;
    }

    return { start, end };
  }

  static validateCursor(cursor, errors) {
    const line = Number(cursor?.line);
    const column = Number(cursor?.column);
    if (!Number.isInteger(line) || line < 0) {
      errors.push({
        field: "cursor.line",
        message: "cursor.line must be a non-negative integer.",
      });
      return null;
    }
    if (!Number.isInteger(column) || column < 0) {
      errors.push({
        field: "cursor.column",
        message: "cursor.column must be a non-negative integer.",
      });
      return null;
    }
    return { line, column };
  }

  static validateLeaveSession(payload = {}) {
    const errors = [];
    const normalized = {};

    const sessionId = this.normalizeString(payload.sessionId);
    if (!sessionId) {
      errors.push({ field: "sessionId", message: "sessionId is required." });
    } else {
      normalized.sessionId = sessionId;
    }

    const reason = this.normalizeString(payload.reason);
    if (reason) {
      normalized.reason = reason;
    }

    const terminateForAll = Boolean(payload.terminateForAll);
    if (payload.terminateForAll != null) {
      normalized.terminateForAll = terminateForAll;
    }

    return { errors, normalized };
  }

  static validateQuestionProposal(payload = {}) {
    const errors = [];
    const normalized = {};

    const questionId = this.normalizeString(payload.questionId);
    if (!questionId) {
      errors.push({ field: "questionId", message: "questionId is required." });
    } else {
      normalized.questionId = questionId;
    }

    const rationale = this.normalizeString(payload.rationale);
    if (rationale) {
      normalized.rationale = rationale;
    }

    return { errors, normalized };
  }

  static validateQuestionResponse(payload = {}) {
    const errors = [];
    const normalized = {};

    if (typeof payload.accept !== "boolean") {
      errors.push({ field: "accept", message: "accept must be a boolean." });
    } else {
      normalized.accept = payload.accept;
    }

    return { errors, normalized };
  }

  static validateEndSessionRequest(payload = {}) {
    const errors = [];
    const normalized = {};

    if (typeof payload.confirm !== "boolean") {
      errors.push({ field: "confirm", message: "confirm must be a boolean." });
    } else {
      normalized.confirm = payload.confirm;
    }

    return { errors, normalized };
  }
}

export { LOCK_TYPES };
