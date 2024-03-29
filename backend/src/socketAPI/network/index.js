import NetworkController, {
  SERVER_TYPE_EXTERNAL,
} from "@src/NetworkController";

const KEY_SOCKET_NETWORK = "__network";

export async function initTranscoderSession(args, { socket }) {
  const networkController = NetworkController.getInstance();

  // TODO: Remove
  console.log({
    args,
  });

  const {
    networkName: name,
    realmId,
    channelId,
    isPublic,
    networkDescription: description,
    deviceAddress: transcoderDeviceAddress,
    userAgent: transcoderUserAgent,
    coreCount: transcoderCoreCount,
    buildHash: transcoderBuildHash,
    maxParticipants,
    maxConcurrentAudioStreams,
    maxConcurrentVideoStreams,
    maxVideoResolution,
  } = args;

  // TODO: try / catch and pipe error to client if not able to establish
  const network = await networkController.createNetwork({
    name,
    realmId,
    channelId,
    isPublic,
    description,
    transcoderType: SERVER_TYPE_EXTERNAL,
    transcoderSocketId: socket.id,
    transcoderDeviceAddress,
    transcoderUserAgent,
    transcoderCoreCount,
    transcoderBuildHash,
    maxParticipants,
    maxConcurrentAudioStreams,
    maxConcurrentVideoStreams,
    maxVideoResolution,
  });

  // Used for endTranscoderSession
  //
  // IMPORTANT: This is only available to the same thead; Do not try to use for
  // other purposes
  socket[KEY_SOCKET_NETWORK] = network;

  // Deregister network if socket has already disconnected
  if (!socket.connected) {
    endTranscoderSession(args, { socket });
  } else {
    socket.on("disconnect", () => {
      endTranscoderSession(args, { socket });
    });
  }
}

export async function endTranscoderSession({}, { socket }) {
  if (socket[KEY_SOCKET_NETWORK]) {
    const networkController = NetworkController.getInstance();

    networkController.deactivateNetwork(socket[KEY_SOCKET_NETWORK]);
  }
}

/**
 * Records the number of participants for the given network into the database.
 *
 * @param {number} connectedParticipants
 * @param {Object} socketAPIContext
 * @return {Promise<void>}
 */
export async function setConnectedParticipants(
  connectedParticipants,
  { socket }
) {
  const networkController = NetworkController.getInstance();
  const network = socket[KEY_SOCKET_NETWORK];

  if (network) {
    try {
      await networkController.setConnectedParticipants(
        network,
        connectedParticipants
      );
    } catch (err) {
      console.warn("Caught", err);
    }
  } else {
    console.warn(
      `Network is not available to set connected participants for socket ${socket.id}`
    );
  }
}

/**
 * @return {Promise<Object[]>} // TODO: Document
 */
export async function fetchNetworks({ realmId, channelId, isPublic = true }) {
  const networkController = NetworkController.getInstance();

  // TODO: Refactor
  const query = (() => {
    const query = {};
    if (realmId) {
      query.realmId = realmId;
    }
    if (channelId) {
      query.channelId = channelId;
    }
    query.isPublic = isPublic;

    return query;
  })();

  const networks = await networkController.fetchNetworks(query);

  return networks;
}

/**
 * @param {NetworkDBObjectQuery}
 * @param {Object} socketAPIContext
 * @return {Promise<boolean>}
 */
export async function fetchIsNetworkOnline({ realmId, channelId }) {
  // { io, socket }
  const networkController = NetworkController.getInstance();

  const hostSocketId = await networkController.fetchTranscoderSocketId({
    realmId,
    channelId,
  });

  // TODO: Remove
  console.log("fetchIsNetworkOnline", hostSocketId);

  // TODO: Return false if socket id is not connected

  return Boolean(hostSocketId);
}

export async function setBackgroundImage({ backgroundImage }, { socket }) {
  const network = socket[KEY_SOCKET_NETWORK];

  const networkController = NetworkController.getInstance();

  await networkController.setBackgroundImage(network, backgroundImage);
}
