import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { jakartaDate, jakartaTime } from '@/lib/date';
import { addDailyReport, ownAttendance, ownDefaultShift, ownReportForDate, recordCheckIn, recordCheckOut } from '@/lib/data';
import { checkInResult, checkOutResult, scheduleText } from '@/lib/schedule';
import type { Attendance, ShiftLabel } from '@/lib/types';

const absenceStatuses = ['Izin', 'Sakit', 'Cuti', 'Dinas Luar'];

export default function TodayAttendance() {
  const date = jakartaDate();
  const [shift, setShift] = useState<ShiftLabel>('Pagi');
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [activity, setActivity] = useState('');
  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const [defaultShift, rows] = await Promise.all([ownDefaultShift(), ownAttendance(date, date)]);
      const row = rows[0] ?? null;
      setShift(row?.shift_label ?? defaultShift); setAttendance(row);
      if (row?.check_out) {
        const report = await ownReportForDate(date);
        setActivity(report?.activity ?? ''); setResult(report?.result ?? ''); setNote(report?.note ?? '');
      }
    } catch { setMessage('Absensi hari ini belum dapat dimuat.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);

  const checkIn = async () => {
    setBusy(true); setMessage('');
    try { const row = await recordCheckIn(date, shift, jakartaTime()); setAttendance(row); setMessage(`Absen masuk berhasil: ${checkInResult(row.late_minutes)}.`); }
    catch { setMessage('Absen masuk belum dapat disimpan.'); } finally { setBusy(false); }
  };
  const checkOut = async () => {
    setBusy(true); setMessage('');
    try { const row = await recordCheckOut(date, shift, jakartaTime()); setAttendance(row); setMessage(`Absen pulang berhasil: ${checkOutResult(row.early_leave_minutes)}.`); setReportVisible(true); }
    catch { setMessage('Absen pulang belum dapat disimpan. Pastikan sudah absen masuk.'); } finally { setBusy(false); }
  };
  const saveReport = async () => {
    if (!activity.trim()) return setMessage('Kegiatan harian wajib diisi.');
    setBusy(true); setMessage('');
    try { await addDailyReport({ date, activity, result, note }); setMessage('Laporan harian berhasil disimpan.'); setReportVisible(false); }
    catch { setMessage('Laporan harian belum dapat disimpan.'); } finally { setBusy(false); }
  };

  const absence = attendance && absenceStatuses.includes(attendance.status);
  const schedule = scheduleText(date, shift);
  return <View style={s.wrap}>
    <Text style={s.heading}>Absen Hari Ini</Text><Text style={s.date}>{date} · Shift {shift} · {schedule ?? 'Libur'}</Text>
    {absence ? <View style={s.absence}><Text style={s.absenceTitle}>Pengajuan Tidak Hadir</Text><Text>{attendance?.status}</Text><Text style={s.muted}>{attendance?.note}</Text></View> : <>
      <View style={s.row}>
        <View style={s.card}><Text style={s.label}>Jam Masuk</Text>{attendance?.check_in ? <><Text style={s.time}>{attendance.check_in.slice(0,5)}</Text><Text style={[s.result,attendance.late_minutes>0&&s.warning]}>{checkInResult(attendance.late_minutes)}</Text></> : <Pressable disabled={busy||!schedule} style={[s.button,(busy||!schedule)&&s.disabled]} onPress={checkIn}><Text style={s.buttonText}>Tap Absen Masuk</Text></Pressable>}</View>
        <View style={s.card}><Text style={s.label}>Jam Pulang</Text>{attendance?.check_out ? <><Text style={s.time}>{attendance.check_out.slice(0,5)}</Text><Text style={[s.result,attendance.early_leave_minutes>0&&s.warning]}>{checkOutResult(attendance.early_leave_minutes)}</Text></> : <Pressable disabled={busy||!attendance?.check_in} style={[s.button,(busy||!attendance?.check_in)&&s.disabled]} onPress={checkOut}><Text style={s.buttonText}>{attendance?.check_in?'Tap Absen Pulang':'Absen masuk dulu'}</Text></Pressable>}</View>
      </View>
      {!!attendance?.check_out && <Pressable style={s.reportButton} onPress={()=>setReportVisible(true)}><Text style={s.reportButtonText}>Isi / Edit Laporan Harian</Text></Pressable>}
    </>}
    {!!message&&<Text style={s.message}>{message}</Text>}
    <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={()=>setReportVisible(false)}><KeyboardAvoidingView style={s.modalFlex} behavior={Platform.OS==='ios'?'padding':'height'}><View style={s.modalShade}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalScroll}><View style={s.report}><Text style={s.reportTitle}>Laporan Harian</Text><Text style={s.muted}>Diisi setelah absen pulang.</Text><TextInput style={[s.input,s.area]} multiline value={activity} onChangeText={setActivity} placeholder="Kegiatan hari ini" /><TextInput style={s.input} value={result} onChangeText={setResult} placeholder="Hasil kegiatan (opsional)" /><TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Catatan (opsional)" /><Pressable disabled={busy} style={[s.button,busy&&s.disabled]} onPress={saveReport}><Text style={s.buttonText}>Simpan Laporan Harian</Text></Pressable><Pressable onPress={()=>setReportVisible(false)}><Text style={s.close}>Tutup</Text></Pressable></View></ScrollView></View></KeyboardAvoidingView></Modal>
  </View>;
}

const s=StyleSheet.create({wrap:{gap:10},heading:{fontSize:21,fontWeight:'900',color:'#18794e'},date:{color:'#526158',marginTop:-7,fontSize:12},row:{flexDirection:'row',gap:8},card:{flex:1,minHeight:118,backgroundColor:'#fff',padding:12,borderRadius:14,borderWidth:1,borderColor:'#dce8df',gap:8},label:{fontWeight:'800',fontSize:13},time:{fontSize:25,fontWeight:'900',color:'#18794e'},result:{fontSize:11,fontWeight:'800',color:'#18794e'},warning:{color:'#b54708'},button:{backgroundColor:'#18794e',paddingVertical:12,paddingHorizontal:7,borderRadius:11,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800',fontSize:11,textAlign:'center'},disabled:{opacity:.45},absence:{padding:13,borderRadius:14,backgroundColor:'#fff8e7',borderWidth:1,borderColor:'#f1d596',gap:4},absenceTitle:{fontWeight:'900',color:'#8a4b08'},muted:{color:'#647168',lineHeight:19},reportButton:{backgroundColor:'#225a91',padding:11,borderRadius:11,alignItems:'center'},reportButtonText:{color:'#fff',fontWeight:'800',fontSize:12},modalFlex:{flex:1},modalShade:{flex:1,backgroundColor:'rgba(0,0,0,.45)',padding:22},modalScroll:{flexGrow:1,justifyContent:'center'},report:{backgroundColor:'#eef6ff',padding:18,borderRadius:16,borderWidth:1,borderColor:'#c9ddf3',gap:10},reportTitle:{fontSize:20,fontWeight:'900',color:'#225a91'},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:11,padding:12,backgroundColor:'#fff',color:'#1f2a24'},area:{minHeight:80,textAlignVertical:'top'},close:{textAlign:'center',padding:8,color:'#225a91',fontWeight:'800'},message:{color:'#35453b',fontWeight:'600',lineHeight:18,fontSize:12}});
