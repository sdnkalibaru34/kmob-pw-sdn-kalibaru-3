import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { jakartaDate, validDate } from '@/lib/date';
import { currentEmployee, ownAttendance, ownWorkPreference, workCalendarAll } from '@/lib/data';
import { checkInResult, checkOutResult, scheduleText } from '@/lib/schedule';
import { supabase } from '@/lib/supabase';

type Item={date:string;state:string;detail:string;workday:boolean};
const currentMonth=()=>jakartaDate().slice(0,7);
const monthRange=(month:string)=>{const [year,value]=month.split('-').map(Number);const last=new Date(year,value,0).getDate();return{from:`${month}-01`,to:`${month}-${String(last).padStart(2,'0')}`,last}};
const monthLabel=(month:string)=>new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(`${month}-15T12:00:00`));

export default function Recap(){
 const [month,setMonth]=useState(currentMonth);
 const [items,setItems]=useState<Item[]>([]);
 const [busy,setBusy]=useState(true);
 const [message,setMessage]=useState('');
 const [picker,setPicker]=useState(false);

 const load=useCallback(async(selected=month)=>{
  setBusy(true);setMessage('');
  try{
   const {from,to,last}=monthRange(selected);
   const today=jakartaDate();
   const preference=await ownWorkPreference();
   const [calendar,attendance]=await Promise.all([
    workCalendarAll(from,to),
    ownAttendance(from,to),
   ]);
   const calendarMap=new Map(calendar.map(day=>[day.work_date,day]));
   const attendanceMap=new Map(attendance.map(row=>[row.attendance_date,row]));
   const days:Item[]=Array.from({length:last},(_,index)=>{
    const dayNumber=index+1;
    const date=`${selected}-${String(dayNumber).padStart(2,'0')}`;
    const dateObject=new Date(`${date}T12:00:00`);
    const dayOfWeek=dateObject.getDay();
    const calendarDay=calendarMap.get(date);
    const weekendOff=dayOfWeek===0||(preference.workPattern==='Opsi 1'&&dayOfWeek===6);
    const workday=!!calendarDay?.is_workday&&!weekendOff;
    if(!workday){
     const label=weekendOff?'Libur':calendarDay?.description??'Kalender belum diatur';
     return{date,state:label,detail:weekendOff?'Tidak ada jadwal kerja':calendarDay?.description??'Tanggal ini belum ditetapkan sebagai hari kerja',workday:false};
    }
    const row=attendanceMap.get(date);
    if(!row)return{date,state:date<today?'Tanpa Keterangan':'Belum absen',detail:date<today?'Absensi pada hari kerja ini belum tercatat':'Hari kerja · belum ada data absensi',workday:true};
    if(['Izin','Sakit','Cuti','Dinas Luar'].includes(row.status))return{date,state:row.status,detail:'Pengajuan Tidak Hadir',workday:true};
    if(!row.check_in)return{date,state:date<today?'Tanpa Keterangan':'Belum absen masuk',detail:'Belum ada jam masuk',workday:true};
    if(!row.check_out)return{date,state:'Belum absen pulang',detail:`Masuk ${row.check_in.slice(0,5)} · ${checkInResult(row.late_minutes)}`,workday:true};
    return{date,state:'Absensi lengkap',detail:`${row.check_in.slice(0,5)}–${row.check_out.slice(0,5)} · ${checkInResult(row.late_minutes)} · Pulang ${checkOutResult(row.early_leave_minutes).toLowerCase()}`,workday:true};
   });
   setItems(days);
  }catch{setMessage('Rekap belum dapat dimuat. Periksa koneksi lalu buka kembali halaman ini.')}
  finally{setBusy(false)}
 },[month]);

 useFocusEffect(useCallback(()=>{void load(month)},[load,month]));

 useEffect(()=>{
  let active=true;
  let channel:ReturnType<typeof supabase.channel>|null=null;
  void currentEmployee().then(employee=>{
   if(!active)return;
   channel=supabase.channel(`recap-live-${employee.id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'attendance',filter:`employee_id=eq.${employee.id}`},()=>{void load(month)})
    .on('postgres_changes',{event:'*',schema:'public',table:'daily_reports',filter:`employee_id=eq.${employee.id}`},()=>{void load(month)})
    .on('postgres_changes',{event:'*',schema:'public',table:'work_calendar'},()=>{void load(month)})
    .subscribe();
  }).catch(()=>undefined);
  return()=>{active=false;if(channel)void supabase.removeChannel(channel)};
 },[load,month]);

 const chooseMonth=(_event:DateTimePickerEvent,value?:Date)=>{
  setPicker(false);
  if(!value)return;
  const selected=`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}`;
  if(/^\d{4}-\d{2}$/.test(selected))setMonth(selected);
 };

 return <ScrollView style={s.page} contentContainerStyle={s.content}>
  <Text style={s.title}>Rekap Saya</Text>
  <Text style={s.intro}>Pilih bulan untuk melihat seluruh tanggal dan melengkapi absensi yang masih kurang.</Text>
  <Pressable style={s.monthButton} onPress={()=>setPicker(true)}><Text style={s.monthText}>Bulan: {monthLabel(month)}</Text><Text style={s.chevron}>⌄</Text></Pressable>
  {picker&&<DateTimePicker value={new Date(`${month}-15T12:00:00`)} mode="date" display="calendar" onChange={chooseMonth}/>}
  <Pressable style={s.print} onPress={()=>router.push('/personal-monthly-recap')}><Text style={s.printText}>Cetak / Download Rekap Bulanan</Text></Pressable>
  {!!message&&<Text style={s.message}>{message}</Text>}
  {busy&&items.length===0&&<Text style={s.muted}>Memuat kalender absensi…</Text>}
  {!busy&&items.length===0&&<Text>Kalender kerja belum diisi admin.</Text>}
  {items.map(x=>{
   const noInfo=x.state==='Tanpa Keterangan';
   const incomplete=x.state.startsWith('Belum absen');
   const complete=x.state==='Absensi lengkap';
   return <Pressable key={x.date} disabled={!x.workday} style={[s.card,!x.workday&&s.nonWorkday]} onPress={()=>router.push({pathname:'/attendance',params:{date:x.date}})}>
    <View style={s.left}><Text style={s.date}>{x.date}</Text><Text style={s.detail}>{x.detail}</Text></View>
    <View style={s.right}><Text style={[s.state,noInfo&&s.noInfo,incomplete&&s.incomplete,complete&&s.complete,!x.workday&&s.off]}>{x.state}</Text>{x.workday&&<Text style={s.open}>Lengkapi / Edit ›</Text>}</View>
   </Pressable>
  })}
 </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:56,paddingBottom:48,gap:12},title:{fontSize:28,fontWeight:'900',color:'#18794e'},intro:{color:'#526158',lineHeight:21},monthButton:{backgroundColor:'#fff',borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},monthText:{fontSize:16,fontWeight:'800',color:'#18794e'},chevron:{fontSize:20,color:'#18794e'},print:{backgroundColor:'#225a91',padding:14,borderRadius:11,alignItems:'center'},printText:{color:'#fff',fontWeight:'800'},message:{color:'#9f3028',fontWeight:'600',lineHeight:20},muted:{color:'#647168'},card:{backgroundColor:'#fff',padding:15,borderRadius:14,borderWidth:1,borderColor:'#e0e9e3',flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},nonWorkday:{backgroundColor:'#f0f3f1',borderColor:'#e3e8e4'},left:{flex:1},right:{alignItems:'flex-end',gap:5,maxWidth:180},date:{fontWeight:'800',color:'#25372c'},detail:{color:'#647168',marginTop:3,lineHeight:18},state:{color:'#7a3e00',fontWeight:'800',textAlign:'right',paddingHorizontal:9,paddingVertical:5,borderRadius:8,overflow:'hidden'},noInfo:{backgroundColor:'#c62828',color:'#fff'},incomplete:{backgroundColor:'#f5c842',color:'#111'},complete:{backgroundColor:'#18794e',color:'#fff'},off:{backgroundColor:'#e3e8e5',color:'#68746d'},open:{fontSize:12,color:'#18794e',fontWeight:'800'}});
