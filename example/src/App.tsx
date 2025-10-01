import { useRef, useState } from 'react';
import { View, StyleSheet, Button, Text, ScrollView, Alert, TextInput } from 'react-native';
import { VisaSDKIntegration, type VisaSDKRef } from 'react-native-hyperswitch-click-to-pay';

export default function App() {
  const sdkRef = useRef<VisaSDKRef>(null);
  const [status, setStatus] = useState('Not initialized');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');

  const consumerIdentity = {
    identityProvider: 'SRC',
    identityValue: 'pradeep.kumar@juspay.in',
    identityType: 'EMAIL_ADDRESS',
  };

  const handleInitAndGetCards = async () => {
    try {
      setLoading(true);
      setStatus('Initializing SDK...');

      // Initialize SDK
      await sdkRef.current?.callFunction('initialize', {
        dpaTransactionOptions: {
          transactionAmount: {
            transactionAmount: '123.94',
            transactionCurrencyCode: 'USD',
          },
          dpaBillingPreference: 'NONE',
          dpaAcceptedBillingCountries: ['US', 'CA'],
          merchantCategoryCode: '4829',
          merchantCountryCode: 'US',
          payloadTypeIndicator: 'FULL',
          merchantOrderId: 'order_' + Date.now(),
          paymentOptions: [
            {
              dpaDynamicDataTtlMinutes: 2,
              dynamicDataType: 'CARD_APPLICATION_CRYPTOGRAM_LONG_FORM',
            },
          ],
          dpaLocale: 'en_US',
        },
        correlationId: 'my-id',
      });

      setStatus('Getting cards...');

      // Get cards
      const response = await sdkRef.current?.callFunction('getCards', {
        consumerIdentity,
      });

      console.log('Get Cards Response:', response);

      if (response.actionCode === 'PENDING_CONSUMER_IDV') {
        setShowOtpInput(true);
        setStatus('OTP required - check your email');
        Alert.alert('OTP Required', 'Please check your email for OTP');
      } else if (response.actionCode === 'SUCCESS') {
        const fetchedCards = response.profiles?.[0]?.maskedCards || [];
        setCards(fetchedCards);
        setStatus(`Found ${fetchedCards.length} cards`);
        Alert.alert('Success', `Found ${fetchedCards.length} cards`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      setStatus(`Error: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = async () => {
    try {
      setLoading(true);
      setStatus('Validating OTP...');

      const response = await sdkRef.current?.callFunction('getCards', {
        consumerIdentity,
        validationData: otp,
      });

      console.log('OTP Validation Response:', response);

      if (response.actionCode === 'SUCCESS') {
        const fetchedCards = response.profiles?.[0]?.maskedCards || [];
        setCards(fetchedCards);
        setStatus(`Found ${fetchedCards.length} cards`);
        setShowOtpInput(false);
      }
    } catch (error: any) {
      console.error('Error:', error);
      setStatus(`Error: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedCardId) {
      Alert.alert('Error', 'Please select a card first');
      return;
    }

    try {
      setLoading(true);
      setStatus('Processing checkout...');

      const response = await sdkRef.current?.callFunction('checkout', {
        srcDigitalCardId: selectedCardId,
        payloadTypeIndicatorCheckout: 'FULL',
        dpaTransactionOptions: {
          authenticationPreferences: {
            authenticationMethods: [
              {
                authenticationMethodType: '3DS',
                authenticationSubject: 'CARDHOLDER',
                methodAttributes: {
                  challengeIndicator: '01',
                },
              },
            ],
            payloadRequested: 'AUTHENTICATED',
          },
          acquirerBIN: '455555',
          acquirerMerchantId: '12345678',
          merchantName: 'TestMerchant',
        },
      });

      console.log('Checkout Response:-------------', response);
      setStatus('Checkout completed!');
      Alert.alert('Success', 'Checkout completed!');
    } catch (error: any) {
      console.error('Error:', error);
      setStatus(`Error: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Status: {status}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Init and Get Cards"
          onPress={handleInitAndGetCards}
          disabled={loading}
        />
      </View>

      {showOtpInput && (
        <View style={styles.otpContainer}>
          <Text style={styles.label}>Enter OTP:</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            editable={!loading}
          />
          <Button
            title="Submit OTP"
            onPress={handleSubmitOtp}
            disabled={loading || !otp}
          />
        </View>
      )}

      {cards.length > 0 && (
        <ScrollView style={styles.cardsContainer}>
          <Text style={styles.cardsTitle}>Cards:</Text>
          {cards.map((card, index) => (
            <View
              key={index}
              style={[
                styles.cardItem,
                selectedCardId === card.srcDigitalCardId && styles.cardItemSelected,
              ]}
            >
              <Button
                title={`Select Card ${index + 1}`}
                onPress={() => setSelectedCardId(card.srcDigitalCardId)}
              />
              <Text style={styles.cardText}>
                {card.paymentCardDescriptor} **** {card.panLastFour}
              </Text>
              <Text style={styles.cardText}>
                Expires: {card.panExpirationMonth}/{card.panExpirationYear}
              </Text>
            </View>
          ))}
          {selectedCardId && (
            <View style={styles.checkoutButton}>
              <Button title="Checkout" onPress={handleCheckout} disabled={loading} />
            </View>
          )}
        </ScrollView>
      )}

      {/* Hidden WebView that loads the SDK */}
      <VisaSDKIntegration
        ref={sdkRef}
        onSDKReady={(methods) => {
          console.log('SDK Ready! Available methods:', methods);
          setStatus('SDK Ready');
        }}
        onError={(error) => {
          console.error('SDK Error:', error);
          setStatus(`SDK Error: ${error.message}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f5f5f5',
  },
  statusContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  otpContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  cardsContainer: {
    maxHeight: 300,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  cardsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    color: '#333',
  },
  cardItem: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  cardItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E8F4FF',
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
  },
  checkoutButton: {
    padding: 16,
  },
});
