import React, { useCallback, useEffect, useRef, useState } from "react";
import SyncObject, { EVT_UPDATED } from "@shared/SyncObject";
import UIMessage from "@local/UIMessage";

import useWebPhantomSessionContext from "@hooks/useWebPhantomSessionContext";
import useSocketContext from "@hooks/useSocketContext";

export const ChatMessagesContext = React.createContext();

export default function ChatMessagesProvider({ children }) {
  const {
    readOnlySyncObject,
    writableSyncObject,
    getParticipantWithDeviceAddress,
    isConnected,
  } = useWebPhantomSessionContext();

  const { deviceAddress } = useSocketContext();

  // TODO: Obtain from read-only state
  const [chatMessages, _setChatMessages] = useState([]);

  const [addedMessages, _setAddedMessages] = useState(0);

  // Handle detection of new messages from other users
  const refLastMessages = useRef([]);
  useEffect(() => {
    const lastMessages = refLastMessages.current;

    const addedMessages = [];

    // Handle added messages
    const diffCount = chatMessages.length - lastMessages.length;
    if (diffCount > 0) {
      for (
        let i = chatMessages.length - 1;
        i >= chatMessages.length - diffCount;
        i--
      ) {
        const chatMessage = chatMessages[i] || {};

        if (chatMessage.senderAddress !== deviceAddress) {
          addedMessages.push(chatMessage);
        }
      }
    }

    // Make most recent the beginning of the array
    addedMessages.reverse();

    _setAddedMessages(addedMessages);

    // Finally, set the last messages as current messages
    refLastMessages.current = chatMessages;
  }, [deviceAddress, chatMessages]);

  useEffect(() => {
    if (isConnected && readOnlySyncObject) {
      const _handleUpdate = (updatedState) => {
        updatedState = SyncObject.readDecorator(updatedState);

        if (updatedState.chatMessages) {
          _setChatMessages(
            readOnlySyncObject.getState().chatMessages.map((message) => ({
              ...message,
              sender: getParticipantWithDeviceAddress(message.senderAddress),
            }))
          );
        }
      };

      _handleUpdate(readOnlySyncObject.getState());

      readOnlySyncObject.on(EVT_UPDATED, _handleUpdate);

      return function unmount() {
        readOnlySyncObject.off(EVT_UPDATED, _handleUpdate);
      };
    } else {
      // Clear chat messages on disconnect
      _setChatMessages([]);
    }
  }, [isConnected, readOnlySyncObject, getParticipantWithDeviceAddress]);

  const sendMessage = useCallback(
    (body) => {
      if (!writableSyncObject) {
        throw new Error(
          "writableSyncObject is not available. Maybe you are not connected to a network."
        );
      }

      const uiMessage = new UIMessage({
        senderAddress: deviceAddress,
        body,
      });

      // Our own chat messages
      const chatMessages = writableSyncObject.getState().chatMessages || [];
      chatMessages.push(uiMessage.getState());

      writableSyncObject.setState({
        chatMessages,
      });
    },
    [writableSyncObject, deviceAddress]
  );

  return (
    <ChatMessagesContext.Provider
      value={{ chatMessages, addedMessages, sendMessage }}
    >
      {children}
    </ChatMessagesContext.Provider>
  );
}