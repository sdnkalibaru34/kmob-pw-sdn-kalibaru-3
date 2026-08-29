import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ownWorkPreference, updateOwnWorkPreference } from '@/lib/data';
import type { ShiftLabel, WorkPattern } from '@/lib/types';

const shifts:ShiftLabel[]=['Pagi','Siang'];
export default function ShiftSettings(){
  const [shift,setShift]=useState<ShiftLabel>('Pagi');
  const [workPattern,setWorkPattern]=useState<WorkPattern>('Opsi 1');
  const [busy,setBusy]=useState(true);
  const [message,setMessage]=useState('');
  useEffect(()=>{void ownWorkPreference().then(value=>{setShift(value.shift);setWorkPattern(value.workPattern)}).catch(()=>setMessage('Pengaturan jam kerja belum dapat dimuat.')).finally(()=>setBusy(false))},[]);
  const save=async()=>{setBusy(true);setMessage('');try{await updateOwnWorkPreference(shift,workPattern);setMessage(`${workPattern} · shift ${shift} berhasil disimpan.`) }catch{setMessage('Pengaturan jam kerja belum dapat diubah. Coba kembali.')}finally{setBusy(false)}};
  return <View style={s.page}><Text style={s.title}>Jam Kerja Saya</Text><Text style={s.info}>Pilih pola hari kerja dan shift. Pilihan menjadi acuan jam masuk, jam pulang, keterlambatan, dan pulang terlalu cepat.</Text>
    <Text style={s.label}>Pola hari kerja</Text><View style={s.patterns}>{(['Opsi 1','Opsi 2'] as WorkPattern[]).map(x=><Pressable key={x} style={[s.pattern,workPattern===x&&s.choiceOn]} onPress={()=>setWorkPattern(x)}><Text style={workPattern===x?s.textOn:s.patternTitle}>{x}</Text><Text style={workPattern===x?s.patternInfoOn:s.patternInfo}>{x==='Opsi 1'?'5 hari · Senin–Jumat':'6 hari · Senin–Sabtu'}</Text></Pressable>)}</View>
    <Text style={s.label}>Shift</Text>
    <View style={s.row}>{shifts.map(x=><Pressable key={x} style={[s.choice,shift===x&&s.choiceOn]} onPress={()=>setShift(x)}><Text style={shift===x?s.textOn:s.text}>{x}</Text></Pressable>)}</View>
    <Text style={s.schedule}>{workPattern==='Opsi 1'?(shift==='Pagi'?'Senin–Jumat 06.30–14.30 · Sabtu libur':'Senin–Jumat 09.00–17.00 · Sabtu libur'):(shift==='Pagi'?'Senin–Sabtu 06.30–13.00':'Senin–Sabtu 10.30–17.00')}</Text>
    {!!message&&<Text style={s.message}>{message}</Text>}<Pressable disabled={busy} style={s.button} onPress={save}><Text style={s.buttonText}>{busy?'Memuat…':'Simpan Jam Kerja'}</Text></Pressable>
  </View>
}
const s=StyleSheet.create({page:{flex:1,padding:24,paddingTop:64,gap:14,backgroundColor:'#f7faf8'},title:{fontSize:28,fontWeight:'900',color:'#18794e'},info:{lineHeight:22,color:'#526158'},label:{fontWeight:'800',color:'#35453b',marginTop:4},patterns:{gap:9},pattern:{padding:15,borderRadius:14,borderWidth:1,borderColor:'#bdd0c3',backgroundColor:'#fff',gap:4},patternTitle:{fontSize:17,fontWeight:'800',color:'#34473b'},patternInfo:{color:'#647168'},patternInfoOn:{color:'#e6f4eb'},row:{flexDirection:'row',gap:10},choice:{flex:1,padding:18,borderRadius:14,borderWidth:1,borderColor:'#bdd0c3',backgroundColor:'#fff',alignItems:'center'},choiceOn:{backgroundColor:'#18794e',borderColor:'#18794e'},text:{fontSize:17,fontWeight:'700',color:'#34473b'},textOn:{fontSize:17,fontWeight:'800',color:'#fff'},schedule:{lineHeight:21,fontWeight:'700',color:'#35453b'},message:{lineHeight:20,color:'#35453b'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800'}});
