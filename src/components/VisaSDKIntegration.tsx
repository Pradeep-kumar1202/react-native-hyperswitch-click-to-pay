import { useRef, useImperativeHandle, forwardRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { StyleProp, ViewStyle } from 'react-native';

export interface VisaSDKIntegrationProps {
  /**
   * URL to the Visa SDK script
   * @default Visa sandbox URL
   */
  sdkUrl?: string;

  /**
   * Called when SDK is loaded and ready
   */
  onSDKReady?: (methods: string[]) => void;

  /**
   * Called on errors
   */
  onError?: (error: Error) => void;

  /**
   * Optional style for WebView (defaults to hidden)
   */
  style?: StyleProp<ViewStyle>;
}

export interface VisaSDKRef {
  /**
   * Call any SDK function
   * @param functionName - Name of the function (e.g., 'initialize', 'getCards', 'checkout')
   * @param args - Array of arguments to pass to the function
   */
  callFunction: (functionName: string, ...args: any[]) => Promise<any>;
}

interface Message {
  id?: string;
  type?: string;
  data?: any;
  error?: string;
}

const VisaSDKIntegration = forwardRef<VisaSDKRef, VisaSDKIntegrationProps>((props, ref) => {
  const {
    sdkUrl = 'https://sandbox.secure.checkout.visa.com/checkout-widget/resources/js/integration/v2/sdk.js?dpaId=498WCF39JVQVH1UK4TGG21leLAj_MJQoapP5f12IanfEYaSno&locale=en_US&cardBrands=visa,mastercard&dpaClientId=TestMerchant',
    onSDKReady,
    onError,
    style,
  } = props;

  const webViewRef = useRef<WebView>(null);
  const callbacks = useRef(new Map<string, { resolve: Function; reject: Function }>());
  const messageId = useRef(0);

  useImperativeHandle(ref, () => ({
    callFunction: (functionName: string, ...args: any[]) => {
      return new Promise((resolve, reject) => {
        if (!webViewRef.current) {
          reject(new Error('WebView not ready'));
          return;
        }

        const id = `msg_${messageId.current++}`;
        callbacks.current.set(id, { resolve, reject });

        const message = { id, functionName, args };
        console.log(`[RN] Calling ${functionName}:`, args);

        (webViewRef.current as any).postMessage(JSON.stringify(message));

        setTimeout(() => {
          if (callbacks.current.has(id)) {
            callbacks.current.delete(id);
            reject(new Error(`Timeout calling ${functionName}`));
          }
        }, 30000);
      });
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message: Message = JSON.parse(event.nativeEvent.data);
      console.log('[RN] Received:', message);

      // SDK ready event
      if (message.type === 'SDK_READY') {
        onSDKReady?.(message.data?.methods || []);
        return;
      }

      // Location log event
      if (message.type === 'LOCATION_LOG') {
        console.log('[RN] 🌐 Window Location:', message.data);
        return;
      }

      // Function response
      if (message.id) {
        const callback = callbacks.current.get(message.id);
        if (callback) {
          callbacks.current.delete(message.id);

          if (message.error) {
            callback.reject(new Error(message.error));
          } else {
            callback.resolve(message.data);
          }
        }
      }
    } catch (err) {
      console.error('[RN] Message error:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleError = (syntheticEvent: any) => {
    console.error('[RN] WebView error:', syntheticEvent.nativeEvent);
    onError?.(new Error(syntheticEvent.nativeEvent.description || 'WebView error'));
  };

  const handleNavigationStateChange = (navState: any) => {
    console.log('[RN] Navigation:', navState.url);
    // You can intercept redirects here if needed
  };

  // JavaScript to inject into WebView to set up communication bridge
  const injectedJavaScript = `
(function() {
  console.log('[WebView] Bridge initializing...');

  let sdkReady = false;
  let checkAttempts = 0;
  const maxAttempts = 20;

  // Check if VSDK is available
  function checkSDK() {
    checkAttempts++;
    console.log('[WebView] Checking for VSDK... attempt', checkAttempts);

    if (typeof VSDK !== 'undefined' && VSDK) {
      console.log('[WebView] VSDK found! Methods:', Object.keys(VSDK));
      sdkReady = true;

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SDK_READY',
        data: { methods: Object.keys(VSDK) }
      }));

      setupListeners();
    } else if (checkAttempts < maxAttempts) {
      setTimeout(checkSDK, 500);
    } else {
      console.error('[WebView] VSDK not found after', maxAttempts, 'attempts');
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SDK_READY',
        error: 'VSDK not found'
      }));
    }
  }

  function setupListeners() {
    // Listen for React Native messages (Android)
    document.addEventListener('message', (e) => handleMessage(e.data));

    // Listen for React Native messages (iOS)
    window.addEventListener('message', (e) => handleMessage(e.data));

    console.log('[WebView] Message listeners ready');
  }

  // Loader functions
  // let loaderStartTime = 0;
  // const MIN_LOADER_DISPLAY_MS = 800; // Minimum time to show loader

  function showLoader() {
    const loader = document.getElementById('loader-container');
    if (loader) {
      loader.classList.add('visible');
      // loaderStartTime = Date.now();
      console.log('[WebView] Loader shown');
    }
  }

  function hideLoader() {
    const loader = document.getElementById('loader-container');
    if (loader) {
      // Calculate how long the loader has been visible
      // const elapsedTime = Date.now() - loaderStartTime;
      // const remainingTime = MIN_LOADER_DISPLAY_MS - elapsedTime;

      // If loader hasn't been shown for minimum time, wait
      // if (remainingTime > 0) {
      //   await new Promise(resolve => setTimeout(resolve, remainingTime));
      // }

      loader.classList.remove('visible');
      console.log('[WebView] Loader hidden');
    }
  }

  async function handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('[WebView] Received:', message);

      const { id, functionName, args } = message;

      // Handle special commands
      if (functionName === 'showLoader') {
        showLoader();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: id,
          data: true
        }));
        return;
      }

      if (functionName === 'hideLoader') {
        hideLoader();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: id,
          data: true
        }));
        return;
      }

      if (!sdkReady) {
        throw new Error('SDK not ready');
      }

      if (typeof VSDK[functionName] !== 'function') {
        throw new Error('Function ' + functionName + ' not found. Available: ' + Object.keys(VSDK).join(', '));
      }

      console.log('[WebView] Calling VSDK.' + functionName);
      console.log('[WebView] Args:', JSON.stringify(args, null, 2));

      console.log('[WebView] Calling VSDK.' + functionName);
      console.log('[WebView] Args:', JSON.stringify(args, null, 2));

      // Show loader for async operations
      if (['initialize', 'getCards', 'checkout'].includes(functionName)) {
        showLoader();
      }

      const result = await VSDK[functionName](...(args || []));

      console.log('[WebView] Result:', JSON.stringify(result, null, 2));
      console.log('[WebView] window.location.href:', window.location.href);

      // Log if there's an error in the result
      if (result && result.error) {
        console.error('[WebView] VSDK returned error:', result.error);
      }

      // Hide loader after operation completes
      if (['initialize', 'getCards', 'checkout'].includes(functionName)) {
        hideLoader();
      }

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'LOCATION_LOG',
        data: {
          demo: window.location,
        }
      }));

      window.ReactNativeWebView.postMessage(JSON.stringify({
        id: id,
        data: result
      }));

    } catch (error) {
      console.error('[WebView] Error:', error);
      hideLoader(); // Always hide loader on error
      window.ReactNativeWebView.postMessage(JSON.stringify({
        id: message.id,
        error: error.message || String(error)
      }));
    }
  }

  // Start checking for SDK
  checkSDK();
})();

true; // Required for injectedJavaScript
`;

  // Minimal HTML that loads the SDK
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Mastercard SRC UI Kit for loader component -->
    <link rel="stylesheet" href="https://src.mastercard.com/srci/integration/components/src-ui-kit/src-ui-kit.css">
    <script type="module" src="https://src.mastercard.com/srci/integration/components/src-ui-kit/src-ui-kit.esm.js"></script>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #loader-container {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        z-index: 9999;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }
      #loader-container.visible {
        display: flex;
      }
    </style>
   <script>
    // Polyfills BEFORE SDK loads - critical for VSDK
    console.log('[WebView] Setting up polyfills...');

    // Ensure parent/top/opener exist to prevent null errors
    if (!window.parent) {
      window.parent = window;
    }
    if (!window.top) {
      window.top = window;
    }
    if (window.opener === undefined) {
      window.opener = null;
    }

    console.log('[WebView] Polyfills ready');
    console.log('[WebView] window.location:', window.location.href);
    console.log('[WebView] window.parent:', window.parent === window ? 'self' : 'external');
    </script>
  </head>
  <body>
    <div id="loader-container">
      <src-loader></src-loader>
    </div>
    <!-- Container for potential 3DS iframe/content -->
    <div id="visa-sdk-container" style="width:100%;height:100vh;"></div>
    <div id="three-ds-container"></div>

    <script src="${sdkUrl}" crossorigin="anonymous"></script>
  </body>
</html>`;

  return (
    <WebView
      ref={webViewRef}
      source={{
        html,
        baseUrl: 'https://sandbox.secure.checkout.visa.com',
      }}
      injectedJavaScript={injectedJavaScript}
      onMessage={handleMessage}
      onError={handleError}
      onNavigationStateChange={handleNavigationStateChange}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      thirdPartyCookiesEnabled={true}
      sharedCookiesEnabled={true}
      mixedContentMode="always"
      originWhitelist={['*']}
      // Use provided style or default to full height for loader visibility
      style={style || { height: 200, width: '100%' }}
    />
  );
});

VisaSDKIntegration.displayName = 'VisaSDKIntegration';

export default VisaSDKIntegration;
