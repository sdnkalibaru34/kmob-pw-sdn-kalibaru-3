import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, TextInput } from 'react-native';
import { useFonts, Inter_400Regular } from '@expo-google-fonts/inter';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular });
  if (!fontsLoaded) return null;
  const androidTextSize = Platform.OS === 'android' ? { fontSize: 16 } : {};
  (Text as any).defaultProps = { ...(Text as any).defaultProps, style: [{ fontFamily: 'Inter_400Regular', ...androidTextSize }, (Text as any).defaultProps?.style] };
  (TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, style: [{ fontFamily: 'Inter_400Regular', ...androidTextSize }, (TextInput as any).defaultProps?.style] };
  return <><StatusBar style="auto" /><Stack screenOptions={{ headerShown: false }} /></>;
}
