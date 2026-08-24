import { StyleSheet, Text, View } from 'react-native';
export default function Reports(){return <View style={s.page}><Text style={s.title}>Laporan Harian</Text><Text>Daftar dan formulir kegiatan harian per pegawai akan tampil di sini.</Text></View>}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,gap:16,backgroundColor:'#f7faf8'},title:{fontSize:28,fontWeight:'800'}});

