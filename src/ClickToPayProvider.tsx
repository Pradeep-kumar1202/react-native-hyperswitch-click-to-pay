import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import ClickToPayComponent, {
  type ClickToPayComponentRef,
} from './ClickToPayComponent';
import type {
  ClickToPayConfig,
  ClickToPayCard,
  ClickToPayError,
} from './types';

type ClickToPayContextValue = {
  isReady: boolean;
  isLoading: boolean;
  error: ClickToPayError | null;
  cards: ClickToPayCard[];
  config: ClickToPayConfig;
  updateConfig: (updates: Partial<ClickToPayConfig>) => void;
  getCards: (userIdentity?: {
    value: string;
    type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER';
  }) => Promise<ClickToPayCard[]>;
  idLookup: (userIdentity: {
    value: string;
    type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER';
  }) => Promise<any>;
  initiateValidation: (requestedValidationChannelId?: string) => Promise<any>;
  validate: (otpCode: string) => Promise<any>;
  checkout: (
    cardId: string,
    amount: string,
    currency: string,
    orderId: string
  ) => Promise<any>;
  clearError: () => void;
};

const ClickToPayContext = createContext<ClickToPayContextValue | null>(null);

export type ClickToPayProviderProps = {
  config: ClickToPayConfig;
  children: React.ReactNode;
};

