import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
export default function Attendance(){const [today]=useState(new Date().toLocaleDateString('id-ID',{dateStyle:'full'}));return <View style={s.page}><Text style={s.title}>Absensi</Text><Text>{today}</Text><View style={s.card}><Text style={s.note}>Form masuk, pulang, status, catatan, dan koreksi tanggal sebelumnya akan dihubungkan pada tahap berikutnya.</Text></View></View>}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,gap:14,backgroundColor:'#f7faf8'},title:{fontSize:28,fontWeight:'800'},card:{backgroundColor:'#fff',padding:20,borderRadius:16},note:{lineHeight:22}});

