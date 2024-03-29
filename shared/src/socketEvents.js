/**
 * Events which are sent / received over Socket.io.
 *
 * @see syncEvents.js for events emit over WebRTC data channel.
 */

/**
 * Emits from the FE to the BE with service authorization.
 *
 * @type {Object} // TODO: Document structure
 */
export const SOCKET_EVT_CLIENT_AUTHORIZATION_GRANTED =
  "client-authorization-granted";

/**
 * Can emit from any where to anywhere.
 *
 * Passed to / from IPCMessage instances.
 *
 * @type {any}
 */
export const SOCKET_EVT_IPC_MESSAGE = "ipc-message";

/**
 * Emit from BE to FE when a network has been created, updated, or deleted.
 *
 * At this time, it doesn't currently carry any event information with it.
 *
 * @type {void}
 */
export const SOCKET_EVT_NETWORKS_UPDATED = "networks-updated";
