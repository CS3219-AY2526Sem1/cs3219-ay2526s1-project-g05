import { apiFetch } from "./api";

export const CODE_EXECUTION_API_URL = import.meta.env.MODE === "production" ? "/run" : "http://localhost:4005";

export async function executeCode(code) {
    return apiFetch(`${CODE_EXECUTION_API_URL}/run`, {
        method: "POST",
        body: JSON.stringify(code),
    });
};
