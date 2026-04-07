import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';

export type VerificationButtonProps = {
  pharmacyId: string;
  /** Retour résolu = succès ; rejet avec Error = affichage du message */
  onVerify: (pharmacyId: string) => Promise<void>;
  disabled?: boolean;
  /** Surcharge du message état désactivé (ex. trop loin) */
  disabledLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_DISABLED = 'Rapprochez-vous pour vérifier (moins de 500 m).';

const onPrimaryLabel = '#FFFFFF';

/**
 * CTA vérification communautaire « ouvert » (specs §4.4, §8.1).
 */
export function VerificationButton({
  pharmacyId,
  onVerify,
  disabled = false,
  disabledLabel = DEFAULT_DISABLED,
  style,
}: VerificationButtonProps) {
  const { theme: t } = useAppTheme();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (phase !== 'success') return;
    const tid = setTimeout(() => {
      setPhase('idle');
    }, 4000);
    return () => clearTimeout(tid);
  }, [phase]);

  const handlePress = useCallback(async () => {
    if (disabled || phase === 'loading') return;
    setPhase('loading');
    setErrorMessage('');
    try {
      await onVerify(pharmacyId);
      setPhase('success');
    } catch (e) {
      const msg =
        e instanceof Error && e.message.length > 0
          ? e.message
          : 'Une erreur est survenue. Réessayez.';
      setErrorMessage(msg);
      setPhase('error');
    }
  }, [disabled, onVerify, pharmacyId, phase]);

  const blockPress =
    disabled || phase === 'loading' || phase === 'success';

  const a11yLabel = useMemo((): string => {
    if (disabled) return disabledLabel;
    if (phase === 'loading') return 'Envoi de la vérification en cours';
    if (phase === 'success') return 'Vérification enregistrée, plus cinq points';
    if (phase === 'error') return 'Erreur de vérification, toucher pour réessayer';
    return 'Confirmer que la pharmacie est ouverte';
  }, [disabled, disabledLabel, phase]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: blockPress }}
      disabled={blockPress}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          borderRadius: radii.button,
          paddingVertical: 16,
          paddingHorizontal: 20,
          backgroundColor: disabled ? t.surfaceAlt : t.primary,
          borderWidth: disabled ? 1 : 0,
          borderColor: disabled ? t.border : 'transparent',
          opacity: disabled ? 0.88 : pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <View className="min-h-[52px] flex-row flex-wrap items-center justify-center gap-2">
        {disabled ? (
          <Text
            className="text-center text-[15px] font-semibold"
            style={{ color: t.textSoft }}
          >
            {disabledLabel}
          </Text>
        ) : null}

        {!disabled && phase === 'loading' ? (
          <>
            <ActivityIndicator color={onPrimaryLabel} size="small" />
            <Text
              className="text-[15px] font-semibold"
              style={{ color: onPrimaryLabel }}
            >
              Envoi…
            </Text>
          </>
        ) : null}

        {!disabled && phase === 'success' ? (
          <Animated.View entering={ZoomIn.duration(480).springify()}>
            <Text
              className="text-center text-[16px] font-bold"
              style={{ color: onPrimaryLabel }}
            >
              🎉 +5 points !
            </Text>
          </Animated.View>
        ) : null}

        {!disabled && phase === 'error' ? (
          <View className="items-center">
            <Text
              className="text-center text-[15px] font-semibold"
              style={{ color: onPrimaryLabel }}
            >
              Réessayer — tap pour relancer
            </Text>
            <Text
              className="mt-1 text-center text-[14px] font-medium"
              style={{ color: 'rgba(255,255,255,0.92)' }}
              numberOfLines={3}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {!disabled && phase === 'idle' ? (
          <Text
            className="text-center text-[16px] font-bold"
            style={{ color: onPrimaryLabel }}
          >
            ✅ Confirmer que c&apos;est ouvert
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
