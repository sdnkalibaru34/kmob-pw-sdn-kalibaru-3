import { useState } from 'react';
import { Link, router } from 'expo-router';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { employeeCodeToInternalEmail, supabase } from '@/lib/supabase';

export default function Login() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useEmployeeCode, setUseEmployeeCode] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: employeeCodeToInternalEmail(code), password });
    setBusy(false);
    if (error || !data.user) return setMessage('NI PPPK/kode pegawai atau kata sandi tidak sesuai.');
    router.replace(data.user.user_metadata?.must_change_password === true ? '/change-password' : '/home');
  };
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={8}><ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View style={s.card}>
    <Image source={require('../assets/icon.png')} style={s.logo} resizeMode="contain" />
    <Text style={s.tagline}>KW aplikasinya, ori kehadirannya.</Text>
    <Text style={s.brand}>KEMOB KW</Text><Text style={s.title}>Absensi Internal PPPK Paruh Waktu SDN Kalibaru 3</Text>
    <TextInput
      style={s.input}
      placeholder={useEmployeeCode ? 'Kode pegawai' : 'NI PPPK'}
      placeholderTextColor="#7a8780"
      value={code}
      onChangeText={setCode}
      autoCapitalize="none"
      keyboardType={useEmployeeCode ? 'default' : 'number-pad'}
    />
    <Pressable onPress={() => { setUseEmployeeCode((value) => !value); setCode(''); }}>
      <Text style={s.codeMode}>{useEmployeeCode ? 'Gunakan NI PPPK' : 'Tidak punya NI PPPK? Gunakan kode pegawai'}</Text>
    </Pressable>
    <View style={s.passwordRow}><TextInput
      style={s.passwordInput}
      placeholder="Kata sandi"
      placeholderTextColor="#7a8780"
      value={password}
      onChangeText={setPassword}
      secureTextEntry={!showPassword}
    /><Pressable style={s.showButton} onPress={() => setShowPassword(value => !value)}><Text style={s.showText}>{showPassword ? 'Sembunyikan' : 'Tampilkan'}</Text></Pressable></View>
    <Link href="/forgot-password" style={s.forgot}>Lupa kata sandi?</Link>
    {!!message && <Text style={s.error}>{message}</Text>}
    <Pressable style={s.button} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Masuk</Text>}</Pressable>
    <Text style={s.disclaimer}>Aplikasi internal SDN Kalibaru 3. Bukan aplikasi resmi KMOB dan tidak berafiliasi dengan pengelola KMOB.</Text>
    <Link href="/privacy" style={s.link}>Kebijakan Privasi</Link>
  </View></ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#eef7f0'},scrollContent:{flexGrow:1,justifyContent:'center',padding:24,paddingVertical:32},card:{maxWidth:420,width:'100%',alignSelf:'center',backgroundColor:'#fff',padding:24,borderRadius:20,gap:12},logo:{width:112,height:112,alignSelf:'center',borderRadius:25},tagline:{textAlign:'center',color:'#526158',fontSize:13,fontStyle:'italic',marginBottom:3},brand:{fontSize:36,fontWeight:'900',color:'#18794e',textAlign:'center'},title:{fontSize:16,fontWeight:'700',marginBottom:8,color:'#1f2a24',textAlign:'center',lineHeight:22},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:14,fontSize:16,color:'#1f2a24',backgroundColor:'#fff'},passwordRow:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,backgroundColor:'#fff'},passwordInput:{flex:1,padding:14,fontSize:16,color:'#1f2a24'},showButton:{paddingHorizontal:13,paddingVertical:15},showText:{color:'#18794e',fontWeight:'700',fontSize:12},forgot:{color:'#18794e',fontWeight:'700',fontSize:12,textAlign:'right',marginTop:-5},codeMode:{color:'#18794e',fontWeight:'600',fontSize:13,marginTop:-4},button:{backgroundColor:'#18794e',borderRadius:12,padding:15,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700',fontSize:16},error:{color:'#b42318'},disclaimer:{fontSize:12,lineHeight:17,color:'#66736b',textAlign:'center'},link:{color:'#18794e',fontWeight:'700',textAlign:'center'}});
