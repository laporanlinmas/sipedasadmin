export interface UserSession {
  username: string;
  role: string;
  namaLengkap: string;
  _loginTs: number;
}

export interface Laporan {
  _ri: string | number;
  ts?: string;
  noSpt?: string;
  lokasi: string;
  hari: string;
  tanggal: string;
  identitas: string;
  personil: string;
  danru: string;
  namaDanru: string;
  keterangan: string;
  fotos?: string[];
  fotosThumb?: string[];
}

export interface Satlinmas {
  _ri: string | number;
  nama: string;
  tglLahir?: string;
  unit?: string;
  wa?: string;
  usia?: number;
}

export interface LayerPeta {
  _ri: string | number;
  nama: string;
  deskripsi?: string;
  simbol: string;
  warna?: string;
  lat: number;
  lng: number;
  aktif?: boolean;
}

export interface DrawingProperti {
  nama: string;
  ket?: string;
  warna?: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

export interface Drawing {
  _ri: string | number;
  type: 'polyline' | 'polygon';
  geojson: string; // JSON string of the Leaflet layer geojson
  properti: DrawingProperti;
}

export interface Settings {
  pdf_judul?: string;
  pdf_tujuan?: string;
  pdf_anggota?: string;
  pdf_pukul?: string;
  pdf_jabatan?: string;
  pdf_nama?: string;
  pdf_pangkat?: string;
  pdf_nip?: string;
  kol_judul?: string;
  kol_subjudul?: string;
  kol_jabatan?: string;
  kol_nama?: string;
  kol_pangkat?: string;
  kol_nip?: string;
  peta_judul?: string;
  peta_jabatan?: string;
  peta_nama?: string;
  [key: string]: string | undefined;
}

export interface WaPiket {
  _ri: string | number;
  nama: string;
  number: string;
  jadwal: string;
  keterangan?: string;
}

