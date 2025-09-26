export const enforceHttps = (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    const forwardedProto = req.get("x-forwarded-proto");
    const isSecure = req.secure || forwardedProto === "https";
    if (!isSecure) {
      return res.status(400).json({ message: "HTTPS is required." });
    }
  }
  next();
};
