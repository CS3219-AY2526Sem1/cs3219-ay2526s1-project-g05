import jwt from "jsonwebtoken";
import { MongoClientInstance } from "./mongo.js";
import { ObjectId } from "mongodb";
import proxyAddr from "proxy-addr";

/**
 *
 * @param {*} is_user_service Flip to true if this middleware is being used in the user service to avoid a circular call
 * @param {*} require_same_user Flip to true if you require the "id" in the token to match the "id" in the request params
 * @returns
 */
export const authenticate = (
  is_user_service = false,
  require_same_user = false,
) => {
  // Whitelist addresses from other services (to allow other services to call without needing user auth)

  /**
   * Authentication middleware for EXPRESS to verify JWT tokens in incoming requests.
   * @param {} req
   * @param {*} res
   * @param {*} next
   * @returns
   */
  let trust = null;
  if (process.env.NODE_ENV === "production")
    trust = proxyAddr.compile([
      "loopback",
      process.env.MAIN_SUBNET,
      process.env.INTERNAL_SUBNET,
    ]);

  return async (req, res, next) => {
    if (
      (process.env.NODE_ENV === "production" && trust
        ? trust(req.ip) // loopback means from same host (127.0.0.1)
        : req.socket.remoteAddress === "::1" ||
          req.socket.remoteAddress === "127.0.0.1") &&
      !req.get("sec-fetch-site") // for dev purpose: reject same localhost requests from browsers
    ) {
      return next();
    }

    let token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "Missing or invalid Authorization header." });
    }

    token = token.replace("Bearer ", "");

    const result = await verify_token_user(token, is_user_service);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    res.locals.user = result.user;

    if (require_same_user) {
      const param_id = req.params.id;
      if (!param_id || param_id !== result.user.id) {
        return res
          .status(403)
          .json({ error: "Forbidden: You can only access your own data." });
      }
    }

    next();
  };
};

const call_user_service = async (user_id) => {
  try {
    const response = await fetch(
      `http://${process.env.USERSERVICE_NAME}:${process.env.USERSERVICEPORT}/${user_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return { success: false, error: "User not found." };
    }

    const user_result = await response.json();
    return { success: true, user: user_result.user };
  } catch (_err) {
    return { success: false, error: "Fetch to user service failed." };
  }
};

const query_user_db = async (user_id) => {
  const usersCollection = MongoClientInstance.db.collection("users");
  const user = await usersCollection.findOne({ _id: new ObjectId(user_id) });
  if (!user) {
    return { success: false, error: "User not found." };
  }

  return { success: true, user: { ...user, id: user._id.toString() } };
};

export const verify_token_user = async (token, is_user_service = false) => {
  const decoded = verify_token(token);
  if (!decoded) {
    return { success: false, error: "Invalid or expired token." };
  }

  const user_result = await (is_user_service
    ? query_user_db(decoded.id)
    : call_user_service(decoded.id));

  if (!user_result.success) {
    return user_result;
  }

  return { success: true, user: user_result.user };
};

const SIGNER_ALGORITHM = "HS256";
const SIGNER_EXPIRES_IN = "24h";

export const sign_token = (payload) => {
  return jwt.sign(payload, process.env.AUTHENTICATION_SECRET, {
    algorithm: SIGNER_ALGORITHM,
    expiresIn: SIGNER_EXPIRES_IN,
  });
};

export const verify_token = (token) => {
  try {
    return jwt.verify(token, process.env.AUTHENTICATION_SECRET, {
      algorithms: [SIGNER_ALGORITHM],
    });
  } catch (_error) {
    return null;
  }
};
