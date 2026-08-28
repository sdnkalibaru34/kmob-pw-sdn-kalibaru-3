import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { jakartaDate, validDate } from '@/lib/date';
import { ownDefaultShift, submitAbsenceRequest } from '@/lib/data';
import { scheduleText } from '@/lib/schedule';
import type { AbsenceStatus, ShiftLabel } from '@/lib/types';

const statuses: AbsenceStatus[] = ['Izin','Sakit','Cuti','Dinas Luar'];

export default function AbsenceRequest() {
  const [startDate,setStartDate]=useState(jakartaDate());
  const [endDate,setEndDate]=useState(jakartaDate());
  const [status,setStatus]=useState<AbsenceStatus>('Izin');
  const [shift,setShift]=useState<ShiftLabel>('Pagi');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{void ownDefaultShift().then(setShift).catch(()=>setMessage('Shift belum dapat dimuat.'))},[]);
  const save=async()=>{
    if(!validDate(startDate)||!validDate(endDate))return setMessage('Tanggal harus berformat YYYY-MM-DD.');
    if(endDate<startDate)return setMessage('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    if(!scheduleText(startDate,shift)&&startDate===endDate)return setMessage('Minggu bukan hari kerja.');
    if(!note.trim())return setMessage('Keterangan pengajuan wajib diisi.');
    setBusy(true);setMessage('');
    try{const total=await submitAbsenceRequest({startDate,endDate,status,note,shiftLabel:shift});setMessage(`Pengajuan ${status} berhasil disimpan untuk ${total} hari kerja.`)}
    catch(error){setMessage(error instanceof Error?error.message:'Pengajuan belum dapat disimpan.')}
    finally{setBusy(false)}
  };
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.title}>Pengajuan Tidak Hadir</Text><Text style={s.info}>Untuk izin, sakit, cuti, atau dinas luar. Shift {shift} menjadi acuan jadwal.</Text>
    <View style={s.dateRow}><View style={s.dateField}><Text style={s.label}>Mulai</Text><TextInput style={s.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View><View style={s.dateField}><Text style={s.label}>Sampai</Text><TextInput style={s.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View></View>
    <Text style={s.label}>Jenis pengajuan</Text><View style={s.chips}>{statuses.map(x=><Pressable key={x} style={[s.chip,status===x&&s.chipOn]} onPress={()=>setStatus(x)}><Text style={status===x?s.chipTextOn:s.chipText}>{x}</Text></Pressable>)}</View>
    <Text style={s.label}>Keterangan</Text><TextInput style={[s.input,s.area]} multiline value={note} onChangeText={setNote} placeholder="Tuliskan alasan atau keterangan" />
    {!!message&&<Text style={s.message}>{message}</Text>}<Pressable disabled={busy} style={[s.button,busy&&s.disabled]} onPress={save}><Text style={s.buttonText}>{busy?'Menyimpan…':'Kirim Pengajuan'}</Text></Pressable>
  </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:56,paddingBottom:48,gap:12},title:{fontSize:28,fontWeight:'900',color:'#18794e'},info:{lineHeight:21,color:'#526158',marginBottom:5},dateRow:{flexDirection:'row',gap:10},dateField:{flex:1,gap:6},label:{fontWeight:'700',marginTop:3},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:13,backgroundColor:'#fff',fontSize:16,color:'#1f2a24'},area:{minHeight:105,textAlignVertical:'top'},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingVertical:10,paddingHorizontal:13,borderWidth:1,borderColor:'#bdd0c3',borderRadius:18,backgroundColor:'#fff'},chipOn:{backgroundColor:'#18794e',borderColor:'#18794e'},chipText:{color:'#34473b'},chipTextOn:{color:'#fff',fontWeight:'800'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800'},disabled:{opacity:.5},message:{lineHeight:20,color:'#35453b'}});
