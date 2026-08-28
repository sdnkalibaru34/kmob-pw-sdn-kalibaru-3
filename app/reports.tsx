import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { jakartaDate, validDate } from '@/lib/date';
import { addDailyReport, ownReports } from '@/lib/data';
import type { DailyReport } from '@/lib/types';
export default function Reports(){
 const [date,setDate]=useState(jakartaDate());const [activity,setActivity]=useState('');const [result,setResult]=useState('');const [note,setNote]=useState('');const [items,setItems]=useState<DailyReport[]>([]);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const load=async()=>{try{setItems(await ownReports())}catch{setMessage('Daftar laporan belum dapat dimuat.')}};
 useEffect(()=>{void load()},[]);
 const save=async()=>{if(!validDate(date))return setMessage('Tanggal harus berformat YYYY-MM-DD.');if(!activity.trim())return setMessage('Kegiatan wajib diisi.');setBusy(true);setMessage('');try{await addDailyReport({date,activity,result,note});setActivity('');setResult('');setNote('');setMessage('Laporan berhasil disimpan.');await load()}catch{setMessage('Laporan belum dapat disimpan.')}finally{setBusy(false)}};
 return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.title}>Laporan Harian</Text>
 <Text style={s.label}>Tanggal</Text><TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"/>
 <Text style={s.label}>Kegiatan</Text><TextInput style={[s.input,s.area]} multiline value={activity} onChangeText={setActivity} placeholder="Uraikan kegiatan yang dilakukan"/>
 <Text style={s.label}>Hasil</Text><TextInput style={s.input} value={result} onChangeText={setResult} placeholder="Hasil kegiatan (opsional)"/>
 <Text style={s.label}>Catatan</Text><TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Catatan tambahan (opsional)"/>
 {!!message&&<Text style={s.message}>{message}</Text>}<Pressable style={s.button} onPress={save} disabled={busy}><Text style={s.buttonText}>{busy?'Menyimpan…':'Simpan Laporan'}</Text></Pressable>
 <Text style={s.subtitle}>Laporan terbaru</Text>{items.map(x=><View key={x.id} style={s.card}><Text style={s.cardDate}>{x.report_date}</Text><Text style={s.cardActivity}>{x.activity}</Text>{!!x.result&&<Text>Hasil: {x.result}</Text>}{!!x.note&&<Text style={s.muted}>{x.note}</Text>}</View>)}
 </ScrollView></KeyboardAvoidingView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:64,paddingBottom:48,gap:10},title:{fontSize:28,fontWeight:'800',marginBottom:8},label:{fontWeight:'700',marginTop:4},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:13,backgroundColor:'#fff',fontSize:16},area:{minHeight:95,textAlignVertical:'top'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center',marginTop:8},buttonText:{color:'#fff',fontWeight:'800'},message:{lineHeight:20},subtitle:{fontSize:20,fontWeight:'800',marginTop:22},card:{backgroundColor:'#fff',padding:15,borderRadius:14,borderWidth:1,borderColor:'#e0e9e3',gap:5},cardDate:{fontWeight:'800',color:'#18794e'},cardActivity:{fontSize:16,fontWeight:'600'},muted:{color:'#647168'}});
