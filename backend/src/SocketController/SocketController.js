import NetworkController, {
  EVT_NETWORK_CREATED,
  EVT_NETWORK_DESTROYED,
  EVT_NETWORK_UPDATED,
} from "@src/NetworkController";
import BackendIPCMessageBroker, {
  TYPE_WEB_IPC_MESSAGE,
} from "@src/BackendIPCMessageBroker";
import initSocketAPI from "@src/socketAPI";
import {
  SOCKET_EVT_CLIENT_AUTHORIZATION_GRANTED,
  SOCKET_EVT_NETWORKS_UPDATED,
} from "@shared/socketEvents";
import { receiveHandshakeAuthentication } from "@shared/adapters/serviceAuthorization/server";

// Property which rides on top of socket object (ONLY AVAILABLE ON THIS THREAD)
const KEY_CLIENT_DEVICE_ADDRESS = "__clientDeviceAddress";

/**
 * Handles Socket.io connectivity and signal routing.
 */
export default class SocketController {
  static initWithSocketIo(io) {
    // Service authorization middleware
    io.use((socket, next) => {
      try {
        const {
          clientAuthorization,
          clientDeviceAddress,
        } = receiveHandshakeAuthentication(socket.handshake.auth);

        socket.emit(
          SOCKET_EVT_CLIENT_AUTHORIZATION_GRANTED,
          clientAuthorization
        );

        socket[KEY_CLIENT_DEVICE_ADDRESS] = clientDeviceAddress;

        next();
      } catch (err) {
        // TODO: Handle different error types here

        console.warn("Caught authentication error", err);

        // TODO: Use string constant here
        next(new Error("Authentication error"));
      }
    });

    io.on("connect", async (socket) => {
      try {
        const networkController = new NetworkController();

        // Preliminary network sync
        //
        // TODO: Only emit to interested listeners
        (() => {
          const _handleNetworksUpdated = () => {
            // Broadcast
            io.emit(SOCKET_EVT_NETWORKS_UPDATED);
          };

          networkController.on(EVT_NETWORK_CREATED, _handleNetworksUpdated);
          networkController.on(EVT_NETWORK_UPDATED, _handleNetworksUpdated);
          networkController.on(EVT_NETWORK_DESTROYED, _handleNetworksUpdated);

          socket.on("disconnect", () => {
            networkController.off(EVT_NETWORK_CREATED, _handleNetworksUpdated);
            networkController.off(EVT_NETWORK_UPDATED, _handleNetworksUpdated);
            networkController.off(
              EVT_NETWORK_DESTROYED,
              _handleNetworksUpdated
            );

            console.log(`Socket.io client disconnected with id ${socket.id}`);
          });
        })();

        // IPC message broker
        //
        // Mainly used for routing WebRTC signals to peers
        (() => {
          const ipcMessageBroker = new BackendIPCMessageBroker({
            io,
            socketIoIdFrom: socket.id,
          });

          socket.on("disconnect", () => {
            ipcMessageBroker.destroy();
          });

          socket.on(
            TYPE_WEB_IPC_MESSAGE,
            ({ realmId, channelId, serviceEntityTo, ...rest }) => {
              ipcMessageBroker.sendMessage({
                realmId,
                channelId,
                senderDeviceAddress: socket[KEY_CLIENT_DEVICE_ADDRESS],
                ...rest,
              });
            }
          );
        })();

        // Initialize SocketAPI for all connected clients
        initSocketAPI(io, socket);
      } catch (err) {
        console.error(err);

        socket.disconnect();
      }
    });
  }

  /**
   * Consideration: Surely this isn't very memory efficient?
   *
   * @param {string} socketIoId
   * @param {Object} io // TODO: Document
   */
  static getSocketWithId(socketIoId, io) {
    return io.sockets.clients().connected[socketIoId];
  }

  /**
   * @param {Object} socket
   * @return {string}
   */
  static getSocketDeviceAddress(socket) {
    return socket[KEY_CLIENT_DEVICE_ADDRESS];
  }
}
