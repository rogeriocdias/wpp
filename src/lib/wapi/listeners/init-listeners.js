/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */

export function initNewMessagesListener() {
  const CIPHERTEXT_RETRY_DELAY = 500;
  const CIPHERTEXT_MAX_RETRIES = 20;

  window.WAPI._newMessagesListener = WPP.whatsapp.MsgStore.on(
    'add',
    (newMessage) => {
      if (
        newMessage &&
        newMessage.isNewMsg &&
        !newMessage.isSentByMe &&
        !newMessage.isStatusV3
      ) {
        let hasQueued = false;

        const deliverMessage = (message) => {
          if (!message || hasQueued) {
            return;
          }

          hasQueued = true;
          window.WAPI._newMessagesQueue.push(message);
          window.WAPI._newMessagesBuffer.push(message);

          // Starts debouncer time to don't call a callback for each message if more than one message arrives
          // in the same second
          if (
            !window.WAPI._newMessagesDebouncer &&
            window.WAPI._newMessagesQueue.length > 0
          ) {
            window.WAPI._newMessagesDebouncer = setTimeout(() => {
              let queuedMessages = window.WAPI._newMessagesQueue;

              window.WAPI._newMessagesDebouncer = null;
              window.WAPI._newMessagesQueue = [];

              let removeCallbacks = [];

              window.WAPI._newMessagesCallbacks.forEach(function (callbackObj) {
                if (callbackObj.callback !== undefined) {
                  callbackObj.callback(queuedMessages);
                }
                if (callbackObj.rmAfterUse === true) {
                  removeCallbacks.push(callbackObj);
                }
              });

              // Remove removable callbacks.
              removeCallbacks.forEach(function (rmCallbackObj) {
                let callbackIndex =
                  window.WAPI._newMessagesCallbacks.indexOf(rmCallbackObj);
                window.WAPI._newMessagesCallbacks.splice(callbackIndex, 1);
              });
            }, 1000);
          }
        };

        const queueFromStore = (attempt = 0) => {
          if (hasQueued) {
            return;
          }

          let serialized = window.WAPI.processMessageObj(
            newMessage,
            false,
            false
          );

          if (!serialized) {
            if (attempt < CIPHERTEXT_MAX_RETRIES) {
              setTimeout(
                () => queueFromStore(attempt + 1),
                CIPHERTEXT_RETRY_DELAY
              );
            }
            return;
          }

          if (
            serialized.type === 'ciphertext' &&
            attempt < CIPHERTEXT_MAX_RETRIES
          ) {
            setTimeout(
              () => queueFromStore(attempt + 1),
              CIPHERTEXT_RETRY_DELAY
            );
            return;
          }

          deliverMessage(serialized);
        };

        const scheduleInitialAttempt = (delay) => {
          setTimeout(() => queueFromStore(), delay);
        };

        if (
          newMessage.type === 'ciphertext' &&
          typeof newMessage.onCiphertextDecrypted === 'function'
        ) {
          try {
            let decryptedPromise = newMessage.onCiphertextDecrypted();
            if (
              decryptedPromise &&
              typeof decryptedPromise.then === 'function'
            ) {
              decryptedPromise
                .then(() => queueFromStore())
                .catch(() => queueFromStore());
            }
          } catch (error) {
            queueFromStore();
          }

          scheduleInitialAttempt(CIPHERTEXT_RETRY_DELAY);
        } else {
          scheduleInitialAttempt(newMessage.body ? 0 : 2000);
        }
      }
    }
  );

  window.WAPI._unloadInform = (event) => {
    // Save in the buffer the ungot unreaded messages
    window.WAPI._newMessagesBuffer.forEach((message) => {
      Object.keys(message).forEach((key) =>
        message[key] === undefined ? delete message[key] : ''
      );
    });
    sessionStorage.setItem(
      'saved_msgs',
      JSON.stringify(window.WAPI._newMessagesBuffer)
    );

    // Inform callbacks that the page will be reloaded.
    window.WAPI._newMessagesCallbacks.forEach(function (callbackObj) {
      if (callbackObj.callback !== undefined) {
        callbackObj.callback({
          status: -1,
          message: 'page will be reloaded, wait and register callback again.',
        });
      }
    });
  };
}
