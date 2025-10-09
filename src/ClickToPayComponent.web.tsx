import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    sendMessage: (type: string, data: any) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const message = {
          clickToPayRequest: {
            type: type,
            message: data,
          },
        };

        iframeRef.current.contentWindow.postMessage(
          JSON.stringify(message),
          '*'
        );
      }
    },
  }));

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let messageData;
        if (typeof event.data === 'string') {
          messageData = JSON.parse(event.data);
        } else {
          messageData = event.data;
        }

        const message = messageData.clickToPayResponse;
        if (message) {
          console.log(JSON.stringify(message));
          onMessage(message.type, message.data);
        }
      } catch (error) {
        console.log('Failed to parse iframe message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={clickToPayWebViewHTML}
      style={{
        width: '400px',
        height: '400px',
        border: 'none',
      }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      title="Click to Pay"
    />
  );
});

export default ClickToPayComponent;
