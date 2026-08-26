import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { jakartaDate, jakartaTime, validDate, validTime } from '@/lib/date';
import { ownAttendance, ownDefaultShift, saveAttendance } from '@/lib/data';
import type { AttendanceStatus, ShiftLabel } from '@/lib/types';

const statuses: AttendanceStatus[]=['Hadir','Izin','Sakit','Cuti','Dinas Luar','Tanpa Keterangan'];

function scheduleFor(date:string,shift:ShiftLabel){
  if(!validDate(date)) return null;
  const day=new Date(`${date}T00:00:00`).getDay();
  if(day===0) return null;
  if(day===6) return shift==='Pagi'?'06:30–11:30':'09:00–14:00';
  return shift==='Pagi'?'06:30–14:30':'09:00–17:00';
}
export default function Attendance(){
  const params=useLocalSearchParams<{date?:string}>();
  const initialDate=typeof params.date==='string'&&validDate(params.date)?params.date:jakartaDate();
  const [date,setDate]=useState(initialDate);
  const [checkIn,setCheckIn]=useState(initialDate===jakartaDate()?jakartaTime():'');
  const [checkOut,setCheckOut]=useState('');
  const [shiftLabel,setShiftLabel]=useState<ShiftLabel>('Pagi');
  const [status,setStatus]=useState<AttendanceStatus>('Hadir');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const loadSequence=useRef(0);
  useEffect(()=>{void ownDefaultShift().then(setShiftLabel).catch(()=>setMessage('Shift utama belum dapat dimuat; sementara dipilih Pagi.'))},[]);
  useEffect(()=>{
    if(!validDate(date))return;
    const sequence=++loadSequence.current;
    void ownAttendance(date,date).then(rows=>{
      if(sequence!==loadSequence.current)return;
      const existing=rows[0];
      if(existing){
        setCheckIn(existing.check_in?.slice(0,5)??'');setCheckOut(existing.check_out?.slice(0,5)??'');setShiftLabel(existing.shift_label);setStatus(existing.status);setNote(existing.note??'');setMessage('Data tanggal ini sudah ada dan dapat diperbarui.');
      }else{
        setCheckIn(date===jakartaDate()?jakartaTime():'');setCheckOut('');setStatus('Hadir');setNote('');setMessage('Belum ada absensi pada tanggal ini. Silakan lengkapi lalu simpan.');
      }
    }).catch(()=>{if(sequence===loadSequence.current)setMessage('Data absensi tanggal ini belum dapat dimuat.')});
  },[date]);
  const save=async()=>{
    if(!validDate(date)) return setMessage('Tanggal harus berformat YYYY-MM-DD.');
    if(!scheduleFor(date,shiftLabel)) return setMessage('Minggu bukan hari kerja. Pilih tanggal Senin–Sabtu.');
    if(!validTime(checkIn)||!validTime(checkOut)) return setMessage('Jam harus berformat HH:MM.');
    if(checkIn&&checkOut&&checkOut<checkIn) return setMessage('Jam pulang tidak boleh lebih awal dari jam masuk.');
    setBusy(true);setMessage('');
    try{await saveAttendance({date,checkIn,checkOut,shiftLabel,status,note});setMessage('Absensi berhasil disimpan. Jadwal dan keterlambatan dihitung otomatis.')}
    catch{setMessage('Absensi belum dapat disimpan. Pastikan akun sudah aktif.')}
    finally{setBusy(false)}
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>Absensi</Text>
    <Text style={s.label}>Tanggal</Text><TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
    <Text style={s.label}>Shift</Text><View style={s.chips}>{(['Pagi','Siang'] as ShiftLabel[]).map(x=><Pressable key={x} style={[s.chip,shiftLabel===x&&s.chipOn]} onPress={()=>setShiftLabel(x)}><Text style={shiftLabel===x?s.chipTextOn:s.chipText}>{x}</Text></Pressable>)}</View>
    <Text style={s.schedule}>{scheduleFor(date,shiftLabel)?`Jadwal: ${scheduleFor(date,shiftLabel)}`:'Tidak ada jadwal kerja pada hari Minggu'}</Text>
    <View style={s.row}><View style={s.half}><Text style={s.label}>Jam masuk</Text><TextInput style={s.input} value={checkIn} onChangeText={setCheckIn} placeholder="HH:MM" /></View>
    <View style={s.half}><Text style={s.label}>Jam pulang</Text><TextInput style={s.input} value={checkOut} onChangeText={setCheckOut} placeholder="HH:MM" /></View></View>
    <Text style={s.label}>Status</Text><View style={s.chips}>{statuses.map(x=><Pressable key={x} style={[s.chip,status===x&&s.chipOn]} onPress={()=>setStatus(x)}><Text style={status===x?s.chipTextOn:s.chipText}>{x}</Text></Pressable>)}</View>
    <Text style={s.label}>Catatan</Text><TextInput style={[s.input,s.area]} multiline value={note} onChangeText={setNote} placeholder="Opsional" />
    {!!message&&<Text style={s.message}>{message}</Text>}<Pressable style={s.button} disabled={busy} onPress={save}><Text style={s.buttonText}>{busy?'Menyimpan…':'Simpan Absensi'}</Text></Pressable>
  </ScrollView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:64,paddingBottom:48,gap:10},title:{fontSize:28,fontWeight:'800',marginBottom:8},label:{fontWeight:'700',marginTop:5},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:13,backgroundColor:'#fff',fontSize:16},schedule:{color:'#18794e',fontWeight:'700'},row:{flexDirection:'row',gap:10},half:{flex:1,gap:8},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingVertical:9,paddingHorizontal:12,borderWidth:1,borderColor:'#bdd0c3',borderRadius:18,backgroundColor:'#fff'},chipOn:{backgroundColor:'#18794e',borderColor:'#18794e'},chipText:{color:'#34473b'},chipTextOn:{color:'#fff',fontWeight:'700'},area:{minHeight:90,textAlignVertical:'top'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center',marginTop:8},buttonText:{color:'#fff',fontWeight:'800'},message:{lineHeight:20,color:'#35453b'}});
