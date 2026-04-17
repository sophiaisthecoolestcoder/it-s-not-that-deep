import React, { useState } from 'react';
import { StatusBar, TouchableOpacity, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import { colors, typography } from './src/theme';

type Screen = 'home' | 'chat';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const navigateToChat = () => setCurrentScreen('chat');
  const navigateToHome = () => setCurrentScreen('home');

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {currentScreen === 'home' ? (
        <HomeScreen onNavigateToChat={navigateToChat} />
      ) : (
        <View style={{ flex: 1 }}>
          <ChatScreen />
          <TouchableOpacity
            style={{ paddingBottom: 16, paddingHorizontal: 16, backgroundColor: colors.background }}
            onPress={navigateToHome}
          >
            <View
              style={{
                backgroundColor: colors.brand600,
                paddingVertical: 12,
                borderRadius: 0,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.brand600,
              }}
            >
              <Text style={[typography.button, { color: 'white' }]}>Zurueck zur Startseite</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaProvider>
  );
}
