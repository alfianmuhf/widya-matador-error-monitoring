import * as userService from "./user.service.js";
import { userEvents, USER_EVENTS } from "./user.events.js";

/**
 * Controller: Admin creates a new user
 */
export const createUser = async (req, res, next) => {
  try {
    const adminId = req.user?.id;
    const { user, initialPassword } = await userService.createUser(req.body, adminId);

    res.status(201).json({
      success: true,
      message: "Pengguna baru berhasil didaftarkan",
      data: {
        user,
        initialPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Stream users data via Server-Sent Events (SSE)
 */
export const streamUsers = async (req, res, next) => {
  try {
    // 1. Set SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // 2. Helper to write SSE events
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // 3. Confirm connection
    sendEvent("connected", {
      status: "connected",
      message: "SSE connection established for user monitoring",
      timestamp: new Date().toISOString(),
    });

    // 4. Send initial snapshot of users
    const initialData = await userService.getUsers(req.query);
    sendEvent("initial", initialData);
    sendEvent("message", { type: "initial", ...initialData });

    // 5. Setup listeners for real-time mutations
    const onUserCreated = async (payload) => {
      sendEvent(USER_EVENTS.CREATED, payload);
      const refreshed = await userService.getUsers(req.query);
      sendEvent("users:refresh", refreshed);
      sendEvent("message", { type: "created", ...payload, refreshed });
    };

    const onUserUpdated = async (payload) => {
      sendEvent(USER_EVENTS.UPDATED, payload);
      const refreshed = await userService.getUsers(req.query);
      sendEvent("users:refresh", refreshed);
      sendEvent("message", { type: "updated", ...payload, refreshed });
    };

    const onUserDeleted = async (payload) => {
      sendEvent(USER_EVENTS.DELETED, payload);
      const refreshed = await userService.getUsers(req.query);
      sendEvent("users:refresh", refreshed);
      sendEvent("message", { type: "deleted", ...payload, refreshed });
    };

    userEvents.on(USER_EVENTS.CREATED, onUserCreated);
    userEvents.on(USER_EVENTS.UPDATED, onUserUpdated);
    userEvents.on(USER_EVENTS.DELETED, onUserDeleted);

    // 6. Heartbeat every 15s to keep proxy connections alive
    const heartbeat = setInterval(() => {
      res.write(": keepalive\n\n");
    }, 15000);

    // 7. Cleanup on client disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      userEvents.off(USER_EVENTS.CREATED, onUserCreated);
      userEvents.off(USER_EVENTS.UPDATED, onUserUpdated);
      userEvents.off(USER_EVENTS.DELETED, onUserDeleted);
      res.end();
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get list of users with pagination and filtering
 * Auto-detects SSE if Accept header is text/event-stream or ?stream=true
 */
export const getUsers = async (req, res, next) => {
  try {
    if (
      req.headers.accept?.includes("text/event-stream") ||
      req.query.stream === "true"
    ) {
      return streamUsers(req, res, next);
    }

    const result = await userService.getUsers(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get single user detail by ID
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Admin updates user data
 */
export const updateUser = async (req, res, next) => {
  try {
    const adminId = req.user?.id;
    const user = await userService.updateUser(req.params.id, req.body, adminId);

    res.status(200).json({
      success: true,
      message: "Data pengguna berhasil diperbarui",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Admin deletes a user
 */
export const deleteUser = async (req, res, next) => {
  try {
    const adminId = req.user?.id;
    await userService.deleteUser(req.params.id, adminId);

    res.status(200).json({
      success: true,
      message: "Pengguna berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};

