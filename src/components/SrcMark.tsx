import React from 'react';
import { StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

export interface SrcMarkProps {
  cardBrands: string[];
  height?: number;
  width?: number;
}

const SrcMark: React.FC<SrcMarkProps> = ({
  cardBrands,
  height = 32,
  width = 150,
}) => {
  const cardBrandsStr = cardBrands.join(',');

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
            height: ${height}px;
            overflow: hidden;
            background: transparent;
          }
        </style>
      </head>
      <body>
        <src-mark card-brands="${cardBrandsStr}" height="${height}"></src-mark>
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

export default SrcMark;