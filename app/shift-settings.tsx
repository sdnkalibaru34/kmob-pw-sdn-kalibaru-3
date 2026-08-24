import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ownDefaultShift, updateOwnDefaultShift } from '@/lib/data';
import type { ShiftLabel } from '@/lib/types';

const shifts:ShiftLabel[]=['Pagi','Siang'];
export default function ShiftSettings(){
  const [shift,setShift]=useState<ShiftLabel>('Pagi');
  const [busy,setBusy]=useState(true);
  const [message,setMessage]=useState('');
  useEffect(()=>{void ownDefaultShift().then(setShift).catch(()=>setMessage('Shift utama belum dapat dimuat.')).finally(()=>setBusy(false))},[]);
  const save=async()=>{setBusy(true);setMessage('');try{await updateOwnDefaultShift(shift);setMessage(`Shift utama berhasil diubah menjadi ${shift}.`) }catch{setMessage('Shift utama belum dapat diubah. Coba kembali.')}finally{setBusy(false)}};
  return <View style={s.page}><Text style={s.title}>Shift Saya</Text><Text style={s.info}>Shift ini otomatis dipilih saat membuka form absensi. Perubahan tidak mengubah riwayat absensi yang sudah tersimpan.</Text>
    <View style={s.row}>{shifts.map(x=><Pressable key={x} style={[s.choice,shift===x&&s.choiceOn]} onPress={()=>setShift(x)}><Text style={shift===x?s.textOn:s.text}>{x}</Text></Pressable>)}</View>
    <Text style={s.schedule}>{shift==='Pagi'?'Senin–Jumat 06.30–14.30 · Sabtu 06.30–11.30':'Senin–Jumat 09.00–17.00 · Sabtu 09.00–14.00'}</Text>
    {!!message&&<Text style={s.message}>{message}</Text>}<Pressable disabled={busy} style={s.button} onPress={save}><Text style={s.buttonText}>{busy?'Memuat…':'Simpan Shift Utama'}</Text></Pressable>
  </View>
}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,gap:16,backgroundColor:'#f7faf8'},title:{fontSize:28,fontWeight:'900',color:'#18794e'},info:{lineHeight:22,color:'#526158'},row:{flexDirection:'row',gap:10},choice:{flex:1,padding:18,borderRadius:14,borderWidth:1,borderColor:'#bdd0c3',backgroundColor:'#fff',alignItems:'center'},choiceOn:{backgroundColor:'#18794e',borderColor:'#18794e'},text:{fontSize:17,fontWeight:'700',color:'#34473b'},textOn:{fontSize:17,fontWeight:'800',color:'#fff'},schedule:{lineHeight:21,fontWeight:'700',color:'#35453b'},message:{lineHeight:20,color:'#35453b'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800'}});
