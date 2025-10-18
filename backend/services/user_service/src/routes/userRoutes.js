import { Router } from "express";

export const createUserRouter = (controller) => {
  const router = Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.delete);
  router.post("/password-reset/request", controller.requestPasswordReset);
  router.post("/password-reset/confirm", controller.resetPassword);

  return router;
};
