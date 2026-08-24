import { ScrollView, StyleSheet, Text, View } from 'react-native';

const Section=({title,children}:{title:string;children:React.ReactNode})=><View style={s.section}><Text style={s.heading}>{title}</Text><Text style={s.body}>{children}</Text></View>;
export default function Privacy(){
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <Text style={s.title}>Kebijakan Privasi</Text>
    <Text style={s.updated}>MBOK PPPK PW · SDN Kalibaru 3 · diperbarui 24 Agustus 2026</Text>
    <Section title="Tentang aplikasi">MBOK PPPK PW adalah aplikasi internal untuk absensi dan laporan kegiatan PPPK Paruh Waktu SDN Kalibaru 3. Aplikasi ini bukan aplikasi resmi KMOB dan tidak berafiliasi dengan pengelola KMOB.</Section>
    <Section title="Data yang diproses">Nama, jabatan, NI PPPK atau kode pegawai, identitas akun internal, tanggal dan waktu absensi, status kehadiran, catatan, serta laporan kegiatan harian.</Section>
    <Section title="Tujuan penggunaan">Data digunakan hanya untuk pencatatan kehadiran, pemeriksaan kelengkapan absensi, penyusunan rekap bulanan, dan laporan administrasi kepegawaian sekolah.</Section>
    <Section title="Akses data">Pegawai hanya dapat melihat dan mengubah datanya sendiri. Admin yang ditunjuk sekolah dapat mengelola serta melihat rekap semua pegawai. Saat ini admin adalah Dovy Wahyu Widhiarta dan Rosadi.</Section>
    <Section title="Penyimpanan dan keamanan">Data utama disimpan pada Supabase dan rekap disinkronkan ke Google Spreadsheet sekolah. Akses dibatasi melalui autentikasi, kebijakan keamanan per baris, dan koneksi terenkripsi.</Section>
    <Section title="Data yang tidak diambil">Aplikasi tidak meminta lokasi, kontak, SMS, IMEI, mikrofon, kamera, foto, maupun data periklanan perangkat untuk fungsi absensi.</Section>
    <Section title="Hak pengguna">Pegawai dapat melihat dan memperbaiki data absensinya. Permintaan koreksi akun, akses data, atau penghapusan diajukan kepada admin sekolah. Data yang wajib dipertahankan untuk kepentingan administrasi akan dijelaskan saat permintaan diproses.</Section>
    <Section title="Kontak pengelola">SDN Kalibaru 3, Kecamatan Cilodong, Kota Depok. Kontak resmi akan dicantumkan sebelum APK dibagikan kepada pegawai.</Section>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7faf8'},content:{padding:24,paddingTop:64,paddingBottom:48,maxWidth:760,width:'100%',alignSelf:'center'},title:{fontSize:30,fontWeight:'900',color:'#18794e'},updated:{marginTop:8,marginBottom:24,color:'#66736b'},section:{backgroundColor:'#fff',padding:18,borderRadius:14,marginBottom:12,borderWidth:1,borderColor:'#e0e9e3'},heading:{fontSize:17,fontWeight:'800',marginBottom:7},body:{lineHeight:22,color:'#35453b'}});
