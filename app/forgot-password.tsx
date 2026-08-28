import { useState } from 'react';
import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword(){
 const[code,setCode]=useState('');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
 const send=async()=>{const loginCode=code.trim().toLowerCase();if(loginCode.length<3||loginCode.length>30)return setMessage('Masukkan NI PPPK atau kode pegawai yang benar.');setBusy(true);const{error}=await supabase.from('password_reset_requests').insert({login_code:loginCode,status:'pending'});setBusy(false);setMessage(error?'Permintaan belum dapat dikirim. Coba kembali.':'Permintaan reset sudah dicatat. Hubungi admin untuk memperoleh password sementara.')};
 return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.title}>Lupa Kata Sandi</Text><Text style={s.info}>Masukkan NI PPPK atau kode pegawai. Demi keamanan, admin akan memverifikasi dan membuatkan password sementara.</Text><TextInput style={s.input} placeholder="NI PPPK / kode pegawai" value={code} onChangeText={setCode} autoCapitalize="none"/><Pressable style={s.button} disabled={busy} onPress={send}><Text style={s.buttonText}>{busy?'Mengirim…':'Kirim Permintaan Reset'}</Text></Pressable>{!!message&&<Text style={s.message}>{message}</Text>}<Link href="/login" style={s.back}>Kembali ke Login</Link></ScrollView></KeyboardAvoidingView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{flexGrow:1,padding:24,paddingTop:72,gap:16},title:{fontSize:28,fontWeight:'900',color:'#18794e'},info:{color:'#526158',lineHeight:21},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:14,backgroundColor:'#fff',fontSize:16,color:'#1f2a24'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800'},message:{lineHeight:20,color:'#35453b'},back:{textAlign:'center',color:'#18794e',fontWeight:'800',padding:10}});
