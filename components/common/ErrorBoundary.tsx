import { type ErrorInfo, type ReactNode, Component } from 'react';
import { Appearance, Pressable, Text, View } from 'react-native';

import { theme } from '@/lib/constants';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Boundary d’erreur par écran — fallback + réessai (specs prod).
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  public state: State = { error: null };

  public static getDerivedStateFromError(err: Error): State {
    return { error: err };
  }

  public componentDidCatch(_error: Error, _info: ErrorInfo): void {
    /* Erreur déjà reflétée dans l’UI ; logging central possible ici */
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  public render(): ReactNode {
    if (this.state.error !== null) {
      const t =
        Appearance.getColorScheme() === 'dark' ? theme.night : theme.day;
      return (
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: t.bg }}
          accessibilityRole="none"
        >
          <Text
            className="text-center text-[16px] font-semibold leading-6"
            style={{ color: t.danger }}
            accessibilityRole="alert"
            maxFontSizeMultiplier={1.35}
          >
            Un problème est survenu. Vous pouvez réessayer.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Réessayer après une erreur"
            onPress={this.handleRetry}
            className="mt-6 rounded-[14px] px-6 py-3"
            style={{ backgroundColor: t.primary }}
          >
            <Text className="text-[16px] font-bold text-white">Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
