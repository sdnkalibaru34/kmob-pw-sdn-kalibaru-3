import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Attendance, DailyReport, Employee } from '@/lib/types';

type Summary=Employee&{hadir:number;izin:number;sakit:number;cuti:number;dinas:number;tanpa:number;total:number};
export default function Admin(){
 const [allowed,setAllowed]=useState<boolean|null>(null);const [month,setMonth]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}).slice(0,7));const [employees,setEmployees]=useState<Employee[]>([]);const [attendance,setAttendance]=useState<Attendance[]>([]);const [reports,setReports]=useState<DailyReport[]>([]);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const load=async()=>{setBusy(true);setMessage('');try{const{data:user}=await supabase.auth.getUser();const isAdmin=user.user?.app_metadata?.role==='admin';setAllowed(isAdmin);if(!isAdmin)return;
   const from=month+'-01';const last=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();const to=month+'-'+String(last).padStart(2,'0');
   const[e,a,r]=await Promise.all([
    supabase.from('employees').select('id,employee_code,full_name,position,ni_pppk').eq('is_active',true).order('full_name'),
    supabase.from('attendance').select('*').gte('attendance_date',from).lte('attendance_date',to).order('attendance_date',{ascending:false}),
    supabase.from('daily_reports').select('*').gte('report_date',from).lte('report_date',to).order('report_date',{ascending:false})
   ]);if(e.error||a.error||r.error)throw new Error();setEmployees((e.data??[]) as Employee[]);setAttendance((a.data??[]) as Attendance[]);setReports((r.data??[]) as DailyReport[]);
 }catch{setMessage('Data admin belum dapat dimuat.')}finally{setBusy(false)}};
 useEffect(()=>{if(Platform.OS==='web')void load();else setAllowed(false)},[]);
 const summary=useMemo<Summary[]>(()=>employees.map(e=>{const rows=attendance.filter(a=>a.employee_id===e.id);const count=(x:string)=>rows.filter(a=>a.status===x).length;return{...e,hadir:count('Hadir'),izin:count('Izin'),sakit:count('Sakit'),cuti:count('Cuti'),dinas:count('Dinas Luar'),tanpa:count('Tanpa Keterangan'),total:rows.length}}),[employees,attendance]);
 if(Platform.OS!=='web')return <View style={s.center}><Text>Dashboard admin hanya tersedia melalui web.</Text></View>;
 if(allowed===false)return <View style={s.center}><Text style={s.denied}>Akses ditolak. Halaman ini khusus admin.</Text></View>;
 return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>Dashboard Admin</Text><Text style={s.sub}>Rekap seluruh pegawai · SDN Kalibaru 3</Text>
  <View style={s.controls}><TextInput style={s.input} value={month} onChangeText={setMonth} placeholder="YYYY-MM"/><Pressable style={s.button} onPress={load}><Text style={s.buttonText}>{busy?'Memuat…':'Tampilkan'}</Text></Pressable></View>{!!message&&<Text>{message}</Text>}
  <Text style={s.heading}>Rekap Bulanan</Text><ScrollView horizontal><View>
   <View style={[s.row,s.header]}>{['Nama','Jabatan','Hadir','Izin','Sakit','Cuti','Dinas Luar','Tanpa Ket.','Total'].map(x=><Text key={x} style={[s.cell,s.headText]}>{x}</Text>)}</View>
   {summary.map(x=><View key={x.id} style={s.row}><Text style={[s.cell,s.name]}>{x.full_name}</Text><Text style={s.cell}>{x.position}</Text>{[x.hadir,x.izin,x.sakit,x.cuti,x.dinas,x.tanpa,x.total].map((n,i)=><Text key={i} style={s.cell}>{n}</Text>)}</View>)}
  </View></ScrollView>
  <Text style={s.heading}>Laporan Harian ({reports.length})</Text>{reports.map(r=>{const e=employees.find(x=>x.id===r.employee_id);return <View key={r.id} style={s.card}><Text style={s.cardTitle}>{r.report_date} · {e?.full_name??'Pegawai'}</Text><Text>{r.activity}</Text>{!!r.result&&<Text style={s.muted}>Hasil: {r.result}</Text>}</View>})}
 </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:28,paddingTop:50,paddingBottom:60,maxWidth:1200,width:'100%',alignSelf:'center'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},denied:{color:'#b42318',fontWeight:'800'},title:{fontSize:30,fontWeight:'900',color:'#18794e'},sub:{marginTop:5,marginBottom:20,color:'#5f6d64'},controls:{flexDirection:'row',gap:10,marginBottom:18},input:{borderWidth:1,borderColor:'#cfd8d3',backgroundColor:'#fff',borderRadius:10,padding:12,width:140},button:{backgroundColor:'#18794e',paddingHorizontal:18,justifyContent:'center',borderRadius:10},buttonText:{color:'#fff',fontWeight:'800'},heading:{fontSize:21,fontWeight:'800',marginTop:20,marginBottom:10},row:{flexDirection:'row',backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#e2e9e4'},header:{backgroundColor:'#e4ece7'},cell:{width:115,padding:11,textAlign:'center'},name:{width:230,textAlign:'left',fontWeight:'600'},headText:{fontWeight:'800'},card:{backgroundColor:'#fff',padding:15,borderRadius:12,borderWidth:1,borderColor:'#e0e9e3',marginBottom:8,gap:5},cardTitle:{fontWeight:'800',color:'#18794e'},muted:{color:'#647168'}});
