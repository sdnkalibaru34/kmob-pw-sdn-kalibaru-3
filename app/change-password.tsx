import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (password.length < 10) return setMessage('Gunakan minimal 10 karakter.');
    if (password !== confirm) return setMessage('Konfirmasi kata sandi tidak sama.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setBusy(false);
    if (error) return setMessage('Kata sandi belum dapat diubah. Coba kembali.');
    await supabase.auth.signOut({ scope: 'others' });
    setMessage('Kata sandi berhasil diubah.');
    setTimeout(() => router.replace('/home'), 800);
  };
  return <View style={s.page}><Text style={s.title}>Ganti Kata Sandi</Text>
    <Text style={s.info}>Minimal 10 karakter. Jangan gunakan NI PPPK, tanggal lahir, atau kata sandi yang sama dengan akun lain.</Text>
    <TextInput style={s.input} placeholder="Kata sandi baru" secureTextEntry value={password} onChangeText={setPassword} />
    <TextInput style={s.input} placeholder="Ulangi kata sandi baru" secureTextEntry value={confirm} onChangeText={setConfirm} />
    {!!message && <Text style={s.message}>{message}</Text>}
    <Pressable style={s.button} disabled={busy} onPress={save}><Text style={s.buttonText}>{busy ? 'Menyimpan…' : 'Simpan'}</Text></Pressable>
  </View>;
}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,gap:15,backgroundColor:'#f7faf8'},title:{fontSize:28,fontWeight:'800'},info:{lineHeight:21,color:'#526158'},input:{borderWidth:1,borderColor:'#cfd8d3',backgroundColor:'#fff',borderRadius:12,padding:14,fontSize:16},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700'},message:{color:'#33443a'}});
