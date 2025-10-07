import React from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

export interface SrcLoaderProps {
  height?: number;
  width?: number;
}

const SrcLoader: React.FC<SrcLoaderProps> = ({
  height = 200,
  width = 200,
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://src.mastercard.com/srci/integration/components/src-ui-kit/src-ui-kit.css">
        <script type="module" src="https://src.mastercard.com/srci/integration/components/src-ui-kit/src-ui-kit.esm.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: ${height}px;
            overflow: hidden;
            background: transparent;
          }
        </style>
      </head>
      <body>
        <src-loader></src-loader>
      </body>
    </html>
  `;

  return (
    <WebView
      source={{ html: htmlContent }}
      style={[
        styles.webview,
        {
          height: height,
          width: width,
        },
      ]}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      originWhitelist={['*']}
      javaScriptEnabled={true}
    />
  );
};

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
  },
});

export default SrcLoader;
