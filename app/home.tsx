import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import TodayAttendance from '@/components/TodayAttendance';
import { clearLocalDataCache, currentEmployee, ownProfilePhotoUrl, ownWorkPreference, saveOwnProfilePhoto } from '@/lib/data';
import { cancelAttendanceReminders, scheduleAttendanceReminders } from '@/lib/attendanceNotifications';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/lib/types';

const menu=[['Pengajuan Tidak Hadir','/absence-request'],['Shift Saya','/shift-settings'],['Lihat Rekap & Kekurangan','/recap'],['Cetak Rekap Bulanan Saya','/personal-monthly-recap'],['Ganti Kata Sandi','/change-password'],['Kebijakan Privasi','/privacy']] as const;

export default function Home(){
 const[admin,setAdmin]=useState(false);const[employee,setEmployee]=useState<Employee|null>(null);const[photo,setPhoto]=useState<string|null>(null);const[uploading,setUploading]=useState(false);const[message,setMessage]=useState('');
 useEffect(()=>{void (async()=>{try{const{data}=await supabase.auth.getSession();const user=data.session?.user;if(user?.user_metadata?.must_change_password===true)return router.replace('/change-password');setAdmin(user?.app_metadata?.role==='admin');const[profile,url,preference]=await Promise.all([currentEmployee(),ownProfilePhotoUrl(),ownWorkPreference()]);setEmployee(profile);setPhoto(url);void scheduleAttendanceReminders(preference.shift,preference.workPattern)}catch{setMessage('Profil belum dapat dimuat.')}})()},[]);
 const pickPhoto=async()=>{
  setMessage('');
  const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.65});
  if(selected.canceled)return;
  setUploading(true);
  try{const asset=selected.assets[0];const base64=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.Base64});if(base64.length>2800000)throw new Error('Foto terlalu besar.');const url=await saveOwnProfilePhoto(decode(base64),asset.mimeType??'image/jpeg');setPhoto(url);setMessage('Foto profil berhasil diperbarui.')}catch(error){setMessage(error instanceof Error?error.message:'Foto profil belum dapat disimpan.')}finally{setUploading(false)}
 };
 return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
  <View style={s.profile}><Pressable onPress={pickPhoto} disabled={uploading} style={s.photoButton}>{photo?<Image source={{uri:photo}} style={s.photo}/>:<View style={s.placeholder}><Text style={s.initial}>{employee?.full_name?.charAt(0)??'?'}</Text></View>}<View style={s.editBadge}><Text style={s.editText}>{uploading?'…':'Ubah'}</Text></View></Pressable><View style={s.identity}><Text style={s.name}>{employee?.full_name??'Memuat profil…'}</Text><Text style={s.nip}>NI PPPK: {employee?.ni_pppk||'-'}</Text><Text style={s.unit}>Unit Dinas: {employee?.unit_name??'Memuat…'}</Text></View></View>
  {!!message&&<Text style={s.message}>{message}</Text>}
  <TodayAttendance />
  <View style={s.divider}/>
  {admin&&Platform.OS==='web'&&<Pressable style={s.admin} onPress={()=>router.push('/admin')}><Text style={s.adminText}>Dashboard Admin Web</Text></Pressable>}
  <View style={s.menuGrid}>{menu.map(([label,path])=><Pressable key={path} style={s.menu} onPress={()=>router.push(path)}><Text style={s.menuText}>{label}</Text></Pressable>)}</View>
  <Pressable onPress={async()=>{await cancelAttendanceReminders();clearLocalDataCache();await supabase.auth.signOut({scope:'local'});router.replace('/login')}}><Text style={s.logout}>Keluar</Text></Pressable>
 </ScrollView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{paddingHorizontal:18,paddingTop:38,paddingBottom:32,gap:11,maxWidth:700,width:'100%',alignSelf:'center'},profile:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#e3f2e8',padding:13,borderRadius:16},photoButton:{width:66,height:66},photo:{width:66,height:66,borderRadius:33,backgroundColor:'#d7e2da'},placeholder:{width:66,height:66,borderRadius:33,backgroundColor:'#18794e',alignItems:'center',justifyContent:'center'},initial:{color:'#fff',fontSize:29,fontWeight:'900'},editBadge:{position:'absolute',bottom:-1,right:-3,backgroundColor:'#fff',borderRadius:12,paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderColor:'#c8d8cd'},editText:{fontSize:11,fontWeight:'800',color:'#18794e'},identity:{flex:1,gap:4},name:{fontSize:21,fontWeight:'900',color:'#174b34'},nip:{fontSize:15,color:'#526158'},unit:{fontSize:14,color:'#315b46',fontWeight:'700'},message:{color:'#35453b',fontWeight:'600',fontSize:14},divider:{height:1,backgroundColor:'#dce8df'},admin:{backgroundColor:'#123f2c',padding:14,borderRadius:13},adminText:{color:'#fff',fontSize:16,fontWeight:'800'},menuGrid:{gap:8},menu:{width:'100%',minHeight:51,backgroundColor:'#fff',paddingHorizontal:16,paddingVertical:13,borderRadius:12,borderWidth:1,borderColor:'#dce8df',justifyContent:'center'},menuText:{fontSize:16,fontWeight:'700'},logout:{textAlign:'center',color:'#b42318',paddingVertical:9,fontSize:15}});
