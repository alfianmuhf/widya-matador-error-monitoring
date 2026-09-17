import EventEmitter from "events";

class UserEventEmitter extends EventEmitter {}

export const userEvents = new UserEventEmitter();
// Increase listener limit to support multiple concurrent SSE clients
userEvents.setMaxListeners(100);

export const USER_EVENTS = {
  CREATED: "user:created",
  UPDATED: "user:updated",
  DELETED: "user:deleted",
};
