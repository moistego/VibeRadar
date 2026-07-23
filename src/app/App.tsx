import React, {useEffect, useState} from 'react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {store, persistor} from '@/state/store';
import {RootNavigator} from '@/app/navigation/RootNavigator';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthService} from '@/services/auth/AuthService';
import {colors} from '@/presentation/theme';

const AppInitializer: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    AuthService.initialize().finally(() => setAuthReady(true));
  }, []);

  if (!authReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />

      </View>
      );
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
    <SafeAreaProvider>
    <AppInitializer>
    <RootNavigator />
    </AppInitializer>
    </SafeAreaProvider>
    </PersistGate>
    </Provider>
    );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
