import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import TodayAttendance from '@/components/TodayAttendance';
import { currentEmployee, ownProfilePhotoUrl, saveOwnProfilePhoto } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/lib/types';

const menu=[['Pengajuan Tidak Hadir','/absence-request'],['Shift Saya','/shift-settings'],['Lihat Rekap & Kekurangan','/recap'],['Ganti Kata Sandi','/change-password'],['Kebijakan Privasi','/privacy']] as const;

export default function Home(){
 const[admin,setAdmin]=useState(false);const[employee,setEmployee]=useState<Employee|null>(null);const[photo,setPhoto]=useState<string|null>(null);const[uploading,setUploading]=useState(false);const[message,setMessage]=useState('');
 useEffect(()=>{void Promise.all([supabase.auth.getUser(),currentEmployee(),ownProfilePhotoUrl()]).then(([user,profile,url])=>{setAdmin(user.data.user?.app_metadata?.role==='admin');setEmployee(profile);setPhoto(url)}).catch(()=>setMessage('Profil belum dapat dimuat.'))},[]);
 const pickPhoto=async()=>{
  setMessage('');
  const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.65});
  if(selected.canceled)return;
  setUploading(true);
  try{const asset=selected.assets[0];const base64=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.Base64});if(base64.length>2800000)throw new Error('Foto terlalu besar.');const url=await saveOwnProfilePhoto(decode(base64),asset.mimeType??'image/jpeg');setPhoto(url);setMessage('Foto profil berhasil diperbarui.')}catch(error){setMessage(error instanceof Error?error.message:'Foto profil belum dapat disimpan.')}finally{setUploading(false)}
 };
 return <ScrollView style={s.page} contentContainerStyle={s.content}>
  <View style={s.profile}><Pressable onPress={pickPhoto} disabled={uploading} style={s.photoButton}>{photo?<Image source={{uri:photo}} style={s.photo}/>:<View style={s.placeholder}><Text style={s.initial}>{employee?.full_name?.charAt(0)??'?'}</Text></View>}<View style={s.editBadge}><Text style={s.editText}>{uploading?'…':'Ubah'}</Text></View></Pressable><View style={s.identity}><Text style={s.name}>{employee?.full_name??'Memuat profil…'}</Text><Text style={s.nip}>NI PPPK: {employee?.ni_pppk||'-'}</Text></View></View>
  {!!message&&<Text style={s.message}>{message}</Text>}
  <TodayAttendance />
  <View style={s.divider}/>
  {admin&&Platform.OS==='web'&&<Pressable style={s.admin} onPress={()=>router.push('/admin')}><Text style={s.adminText}>Dashboard Admin Web</Text></Pressable>}
  {menu.map(([label,path])=><Pressable key={path} style={s.menu} onPress={()=>router.push(path)}><Text style={s.menuText}>{label}</Text></Pressable>)}
  <Pressable onPress={async()=>{await supabase.auth.signOut({scope:'local'});router.replace('/login')}}><Text style={s.logout}>Keluar</Text></Pressable>
 </ScrollView>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:52,paddingBottom:48,gap:14,maxWidth:700,width:'100%',alignSelf:'center'},profile:{flexDirection:'row',alignItems:'center',gap:15,backgroundColor:'#e3f2e8',padding:15,borderRadius:18},photoButton:{width:78,height:78},photo:{width:78,height:78,borderRadius:39,backgroundColor:'#d7e2da'},placeholder:{width:78,height:78,borderRadius:39,backgroundColor:'#18794e',alignItems:'center',justifyContent:'center'},initial:{color:'#fff',fontSize:32,fontWeight:'900'},editBadge:{position:'absolute',bottom:-1,right:-3,backgroundColor:'#fff',borderRadius:12,paddingHorizontal:7,paddingVertical:3,borderWidth:1,borderColor:'#c8d8cd'},editText:{fontSize:10,fontWeight:'800',color:'#18794e'},identity:{flex:1,gap:5},name:{fontSize:20,fontWeight:'900',color:'#174b34'},nip:{fontSize:13,color:'#526158'},message:{color:'#35453b',fontWeight:'600',lineHeight:20},divider:{height:1,backgroundColor:'#dce8df',marginVertical:4},admin:{backgroundColor:'#123f2c',padding:18,borderRadius:16},adminText:{color:'#fff',fontSize:17,fontWeight:'800'},menu:{backgroundColor:'#fff',padding:17,borderRadius:16,borderWidth:1,borderColor:'#dce8df'},menuText:{fontSize:16,fontWeight:'700'},logout:{textAlign:'center',color:'#b42318',padding:18}});
