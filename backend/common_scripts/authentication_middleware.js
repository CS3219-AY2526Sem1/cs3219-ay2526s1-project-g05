import jwt from "jsonwebtoken";
import { MongoClientInstance } from "./mongo.js";
import { ObjectId } from "mongodb";

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
  return async (req, res, next) => {
    if (
      (req.socket.remoteAddress === "::1" ||
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

    if (result.success === false) {
      return res.status(401).json({ error: result.error });
    }

    res.locals.user = result.decoded;

    if (require_same_user) {
      const param_id = req.params.id;
      if (!param_id || param_id !== result.decoded.id) {
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
      `http://localhost:${process.env.USERSERVICEPORT}/${user_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const user_result = await response.json();
    return user_result.user;
  } catch (error) {
    return null;
  }
};

const query_user_db = async (user_id) => {
  const usersCollection = MongoClientInstance.db.collection("users");
  const user = await usersCollection.findOne({ _id: new ObjectId(user_id) });
  return user;
};

export const verify_token_user = async (token, is_user_service = false) => {
  const decoded = verify_token(token);
  if (!decoded) {
    return { success: false, error: "Invalid or expired token." };
  }

  const user_result = await (is_user_service
    ? query_user_db(decoded.id)
    : call_user_service(decoded.id));

  if (!user_result) {
    return { success: false, error: "User not found." };
  }

  return { success: true, decoded };
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
  } catch (error) {
    return null;
  }
};
