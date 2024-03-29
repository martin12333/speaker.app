import IPCMessageBroker, {
  WEB_SERVICE_ENTITY,
  CHROME_SERVICE_ENTITY,
  EVT_MESSAGE_RECEIVED,
} from "../shared/IPCMessageBroker";
import ChromeZenRTCPeer from "../ChromeZenRTCPeer";

export { EVT_MESSAGE_RECEIVED };

let _instance = null;

/**
 * IMPORTANT: This should be treated as a singleton.
 *
 * Note: (jh) I didn't implement a required singleton pattern at the moment,
 * but it should be considered as one.
 */
export default class ChromeIPCMessageBroker extends IPCMessageBroker {
  /**
   * @return {ChromeIPCMessageBroker}
   */
  getInstance() {
    return _instance;
  }

  /**
   * @param {string} realmId
   * @param {string} channelId
   */
  constructor({ realmId, channelId }) {
    // Prevent more than one instance here
    if (_instance) {
      throw new Error(
        "ChromeIPCMessageBroker is already initiated for this thread"
      );
    }

    super({ realmId, channelId });

    _instance = this;
  }

  async sendMessage(message) {
    const {
      serviceEntityTo = WEB_SERVICE_ENTITY,
      serviceEntityFrom = CHROME_SERVICE_ENTITY,
      ...rest
    } = message;

    await window.__sendControllerMessage({
      serviceEntityTo,
      serviceEntityFrom,
      ...rest,
    });

    super.sendMessage(message);
  }

  async receiveMessage(message) {
    const { socketIoId /* type, signal, ...rest */ } = message;

    try {
      if (ChromeZenRTCPeer.getInstanceWithSocketIoId(socketIoId)) {
        // TODO: Remove
        /*
        console.log(
          `Found existing ChromeZenRTCPeer with socketIoId "${socketIoId}"`
        );
        */
      } else {
        new ChromeZenRTCPeer({
          ipcMessageBroker: this,
          socketIoId,
          realmId: this._realmId,
          channelId: this._channelId,
        });
      }

      super.receiveMessage(message);
    } catch (err) {
      // TODO: Route errors up to controller
      console.error(err.message);
    }
  }
}
