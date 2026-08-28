import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, ViewStyle } from 'react-native';

export default function KeyboardScroll({ children, style, contentContainerStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle> }) {
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={8}>
    <ScrollView style={style} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles={flex:{flex:1}};
