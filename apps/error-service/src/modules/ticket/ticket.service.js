/**
 * Ticket Module Service Aggregator
 * Re-exports modularized sub-services:
 * - ticket-format.service.js: Formatting, duration, status capitalization, sequential ID generation
 * - ticket-permission.service.js: Permission checking for ticket updates (division & status rules)
 * - ticket-core.service.js: Core CRUD (getTickets, getTicketById, createTicket, updateTicket, addComment)
 * - ticket-history.service.js: Ticket history listing and detail by version
 * - ticket-assignee.service.js: Team management (claim, add, edit, change leader, remove assignee)
 */

export * from "./services/ticket-format.service.js";
export * from "../ticket-management/ticket-permission.service.js";
export * from "./services/ticket-core.service.js";
export * from "./services/ticket-history.service.js";
export * from "./services/ticket-assignee.service.js";
