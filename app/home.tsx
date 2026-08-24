import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

const menu=[['Absen Hari Ini','/attendance'],['Lihat Rekap & Kekurangan','/recap'],['Laporan Harian','/reports'],['Ganti Kata Sandi','/change-password'],['Kebijakan Privasi','/privacy']] as const;
export default function Home(){return <View style={s.page}><Text style={s.title}>MBOK PPPK PW</Text><Text style={s.sub}>SDN Kalibaru 3</Text>{menu.map(([label,path])=><Pressable key={path} style={s.menu} onPress={()=>router.push(path)}><Text style={s.menuText}>{label}</Text></Pressable>)}<Pressable onPress={async()=>{await supabase.auth.signOut();router.replace('/login')}}><Text style={s.logout}>Keluar</Text></Pressable></View>}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,backgroundColor:'#f7faf8',gap:14},title:{fontSize:28,fontWeight:'900',color:'#18794e'},sub:{fontSize:16,marginBottom:16},menu:{backgroundColor:'#fff',padding:17,borderRadius:16,borderWidth:1,borderColor:'#dce8df'},menuText:{fontSize:16,fontWeight:'700'},logout:{textAlign:'center',color:'#b42318',padding:18}});
