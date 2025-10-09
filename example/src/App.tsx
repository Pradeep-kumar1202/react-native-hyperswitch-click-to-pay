import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from 'react-native';

import {
  ClickToPayProvider,
  useClickToPay,
  type ClickToPayCard,
} from 'react-native-hyperswitch-click-to-pay';

// Configuration state moved to App level
const App: React.FC = () => {
  return (
    <ClickToPayProvider
      config={{
        dpaId: '498WCF39JVQVH1UK4TGG21leLAj_MJQoapP5f12IanfEYaSno',
        environment: 'sandbox',
        provider: 'visa',
        locale: 'en_US',
        cardBrands: 'visa,mastercard',
        clientId: 'TestMerchant',
        transactionAmount: '500.00',
        transactionCurrency: 'USD',
        timeout: 30000,
        debug: true,
      }}
    >
      <CheckoutScreen />
    </ClickToPayProvider>
  );
};

const CheckoutScreen: React.FC = () => {
  // User identity state
  const [userIdentity, setUserIdentity] = useState('shivam.shashank@juspay.in');
  const [identityType, setIdentityType] = useState<
    'EMAIL_ADDRESS' | 'PHONE_NUMBER'
  >('EMAIL_ADDRESS');

  // OTP state
  const [otpCode, setOtpCode] = useState('');

  // Payment state
  const [amount, setAmount] = useState('99.99');
  const [currency, setCurrency] = useState('USD');
  const [orderId, setOrderId] = useState('order-123');
  const [selectedCardId, setSelectedCardId] = useState('');

  const {
    isReady,
    isLoading,
    error,
    cards,
    config,
    updateConfig,
    getCards,
    idLookup,
    initiateValidation,
    validate,
    checkout,
    clearError,
  } = useClickToPay();

  const { dpaId, environment, provider, locale } = config;

  const handleGetCards = async () => {
    try {
      const retrievedCards = await getCards({
        value: userIdentity,
        type: identityType,
      });
      Alert.alert('Cards Retrieved', `Found ${retrievedCards.length} cards`, [
        { text: 'OK' },
      ]);

      if (retrievedCards.length > 0 && retrievedCards[0]) {
        setSelectedCardId(retrievedCards[0].digitalCardId);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to get cards',
        [{ text: 'OK' }]
      );
    }
  };

  const handleIdLookup = async () => {
    try {
      await idLookup({ value: userIdentity, type: identityType });
      Alert.alert('Success', 'ID Lookup completed', [{ text: 'OK' }]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'ID Lookup failed',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSendOTP = async () => {
    try {
      await initiateValidation();
      Alert.alert('Success', 'OTP sent successfully', [{ text: 'OK' }]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to send OTP',
        [{ text: 'OK' }]
      );
    }
  };

  const handleValidateOTP = async () => {
    try {
      await validate(otpCode);
      Alert.alert('Success', 'OTP validated successfully', [{ text: 'OK' }]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'OTP validation failed',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCheckout = async () => {
    if (!selectedCardId) {
      Alert.alert('Error', 'Please select a card first', [{ text: 'OK' }]);
      return;
    }

    try {
      await checkout(selectedCardId, amount, currency, orderId);
      Alert.alert('Success', 'Checkout completed successfully', [
        { text: 'OK' },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Checkout failed',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    if (error) {
      Alert.alert(
        'Click to Pay Error',
        `${error.message}\n\nCode: ${error.code}\nCategory: ${error.category}`,
        [{ text: 'Clear Error', onPress: clearError }, { text: 'OK' }]
      );
    }
  }, [error, clearError]);

  useEffect(() => {
    if (cards.length > 0 && !selectedCardId && cards[0]) {
      setSelectedCardId(cards[0].digitalCardId);
    }
  }, [cards, selectedCardId]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scrollView}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Provider Selection</Text>
        <View style={styles.providerToggle}>
          <TouchableOpacity
            style={[
              styles.providerButton,
              provider === 'visa' && styles.providerButtonActive,
            ]}
            onPress={() => {
              updateConfig({
                provider: 'visa',
                dpaId: '498WCF39JVQVH1UK4TGG21leLAj_MJQoapP5f12IanfEYaSno',
              });
            }}
          >
            <Text
              style={[
                styles.providerButtonText,
                provider === 'visa' && styles.providerButtonTextActive,
              ]}
            >
              Visa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.providerButton,
              provider === 'mastercard' && styles.providerButtonActive,
            ]}
            onPress={() => {
              updateConfig({
                provider: 'mastercard',
                dpaId: 'b6e06cc6-3018-4c4c-bbf5-9fb232615090',
              });
            }}
          >
            <Text
              style={[
                styles.providerButtonText,
                provider === 'mastercard' && styles.providerButtonTextActive,
              ]}
            >
              Mastercard
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Sandbox Mode</Text>
          <Switch
            value={environment === 'sandbox'}
            onValueChange={(value) =>
              updateConfig({ environment: value ? 'sandbox' : 'production' })
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <Text style={styles.label}>DPA ID</Text>
        <TextInput
          style={styles.input}
          value={dpaId}
          onChangeText={(value) => updateConfig({ dpaId: value })}
          placeholder="DPA ID"
        />
        <Text style={styles.label}>Locale</Text>
        <TextInput
          style={styles.input}
          value={locale}
          onChangeText={(value) => updateConfig({ locale: value })}
          placeholder="en_US"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SDK Status</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              isReady ? styles.ready : styles.loading,
            ]}
          />
          <Text style={styles.statusText}>
            {isLoading ? 'Loading...' : isReady ? 'Ready' : 'Initializing'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Identity</Text>
        <Text style={styles.label}>Email/Phone</Text>
        <TextInput
          style={styles.input}
          value={userIdentity}
          onChangeText={setUserIdentity}
          placeholder="user@example.com"
          keyboardType={
            identityType === 'EMAIL_ADDRESS' ? 'email-address' : 'phone-pad'
          }
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>Use Email</Text>
          <Switch
            value={identityType === 'EMAIL_ADDRESS'}
            onValueChange={(value) =>
              setIdentityType(value ? 'EMAIL_ADDRESS' : 'PHONE_NUMBER')
            }
          />
        </View>
        <TouchableOpacity
          style={[styles.button, !isReady && styles.buttonDisabled]}
          onPress={handleIdLookup}
          disabled={!isReady || isLoading}
        >
          <Text style={styles.buttonText}>ID Lookup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !isReady && styles.buttonDisabled]}
          onPress={handleGetCards}
          disabled={!isReady || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Get Cards'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OTP Validation</Text>
        <Text style={styles.label}>OTP Code</Text>
        <TextInput
          style={styles.input}
          value={otpCode}
          onChangeText={setOtpCode}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            !isReady && styles.buttonDisabled,
          ]}
          onPress={handleSendOTP}
          disabled={!isReady || isLoading}
        >
          <Text style={styles.buttonText}>Send OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            !isReady && styles.buttonDisabled,
          ]}
          onPress={handleValidateOTP}
          disabled={!isReady || isLoading || !otpCode}
        >
          <Text style={styles.buttonText}>Validate OTP</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Available Cards ({cards.length})
        </Text>
        {cards.length > 0 ? (
          cards.map((card: ClickToPayCard) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.cardItem,
                selectedCardId === card.digitalCardId &&
                  styles.cardItemSelected,
              ]}
              onPress={() => setSelectedCardId(card.digitalCardId)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardBrand}>{card.brand.toUpperCase()}</Text>
                {selectedCardId === card.digitalCardId && (
                  <Text style={styles.selectedBadge}>✓ Selected</Text>
                )}
              </View>
              <Text style={styles.cardNumber}>{card.maskedPan}</Text>
              <Text style={styles.cardExpiry}>
                Expires: {card.expiryMonth}/{card.expiryYear}
              </Text>
              <Text style={styles.cardId}>
                ID: {card.digitalCardId.substring(0, 20)}...
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noCardsText}>
            {isReady
              ? 'No cards available. Click "Get Cards" to retrieve.'
              : 'Waiting for SDK to initialize...'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="99.99"
          keyboardType="decimal-pad"
        />
        <Text style={styles.label}>Currency</Text>
        <TextInput
          style={styles.input}
          value={currency}
          onChangeText={setCurrency}
          placeholder="USD"
        />
        <Text style={styles.label}>Order ID</Text>
        <TextInput
          style={styles.input}
          value={orderId}
          onChangeText={setOrderId}
          placeholder="order-123"
        />
        <TouchableOpacity
          style={[
            styles.button,
            styles.checkoutButton,
            (!isReady || !selectedCardId) && styles.buttonDisabled,
          ]}
          onPress={handleCheckout}
          disabled={!isReady || isLoading || !selectedCardId}
        >
          <Text style={styles.buttonText}>
            Checkout {currency} {amount}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        {error && (
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearError}
          >
            <Text style={styles.buttonText}>Clear Error</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Details</Text>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Message: {error.message}</Text>
            <Text style={styles.errorText}>Code: {error.code}</Text>
            <Text style={styles.errorText}>Category: {error.category}</Text>
            <Text style={styles.errorText}>
              Recoverable: {error.recoverable ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  providerToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  providerButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  providerButtonActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  providerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  providerButtonTextActive: {
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  loading: {
    backgroundColor: '#ffa726',
  },
  ready: {
    backgroundColor: '#66bb6a',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  cardItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  cardItemSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#28a745',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  selectedBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745',
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  cardId: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  noCardsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  checkoutButton: {
    backgroundColor: '#28a745',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginBottom: 2,
  },
});

export default App;