export const ClickToPayProvider: React.FC<ClickToPayProviderProps> = ({
  config: initialConfig,
  children,
}) => {
  const [config, setConfig] = useState<ClickToPayConfig>(initialConfig);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ClickToPayError | null>(null);
  const [cards, setCards] = useState<ClickToPayCard[]>([]);
  const [userIdentity, setUserIdentity] = useState<{
    value: string;
    type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER';
  } | null>(null);

  const componentRef = useRef<ClickToPayComponentRef>(null);
  const pendingPromiseRef = useRef<{
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const isVisa = config.provider === 'visa';

  const buildSDKUrl = useCallback((): string => {
    if (isVisa) {
      const baseUrl =
        config.environment === 'sandbox'
          ? 'https://sandbox.secure.checkout.visa.com/checkout-widget/resources/js/integration/v2/sdk.js'
          : 'https://secure.checkout.visa.com/checkout-widget/resources/js/integration/v2/sdk.js';

      return `${baseUrl}?dpaId=${config.dpaId}&cardBrands=${config.cardBrands}&dpaClientId=${config.clientId}&locale=${config.locale}`;
    } else {
      const baseUrl =
        config.environment === 'sandbox'
          ? 'https://sandbox.src.mastercard.com/srci/integration/2/lib.js'
          : 'https://src.mastercard.com/srci/integration/2/lib.js';

      return `${baseUrl}?srcDpaId=${config.dpaId}&locale=${config.locale}`;
    }
  }, [config, isVisa]);

  const buildInitializeOptions = useCallback((): any => {
    const transactionAmount = config.transactionAmount
      ? isVisa
        ? String(config.transactionAmount)
        : Number(config.transactionAmount)
      : isVisa
        ? '500.00'
        : 500;

    if (isVisa) {
      return {
        dpaTransactionOptions: {
          dpaLocale: config.locale,
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
          paymentOptions: [
            {
              dpaDynamicDataTtlMinutes: 15,
              dynamicDataType: 'CARD_APPLICATION_CRYPTOGRAM_LONG_FORM',
            },
          ],
          transactionAmount: {
            transactionAmount: transactionAmount,
            transactionCurrencyCode: config.transactionCurrency,
          },
          acquirerBIN: '455555',
          acquirerMerchantId: '12345678',
          merchantCategoryCode: '4289',
          merchantCountryCode: 'US',
          payloadTypeIndicator: 'FULL',
          dpaBillingPreference: 'NONE',
          merchantName: config.clientId,
          merchantOrderId: 'ctp_2142',
        },
      };
    } else {
      return {
        srcDpaId: config.dpaId,
        dpaData: {
          dpaName: config.clientId,
        },
        dpaTransactionOptions: {
          dpaLocale: config.locale,
          authenticationPreferences: {
            payloadRequested: 'AUTHENTICATED',
          },
          paymentOptions: [
            {
              dpaDynamicDataTtlMinutes: 15,
              dynamicDataType: 'CARD_APPLICATION_CRYPTOGRAM_LONG_FORM',
            },
          ],
          transactionAmount: {
            transactionAmount: transactionAmount,
            transactionCurrencyCode: config.transactionCurrency,
          },
          acquirerBIN: '545301',
          acquirerMerchantId: 'SRC3DS',
          merchantCategoryCode: '0001',
          merchantCountryCode: 'US',
        },
        checkoutExperience: 'WITHIN_CHECKOUT',
        cardBrands: config.cardBrands?.split(','),
      };
    }
  }, [config, isVisa]);

  const buildGetCardsParams = useCallback(
    (userIdentity: {
      value: string;
      type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER';
    }): any => {
      return {
        consumerIdentity: {
          identityProvider: 'SRC',
          identityValue: userIdentity.value,
          identityType: userIdentity.type,
        },
      };
    },
    []
  );

  const buildIdLookupParams = useCallback(
    (userIdentity: {
      value: string;
      type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER';
    }): any => {
      if (isVisa) {
        return {
          consumerIdentity: {
            identityProvider: 'SRC',
            identityValue: userIdentity.value,
            identityType: userIdentity.type,
          },
        };
      } else {
        if (userIdentity.type === 'EMAIL_ADDRESS') {
          return {
            email: userIdentity.value,
          };
        } else {
          return {
            mobileNumber: {
              countryCode: '1',
              phoneNumber: userIdentity.value,
            },
          };
        }
      }
    },
    [isVisa]
  );

  const buildInitiateValidationParams = useCallback(
    (requestedValidationChannelId?: string): any => {
      if (isVisa) {
        return {};
      } else {
        return requestedValidationChannelId
          ? { requestedValidationChannelId }
          : undefined;
      }
    },
    [isVisa]
  );

  const buildValidateParams = useCallback(
    (
      otpCode: string,
      userIdentity?: { value: string; type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER' }
    ): any => {
      if (isVisa) {
        return {
          consumerIdentity: {
            identityProvider: 'SRC',
            identityValue: userIdentity?.value,
            identityType: userIdentity?.type,
          },
          validationData: otpCode,
        };
      } else {
        return {
          value: otpCode,
        };
      }
    },
    [isVisa]
  );

  const buildCheckoutParams = useCallback(
    (
      cardId: string,
      amount: string,
      currency: string,
      orderId: string
    ): any => {
      if (isVisa) {
        return {
          srcDigitalCardId: cardId,
          amount: amount,
          currency: currency,
          merchantOrderId: orderId,
        };
      } else {
        return {
          srcDigitalCardId: cardId,
          dpaTransactionOptions: {
            transactionAmount: {
              transactionAmount: parseFloat(amount),
              transactionCurrencyCode: currency,
            },
          },
          rememberMe: true,
        };
      }
    },
    [isVisa]
  );

  const formatCards = useCallback((data: any): ClickToPayCard[] => {
    let cards = [];

    if (data?.profiles?.[0]?.maskedCards) {
      cards = data.profiles[0].maskedCards;
    } else if (Array.isArray(data)) {
      cards = data;
    } else if (data?.cards) {
      cards = data.cards;
    } else {
      return [];
    }

    return cards.map((card: any) => ({
      id: card.srcDigitalCardId ?? card.digitalCardId,
      maskedPan:
        card.panLastFour ??
        card.tokenLastFour ??
        card.maskedBillingAddress?.accountNumber,
      brand:
        card.digitalCardData?.descriptorName?.toLowerCase() ??
        card.paymentCardDescriptor ??
        card.brand,
      expiryMonth: card.panExpirationMonth ?? card.digitalCardData?.expiryMonth,
      expiryYear: card.panExpirationYear ?? card.digitalCardData?.expiryYear,
      digitalCardId: card.srcDigitalCardId ?? card.digitalCardId,
    }));
  }, []);

  const handleWebViewMessage = useCallback(
    (type: string, data: any) => {
      console.log(`[Provider] Received: ${type}`, data);

      switch (type) {
        case 'LOAD_SUCCESS':
          console.log('[Provider] SDK loaded, initializing...');
          const initializeOptions = buildInitializeOptions();
          componentRef.current?.sendMessage('INIT', {
            isVISA: isVisa,
            initializeOptions,
          });
          break;

        case 'LOAD_ERROR':
          console.error('[Provider] SDK load failed');
          setError({
            message: 'Failed to load SDK',
            code: 'SDK_LOAD_ERROR',
            category: 'network',
            recoverable: true,
          });
          setIsLoading(false);
          break;

        case 'INIT_SUCCESS':
          console.log('[Provider] SDK initialized successfully');
          setIsReady(true);
          setIsLoading(false);
          break;

        case 'INIT_FAILED':
          console.error('[Provider] SDK initialization failed:', data);
          setError({
            message: data || 'SDK initialization failed',
            code: 'SDK_INIT_ERROR',
            category: 'configuration',
            recoverable: false,
          });
          setIsLoading(false);
          break;

        case 'GET_CARDS_SUCCESS':
          console.log('[Provider] Cards retrieved successfully');

          if (data.actionCode === 'PENDING_CONSUMER_IDV') {
            console.log('[Provider] OTP required - waiting for validation');
            setIsLoading(false);
            if (pendingPromiseRef.current) {
              pendingPromiseRef.current.reject(new Error('OTP_REQUIRED'));
              pendingPromiseRef.current = null;
            }
          } else {
            const formattedCards = formatCards(data);
            setCards(formattedCards);
            setIsLoading(false);
            if (pendingPromiseRef.current) {
              pendingPromiseRef.current.resolve(formattedCards);
              pendingPromiseRef.current = null;
            }
          }
          break;

        case 'GET_CARDS_FAILED':
          console.error('[Provider] Get cards failed:', data);
          setError({
            message: data || 'Failed to get cards',
            code: 'GET_CARDS_ERROR',
            category: 'network',
            recoverable: true,
          });
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.reject(new Error(data));
            pendingPromiseRef.current = null;
          }
          break;

        case 'ID_LOOKUP_SUCCESS':
          console.log('[Provider] ID lookup successful');
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.resolve(data);
            pendingPromiseRef.current = null;
          }
          break;

        case 'ID_LOOKUP_FAILED':
          console.error('[Provider] ID lookup failed:', data);
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.reject(new Error(data));
            pendingPromiseRef.current = null;
          }
          break;

        case 'INITIATE_VALIDATION_SUCCESS':
          console.log('[Provider] Validation initiated successfully');
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.resolve(data);
            pendingPromiseRef.current = null;
          }
          break;

        case 'INITIATE_VALIDATION_FAILED':
          console.error('[Provider] Initiate validation failed:', data);
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.reject(new Error(data));
            pendingPromiseRef.current = null;
          }
          break;

        case 'VALIDATE_SUCCESS':
          console.log('[Provider] Validation successful');
          const validatedCards = formatCards(data);
          setCards(validatedCards);
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.resolve(validatedCards);
            pendingPromiseRef.current = null;
          }
          break;

        case 'VALIDATE_FAILED':
          console.error('[Provider] Validation failed:', data);
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.reject(new Error(data));
            pendingPromiseRef.current = null;
          }
          break;

        case 'CHECKOUT_SUCCESS':
          console.log('[Provider] Checkout successful');
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.resolve(data);
            pendingPromiseRef.current = null;
          }
          break;

        case 'CHECKOUT_FAILED':
          console.error('[Provider] Checkout failed:', data);
          setError({
            message: data || 'Checkout failed',
            code: 'CHECKOUT_ERROR',
            category: 'payment',
            recoverable: true,
          });
          setIsLoading(false);
          if (pendingPromiseRef.current) {
            pendingPromiseRef.current.reject(new Error(data));
            pendingPromiseRef.current = null;
          }
          break;

        default:
          console.log(`[Provider] Unhandled message type: ${type}`);
      }
    },
    [buildInitializeOptions, formatCards, isVisa]
  );

  useEffect(() => {
    console.log('[Provider] Initializing SDK...');
    setIsLoading(true);

    const sdkUrl = buildSDKUrl();
    componentRef.current?.sendMessage('LOAD', { sdkUrl });
  }, [buildSDKUrl]);

  const updateConfig = useCallback((updates: Partial<ClickToPayConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getCards = useCallback(
    async (userIdentity?: {
      value: string;
      type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER';
    }): Promise<ClickToPayCard[]> => {
      if (!isReady) {
        throw new Error('SDK not ready');
      }

      const identity = userIdentity || {
        value: 'user@example.com',
        type: 'EMAIL_ADDRESS',
      };
      setUserIdentity(identity);

      setIsLoading(true);
      clearError();

      const params = buildGetCardsParams(identity);

      return new Promise((resolve, reject) => {
        pendingPromiseRef.current = { resolve, reject };
        componentRef.current?.sendMessage('GET_CARDS', {
          isVISA: isVisa,
          params,
        });
      });
    },
    [isReady, isVisa, buildGetCardsParams, clearError]
  );

  const idLookup = useCallback(
    async (userIdentity: {
      value: string;
      type: 'EMAIL_ADDRESS' | 'PHONE_NUMBER';
    }): Promise<any> => {
      if (!isReady) {
        throw new Error('SDK not ready');
      }

      setIsLoading(true);
      clearError();

      const params = buildIdLookupParams(userIdentity);

      return new Promise((resolve, reject) => {
        pendingPromiseRef.current = { resolve, reject };
        componentRef.current?.sendMessage('ID_LOOKUP', {
          isVISA: isVisa,
          params,
        });
      });
    },
    [isReady, isVisa, buildIdLookupParams, clearError]
  );

  const initiateValidation = useCallback(
    async (requestedValidationChannelId?: string): Promise<any> => {
      if (!isReady) {
        throw new Error('SDK not ready');
      }

      setIsLoading(true);
      clearError();

      const params = buildInitiateValidationParams(
        requestedValidationChannelId
      );

      return new Promise((resolve, reject) => {
        pendingPromiseRef.current = { resolve, reject };
        componentRef.current?.sendMessage('INITIATE_VALIDATION', {
          isVISA: isVisa,
          params,
        });
      });
    },
    [isReady, isVisa, buildInitiateValidationParams, clearError]
  );

  const validate = useCallback(
    async (otpCode: string): Promise<any> => {
      if (!isReady) {
        throw new Error('SDK not ready');
      }

      setIsLoading(true);
      clearError();

      if (isVisa) {
        const params = buildValidateParams(otpCode, userIdentity || undefined);
        return new Promise((resolve, reject) => {
          pendingPromiseRef.current = { resolve, reject };
          componentRef.current?.sendMessage('GET_CARDS', {
            isVISA: isVisa,
            params,
          });
        });
      } else {
        const params = buildValidateParams(otpCode);
        return new Promise((resolve, reject) => {
          pendingPromiseRef.current = { resolve, reject };
          componentRef.current?.sendMessage('VALIDATE', {
            isVISA: isVisa,
            params,
          });
        });
      }
    },
    [isReady, isVisa, buildValidateParams, clearError, userIdentity]
  );

  const checkout = useCallback(
    async (
      cardId: string,
      amount: string,
      currency: string,
      orderId: string
    ): Promise<any> => {
      if (!isReady) {
        throw new Error('SDK not ready');
      }

      setIsLoading(true);
      clearError();

      const params = buildCheckoutParams(cardId, amount, currency, orderId);

      return new Promise((resolve, reject) => {
        pendingPromiseRef.current = { resolve, reject };
        componentRef.current?.sendMessage('CHECKOUT', {
          isVISA: isVisa,
          params,
        });
      });
    },
    [isReady, isVisa, buildCheckoutParams, clearError]
  );

  const contextValue: ClickToPayContextValue = {
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
  };

  return (
    <ClickToPayContext.Provider value={contextValue}>
      <ClickToPayComponent
        ref={componentRef}
        onMessage={handleWebViewMessage}
      />
      {children}
    </ClickToPayContext.Provider>
  );
};

export const useClickToPay = (): ClickToPayContextValue => {
  const context = useContext(ClickToPayContext);
  if (!context) {
    throw new Error('useClickToPay must be used within ClickToPayProvider');
  }
  return context;
};
