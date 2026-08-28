import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { jakartaDate, jakartaTime, validDate, validTime } from '@/lib/date';
import { addDailyReport, ownAttendance, ownDefaultShift, ownReportForDate, recordCheckIn, recordCheckOut, saveAttendance } from '@/lib/data';
import { checkInResult, checkOutResult, scheduleText } from '@/lib/schedule';
import type { Attendance, ShiftLabel } from '@/lib/types';

const absenceStatuses = ['Izin', 'Sakit', 'Cuti', 'Dinas Luar'];

export default function Attendance() {
  const params = useLocalSearchParams<{ date?: string }>();
  const requestedDate = typeof params.date === 'string' && validDate(params.date) ? params.date : jakartaDate();
  const isToday = requestedDate === jakartaDate();
  const [shift, setShift] = useState<ShiftLabel>('Pagi');
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [activity, setActivity] = useState('');
  const [result, setResult] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    try {
      const [defaultShift, rows] = await Promise.all([ownDefaultShift(), ownAttendance(requestedDate, requestedDate)]);
      const row = rows[0] ?? null;
      setShift(row?.shift_label ?? defaultShift);
      setAttendance(row);
      setCheckIn(row?.check_in?.slice(0, 5) ?? '');
      setCheckOut(row?.check_out?.slice(0, 5) ?? '');
      if (row?.check_out) {
        const report = await ownReportForDate(requestedDate);
        setActivity(report?.activity ?? '');
        setResult(report?.result ?? '');
        setReportNote(report?.note ?? '');
      }
    } catch {
      setMessage('Data absensi belum dapat dimuat.');
    } finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, [requestedDate]);

  const tapCheckIn = async () => {
    setBusy(true); setMessage('');
    try {
      const row = await recordCheckIn(requestedDate, shift, jakartaTime());
      setAttendance(row); setCheckIn(row.check_in?.slice(0, 5) ?? '');
      setMessage(`Absen masuk berhasil: ${checkInResult(row.late_minutes)}.`);
    } catch { setMessage('Absen masuk belum dapat disimpan.'); }
    finally { setBusy(false); }
  };

  const tapCheckOut = async () => {
    setBusy(true); setMessage('');
    try {
      const row = await recordCheckOut(requestedDate, shift, jakartaTime());
      setAttendance(row); setCheckOut(row.check_out?.slice(0, 5) ?? '');
      setMessage(`Absen pulang berhasil: ${checkOutResult(row.early_leave_minutes)}. Silakan isi laporan harian.`);
    } catch { setMessage('Absen pulang belum dapat disimpan. Pastikan sudah absen masuk.'); }
    finally { setBusy(false); }
  };

  const saveCorrection = async () => {
    if (!validTime(checkIn) || !validTime(checkOut) || !checkIn || !checkOut) return setMessage('Lengkapi jam masuk dan pulang dengan format HH:MM.');
    if (checkOut < checkIn) return setMessage('Jam pulang tidak boleh lebih awal dari jam masuk.');
    setBusy(true); setMessage('');
    try {
      await saveAttendance({ date: requestedDate, checkIn, checkOut, shiftLabel: shift, status: 'Hadir', note: '' });
      setMessage('Absensi tanggal lalu berhasil dilengkapi.'); await load();
    } catch { setMessage('Absensi belum dapat disimpan.'); }
    finally { setBusy(false); }
  };

  const saveReport = async () => {
    if (!activity.trim()) return setMessage('Kegiatan harian wajib diisi.');
    setBusy(true); setMessage('');
    try { await addDailyReport({ date: requestedDate, activity, result, note: reportNote }); setMessage('Laporan harian berhasil disimpan.'); }
    catch { setMessage('Laporan harian belum dapat disimpan.'); }
    finally { setBusy(false); }
  };

  const isAbsence = attendance && absenceStatuses.includes(attendance.status);
  const schedule = scheduleText(requestedDate, shift);

  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <Text style={s.title}>{isToday ? 'Absen Hari Ini' : 'Lengkapi Absensi'}</Text>
    <Text style={s.date}>{requestedDate}</Text>
    <View style={s.scheduleCard}><Text style={s.scheduleTitle}>Shift {shift}</Text><Text style={s.scheduleText}>{schedule ? `Jam kerja ${schedule}` : 'Minggu bukan hari kerja'}</Text></View>
    {isAbsence ? <View style={s.infoCard}><Text style={s.infoTitle}>Pengajuan Tidak Hadir</Text><Text>{attendance?.status}</Text>{!!attendance?.note && <Text style={s.muted}>{attendance.note}</Text>}</View> : isToday ? <>
      <View style={s.card}><Text style={s.step}>Jam Masuk</Text>{attendance?.check_in ? <><Text style={s.time}>{attendance.check_in.slice(0, 5)}</Text><Text style={[s.result, attendance.late_minutes > 0 && s.warning]}>{checkInResult(attendance.late_minutes)}</Text></> : <Pressable disabled={busy || !schedule} style={[s.button, (busy || !schedule) && s.disabled]} onPress={tapCheckIn}><Text style={s.buttonText}>Tap Absen Masuk</Text></Pressable>}</View>
      <View style={s.card}><Text style={s.step}>Jam Pulang</Text>{attendance?.check_out ? <><Text style={s.time}>{attendance.check_out.slice(0, 5)}</Text><Text style={[s.result, attendance.early_leave_minutes > 0 && s.warning]}>{checkOutResult(attendance.early_leave_minutes)}</Text></> : <Pressable disabled={busy || !attendance?.check_in} style={[s.button, (busy || !attendance?.check_in) && s.disabled]} onPress={tapCheckOut}><Text style={s.buttonText}>{attendance?.check_in ? 'Tap Absen Pulang' : 'Absen masuk terlebih dahulu'}</Text></Pressable>}</View>
    </> : <View style={s.card}>
      <Text style={s.step}>Koreksi tanggal lalu</Text><Text style={s.muted}>Fitur ini dipakai untuk melengkapi tanggal yang terlewat.</Text>
      <View style={s.row}><View style={s.half}><Text style={s.label}>Jam masuk</Text><TextInput style={s.input} value={checkIn} onChangeText={setCheckIn} placeholder="HH:MM" keyboardType="numbers-and-punctuation" /></View><View style={s.half}><Text style={s.label}>Jam pulang</Text><TextInput style={s.input} value={checkOut} onChangeText={setCheckOut} placeholder="HH:MM" keyboardType="numbers-and-punctuation" /></View></View>
      <Pressable disabled={busy} style={[s.button, busy && s.disabled]} onPress={saveCorrection}><Text style={s.buttonText}>Simpan Kelengkapan Absensi</Text></Pressable>
    </View>}
    {!!attendance?.check_out && !isAbsence && <View style={s.reportCard}>
      <Text style={s.reportTitle}>Laporan Harian</Text><Text style={s.muted}>Diisi setelah absen pulang.</Text>
      <Text style={s.label}>Kegiatan</Text><TextInput style={[s.input,s.area]} multiline value={activity} onChangeText={setActivity} placeholder="Uraikan kegiatan yang dilakukan" />
      <Text style={s.label}>Hasil</Text><TextInput style={s.input} value={result} onChangeText={setResult} placeholder="Hasil kegiatan (opsional)" />
      <Text style={s.label}>Catatan</Text><TextInput style={s.input} value={reportNote} onChangeText={setReportNote} placeholder="Catatan tambahan (opsional)" />
      <Pressable disabled={busy} style={[s.button,busy && s.disabled]} onPress={saveReport}><Text style={s.buttonText}>Simpan Laporan Harian</Text></Pressable>
    </View>}
    {!!message && <Text style={s.message}>{message}</Text>}
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:56,paddingBottom:48,gap:14},title:{fontSize:28,fontWeight:'900',color:'#18794e'},date:{fontSize:16,fontWeight:'700',color:'#526158'},scheduleCard:{backgroundColor:'#e3f2e8',padding:16,borderRadius:14,gap:4},scheduleTitle:{fontSize:18,fontWeight:'800',color:'#125f3d'},scheduleText:{color:'#35453b'},card:{backgroundColor:'#fff',padding:18,borderRadius:16,borderWidth:1,borderColor:'#dce8df',gap:12},step:{fontSize:19,fontWeight:'800'},time:{fontSize:34,fontWeight:'900',color:'#18794e'},result:{fontWeight:'800',color:'#18794e'},warning:{color:'#b54708'},button:{backgroundColor:'#18794e',padding:15,borderRadius:12,alignItems:'center'},disabled:{opacity:.45},buttonText:{color:'#fff',fontWeight:'800'},infoCard:{backgroundColor:'#fff8e7',padding:18,borderRadius:16,gap:7,borderWidth:1,borderColor:'#f1d596'},infoTitle:{fontSize:18,fontWeight:'800',color:'#8a4b08'},muted:{color:'#647168',lineHeight:20},row:{flexDirection:'row',gap:10},half:{flex:1,gap:7},label:{fontWeight:'700',marginTop:3},input:{borderWidth:1,borderColor:'#cfd8d3',borderRadius:12,padding:13,backgroundColor:'#fff',fontSize:16,color:'#1f2a24'},area:{minHeight:95,textAlignVertical:'top'},reportCard:{backgroundColor:'#eef6ff',padding:18,borderRadius:16,borderWidth:1,borderColor:'#c9ddf3',gap:10},reportTitle:{fontSize:20,fontWeight:'900',color:'#225a91'},message:{lineHeight:21,fontWeight:'600',color:'#35453b'}});
