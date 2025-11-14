import { Router } from "express";
import { authenticate } from "../../../../common_scripts/authentication_middleware.js";

export const createUserRouter = (controller) => {
  const router = Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.get("/me", [authenticate(true)], controller.getMe);
  router.patch("/me", [authenticate(true)], controller.updateMe);
  router.delete("/me", [authenticate(true)], controller.deleteMe);
  router.get("/:id", [authenticate(true, true)], controller.getById);
  router.patch("/:id", [authenticate(true, true)], controller.update);
  router.delete("/:id", [authenticate(true, true)], controller.delete);
  router.post(
    "/password-reset/request",
    [authenticate(true)],
    controller.requestPasswordReset,
  );
  router.post(
    "/password-reset/confirm",
    [authenticate(true)],
    controller.resetPassword,
  );
  router.post(
    "/add-current-code-runner",
    [authenticate(true)],
    controller.addCurrentCodeRunner,
  );
  router.post(
    "/add-past-collaboration-session",
    [authenticate(true)],
    controller.addPastCollaborationSession,
  );
  router.post(
    "/update-current-collaboration-session",
    [authenticate(true)],
    controller.updateCurrentCollaborationSession,
  );

  return router;
};
