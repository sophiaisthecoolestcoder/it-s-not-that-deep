import React, { useState } from 'react';
import { StatusBar, TouchableOpacity, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';

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
            style={{ paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#F5F5F5' }}
            onPress={navigateToHome}
          >
            <View
              style={{
                backgroundColor: '#4A7C59',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>← Zurück zur Startseite</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaProvider>
  );
}
