import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { jakartaDate } from '@/lib/date';
import { ownAttendance, workCalendar } from '@/lib/data';
import { checkInResult, checkOutResult } from '@/lib/schedule';

type Item={date:string;state:string;detail:string};
export default function Recap(){
 const [items,setItems]=useState<Item[]>([]);const [busy,setBusy]=useState(true);const [message,setMessage]=useState('');
 const load=async()=>{setBusy(true);setMessage('');try{
   const today=jakartaDate();const from=today.slice(0,8)+'01';
   const [calendar,attendance]=await Promise.all([workCalendar(from,today),ownAttendance(from,today)]);
   const map=new Map(attendance.map(a=>[a.attendance_date,a]));
   setItems(calendar.map(day=>{const a=map.get(day.work_date);if(!a)return{date:day.work_date,state:day.work_date<today?'Tanpa Keterangan':'Belum absen',detail:day.description??'Hari kerja'};
     if(['Izin','Sakit','Cuti','Dinas Luar'].includes(a.status))return{date:day.work_date,state:a.status,detail:'Pengajuan Tidak Hadir'};
     if(!a.check_in)return{date:day.work_date,state:day.work_date<today?'Tanpa Keterangan':'Belum absen masuk',detail:'Belum ada jam masuk'};
     if(!a.check_out)return{date:day.work_date,state:'Belum absen pulang',detail:`Masuk ${a.check_in.slice(0,5)} · ${checkInResult(a.late_minutes)}`};
     return{date:day.work_date,state:'Absensi lengkap',detail:`${a.check_in.slice(0,5)}–${a.check_out.slice(0,5)} · ${checkInResult(a.late_minutes)} · Pulang ${checkOutResult(a.early_leave_minutes).toLowerCase()}`};}));
 }catch{setMessage('Rekap belum dapat dimuat.')}finally{setBusy(false)}};
 useEffect(()=>{void load()},[]);
 return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>Rekap Saya</Text><Text>Periode bulan berjalan sampai hari ini.</Text>
 <Pressable style={s.reload} onPress={load}><Text style={s.reloadText}>{busy?'Memuat…':'Muat Ulang'}</Text></Pressable>
 {!!message&&<Text>{message}</Text>}{!busy&&items.length===0&&<Text>Kalender kerja belum diisi admin.</Text>}
 {items.map(x=><Pressable key={x.date} style={s.card} onPress={()=>router.push({pathname:'/attendance',params:{date:x.date}})}><View style={s.left}><Text style={s.date}>{x.date}</Text><Text style={s.detail}>{x.detail}</Text></View><View style={s.right}><Text style={[s.state,x.state==='Absensi lengkap'&&s.ok]}>{x.state}</Text><Text style={s.open}>Buka</Text></View></Pressable>)}
 </ScrollView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:64,paddingBottom:48,gap:12},title:{fontSize:28,fontWeight:'800'},reload:{alignSelf:'flex-start',paddingVertical:10,paddingHorizontal:14,borderRadius:10,backgroundColor:'#e3f2e8'},reloadText:{color:'#18794e',fontWeight:'700'},card:{backgroundColor:'#fff',padding:15,borderRadius:14,borderWidth:1,borderColor:'#e0e9e3',flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},left:{flex:1},right:{alignItems:'flex-end',gap:3,maxWidth:135},date:{fontWeight:'800'},detail:{color:'#647168',marginTop:3,lineHeight:18},state:{color:'#b42318',fontWeight:'800',textAlign:'right'},ok:{color:'#18794e'},open:{fontSize:12,color:'#526158'}});
