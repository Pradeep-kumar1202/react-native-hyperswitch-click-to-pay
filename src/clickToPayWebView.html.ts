export const clickToPayWebViewHTML = `
<!doctype html>
<html>
  <head></head>
  <body>
    <iframe id="dcfLaunch"></iframe>
    <script>
      function sendMessage(type, data) {
        const message = {
          clickToPayResponse: {
            type: type,
            data: data,
            timestamp: Date.now(),
          },
        };

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } else {
          window.parent.postMessage(JSON.stringify(message));
        }
      }

      function addScript(data) {
        const src = data.sdkUrl;
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => sendMessage('LOAD_SUCCESS', src);
        script.onerror = () => sendMessage('LOAD_ERROR', src);
        document.head.appendChild(script);
      }

      const clickToPayServices = {
        visa: null,
        mastercard: null,
      };

      async function initializeSDK(data) {
        try {
          const initializeOptions = data.initializeOptions;

          if (data.isVISA) {
            clickToPayServices.visa = window.VSDK;
            const result = await clickToPayServices.visa.initialize(initializeOptions);
            sendMessage('INIT_SUCCESS', result);
          } else {
            clickToPayServices.mastercard = new window.MastercardCheckoutServices();
            const result = await clickToPayServices.mastercard.init(initializeOptions);
            sendMessage('INIT_SUCCESS', result);
          }
        } catch (error) {
          sendMessage('INIT_FAILED', error.message);
        }
      }

      async function getCards(data) {
        try {
          let result;
          if (data.isVISA) {
            if (!clickToPayServices.visa) {
              sendMessage('GET_CARDS_FAILED', 'Visa service not initialized');
              return;
            }
            result = await clickToPayServices.visa.getCards(data.params);
          } else {
            if (!clickToPayServices.mastercard) {
              sendMessage('GET_CARDS_FAILED', 'Mastercard service not initialized');
              return;
            }
            result = await clickToPayServices.mastercard.getCards(data.params);
          }
          sendMessage('GET_CARDS_SUCCESS', result);
        } catch (error) {
          sendMessage('GET_CARDS_FAILED', error.message);
        }
      }

      async function checkout(data) {
        try {
          let result;
          if (data.isVISA) {
            if (!clickToPayServices.visa) {
              sendMessage('CHECKOUT_FAILED', 'Visa service not initialized');
              return;
            }
            result = await clickToPayServices.visa.checkout(data.params);
          } else {
            if (!clickToPayServices.mastercard) {
              sendMessage('CHECKOUT_FAILED', 'Mastercard service not initialized');
              return;
            }
            const checkoutParams = {
              ...data.params,
              windowRef: document.getElementById('dcfLaunch').contentWindow
            };
            result = await clickToPayServices.mastercard.checkoutWithCard(checkoutParams);
          }
          sendMessage('CHECKOUT_SUCCESS', result);
        } catch (error) {
          sendMessage('CHECKOUT_FAILED', error.message);
        }
      }

      async function idLookup(data) {
        try {
          let result;
          if (data.isVISA) {
            if (!clickToPayServices.visa) {
              sendMessage('ID_LOOKUP_FAILED', 'Visa service not initialized');
              return;
            }
            result = await clickToPayServices.visa.getCards(data.params);
          } else {
            if (!clickToPayServices.mastercard) {
              sendMessage('ID_LOOKUP_FAILED', 'Mastercard service not initialized');
              return;
            }
            result = await clickToPayServices.mastercard.idLookup(data.params);
          }
          sendMessage('ID_LOOKUP_SUCCESS', result);
        } catch (error) {
          sendMessage('ID_LOOKUP_FAILED', error.message);
        }
      }

      async function initiateValidation(data) {
        try {
          let result;
          if (data.isVISA) {
            if (!clickToPayServices.visa) {
              sendMessage('INITIATE_VALIDATION_FAILED', 'Visa service not initialized');
              return;
            }
            result = await clickToPayServices.visa.initiateIdentityValidation(data.params);
          } else {
            if (!clickToPayServices.mastercard) {
              sendMessage('INITIATE_VALIDATION_FAILED', 'Mastercard service not initialized');
              return;
            }
            result = await clickToPayServices.mastercard.initiateValidation(data.params);
          }
          sendMessage('INITIATE_VALIDATION_SUCCESS', result);
        } catch (error) {
          sendMessage('INITIATE_VALIDATION_FAILED', error.message);
        }
      }

      async function validate(data) {
        try {
          let result;
          if (data.isVISA) {
            if (!clickToPayServices.visa) {
              sendMessage('VALIDATE_FAILED', 'Visa service not initialized');
              return;
            }
            result = await clickToPayServices.visa.getCards(data.params);
          } else {
            if (!clickToPayServices.mastercard) {
              sendMessage('VALIDATE_FAILED', 'Mastercard service not initialized');
              return;
            }
            result = await clickToPayServices.mastercard.validate(data.params);
          }
          sendMessage('VALIDATE_SUCCESS', result);
        } catch (error) {
          sendMessage('VALIDATE_FAILED', error.message);
        }
      }

      async function signOut(data) {
        try {
          let result;
          if (data.isVISA) {
            if (!clickToPayServices.visa) {
              sendMessage('SIGN_OUT_FAILED', 'Visa service not initialized');
              return;
            }
            result = await clickToPayServices.visa.unbindAppInstance();
          } else {
            if (!clickToPayServices.mastercard) {
              sendMessage('SIGN_OUT_FAILED', 'Mastercard service not initialized');
              return;
            }
            result = await clickToPayServices.mastercard.signOut();
          }
          sendMessage('SIGN_OUT_SUCCESS', result);
        } catch (error) {
          sendMessage('SIGN_OUT_FAILED', error.message);
        }
      }

      window.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.clickToPayRequest) {
            switch (data.clickToPayRequest.type) {
              case 'LOAD':
                addScript(data.clickToPayRequest.message);
                break;
              case 'INIT':
                initializeSDK(data.clickToPayRequest.message);
                break;
              case 'GET_CARDS':
                getCards(data.clickToPayRequest.message);
                break;
              case 'CHECKOUT':
                checkout(data.clickToPayRequest.message);
                break;
              case 'ID_LOOKUP':
                idLookup(data.clickToPayRequest.message);
                break;
              case 'INITIATE_VALIDATION':
                initiateValidation(data.clickToPayRequest.message);
                break;
              case 'VALIDATE':
                validate(data.clickToPayRequest.message);
                break;
              case 'SIGN_OUT':
                signOut(data.clickToPayRequest.message);
                break;
            }
          }
        } catch (ex) {}
      });
    </script>
  </body>
</html>
`;
