import { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { clickToPayWebViewHTML } from './clickToPayWebView.html';

export type ClickToPayComponentProps = {
  onMessage: (type: string, data: any) => void;
};

export type ClickToPayComponentRef = {
  sendMessage: (type: string, data: any) => void;
};

const ClickToPayComponent = forwardRef<
  ClickToPayComponentRef,
  ClickToPayComponentProps
>(({ onMessage }, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    sendMessage: (type: string, data: any) => {
      if (webViewRef.current) {
        const message = {
          clickToPayRequest: {
            type: type,
            message: data,
          },
        };

        const script = `
            (function() {
              const event = new MessageEvent('message', {
                data: ${JSON.stringify(JSON.stringify(message))}
              });
              window.dispatchEvent(event);
            })();
            true;
          `;

        webViewRef.current.injectJavaScript(script);
      }
    },
  }));

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const messageData = JSON.parse(event.nativeEvent.data);
      const message = messageData.clickToPayResponse;

      if (message) {
        console.log(JSON.stringify(message));
        onMessage(message.type, message.data);
      }
    } catch (error) {
      console.log('Failed to parse WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{
          html: clickToPayWebViewHTML,
          baseUrl: 'https://localhost',
        }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView error:', nativeEvent.description);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 400,
    height: 400,
    opacity: 1,
  },
});

export default ClickToPayComponent;
