import { StyleSheet, Text, View } from 'react-native';
export default function Recap(){return <View style={s.page}><Text style={s.title}>Rekap Saya</Text><Text>Kalender akan menandai tanggal lengkap, belum absen masuk, belum absen pulang, dan belum membuat laporan.</Text></View>}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,gap:16,backgroundColor:'#f7faf8'},title:{fontSize:28,fontWeight:'800'}});

