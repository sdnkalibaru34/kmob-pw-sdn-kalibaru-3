import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput } from 'react-native';
import { useFonts, Inter_400Regular } from '@expo-google-fonts/inter';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular });
  if (!fontsLoaded) return null;
  (Text as any).defaultProps = { ...(Text as any).defaultProps, style: [{ fontFamily: 'Inter_400Regular' }, (Text as any).defaultProps?.style] };
  (TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, style: [{ fontFamily: 'Inter_400Regular' }, (TextInput as any).defaultProps?.style] };
  return <><StatusBar style="auto" /><Stack screenOptions={{ headerShown: false }} /></>;
}
