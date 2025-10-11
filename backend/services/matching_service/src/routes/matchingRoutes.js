import { Router } from "express";

export const createMatchingRouter = (controller) => {
    const router = Router();

    router.post("/queue", controller.queue);
    router.get("/status/:sessionId", controller.getStatus);
    router.post("/cancel", controller.cancel);

    return router;
};
