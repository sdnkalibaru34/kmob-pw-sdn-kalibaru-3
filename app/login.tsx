import { useState } from 'react';
import { Link, router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { employeeCodeToInternalEmail, supabase } from '@/lib/supabase';

export default function Login() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: employeeCodeToInternalEmail(code), password });
    setBusy(false);
    if (error || !data.user) return setMessage('NI PPPK/kode pegawai atau kata sandi tidak sesuai.');
    router.replace(data.user.user_metadata?.must_change_password ? '/change-password' : '/home');
  };
  return <View style={s.page}><View style={s.card}>
    <Text style={s.brand}>MBOK</Text><Text style={s.title}>PPPK Paruh Waktu</Text>
    <TextInput style={s.input} placeholder="NI PPPK / kode pegawai" value={code} onChangeText={setCode} autoCapitalize="none" />
    <TextInput style={s.input} placeholder="Kata sandi" value={password} onChangeText={setPassword} secureTextEntry />
    {!!message && <Text style={s.error}>{message}</Text>}
    <Pressable style={s.button} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Masuk</Text>}</Pressable>
    <Text style={s.disclaimer}>Aplikasi internal SDN Kalibaru 3. Bukan aplikasi resmi KMOB dan tidak berafiliasi dengan pengelola KMOB.</Text>
    <Link href="/privacy" style={s.link}>Kebijakan Privasi</Link>
  </View></View>;
}
const s=StyleSheet.create({page:{flex:1,justifyContent:'center',padding:24,backgroundColor:'#eef7f0'},card:{maxWidth:420,width:'100%',alignSelf:'center',backgroundColor:'#fff',padding:24,borderRadius:20,gap:14},brand:{fontSize:40,fontWeight:'900',color:'#18794e'},title:{fontSize:20,fontWeight:'700',marginBottom:8},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:14,fontSize:16},button:{backgroundColor:'#18794e',borderRadius:12,padding:15,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700',fontSize:16},error:{color:'#b42318'},disclaimer:{fontSize:12,lineHeight:17,color:'#66736b',textAlign:'center'},link:{color:'#18794e',fontWeight:'700',textAlign:'center'}});
