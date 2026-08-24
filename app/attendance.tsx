import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { jakartaDate, jakartaTime, validDate, validTime } from '@/lib/date';
import { saveAttendance } from '@/lib/data';
import type { AttendanceStatus } from '@/lib/types';

const statuses: AttendanceStatus[]=['Hadir','Izin','Sakit','Cuti','Dinas Luar','Tanpa Keterangan'];
export default function Attendance(){
  const [date,setDate]=useState(jakartaDate());
  const [checkIn,setCheckIn]=useState(jakartaTime());
  const [checkOut,setCheckOut]=useState('');
  const [status,setStatus]=useState<AttendanceStatus>('Hadir');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const save=async()=>{
    if(!validDate(date)) return setMessage('Tanggal harus berformat YYYY-MM-DD.');
    if(!validTime(checkIn)||!validTime(checkOut)) return setMessage('Jam harus berformat HH:MM.');
    if(checkIn&&checkOut&&checkOut<checkIn) return setMessage('Jam pulang tidak boleh lebih awal dari jam masuk.');
    setBusy(true);setMessage('');
    try{await saveAttendance({date,checkIn,checkOut,status,note});setMessage('Absensi berhasil disimpan. Data pada tanggal yang sama akan diperbarui.')}
    catch{setMessage('Absensi belum dapat disimpan. Pastikan akun sudah aktif.')}
    finally{setBusy(false)}
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>Absensi</Text>
    <Text style={s.label}>Tanggal</Text><TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
    <View style={s.row}><View style={s.half}><Text style={s.label}>Jam masuk</Text><TextInput style={s.input} value={checkIn} onChangeText={setCheckIn} placeholder="HH:MM" /></View>
    <View style={s.half}><Text style={s.label}>Jam pulang</Text><TextInput style={s.input} value={checkOut} onChangeText={setCheckOut} placeholder="HH:MM" /></View></View>
    <Text style={s.label}>Status</Text><View style={s.chips}>{statuses.map(x=><Pressable key={x} style={[s.chip,status===x&&s.chipOn]} onPress={()=>setStatus(x)}><Text style={status===x?s.chipTextOn:s.chipText}>{x}</Text></Pressable>)}</View>
    <Text style={s.label}>Catatan</Text><TextInput style={[s.input,s.area]} multiline value={note} onChangeText={setNote} placeholder="Opsional" />
    {!!message&&<Text style={s.message}>{message}</Text>}<Pressable style={s.button} disabled={busy} onPress={save}><Text style={s.buttonText}>{busy?'Menyimpan…':'Simpan Absensi'}</Text></Pressable>
  </ScrollView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:64,paddingBottom:48,gap:10},title:{fontSize:28,fontWeight:'800',marginBottom:8},label:{fontWeight:'700',marginTop:5},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:13,backgroundColor:'#fff',fontSize:16},row:{flexDirection:'row',gap:10},half:{flex:1,gap:8},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingVertical:9,paddingHorizontal:12,borderWidth:1,borderColor:'#bdd0c3',borderRadius:18,backgroundColor:'#fff'},chipOn:{backgroundColor:'#18794e',borderColor:'#18794e'},chipText:{color:'#34473b'},chipTextOn:{color:'#fff',fontWeight:'700'},area:{minHeight:90,textAlignVertical:'top'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center',marginTop:8},buttonText:{color:'#fff',fontWeight:'800'},message:{lineHeight:20,color:'#35453b'}});
