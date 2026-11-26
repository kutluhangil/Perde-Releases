// Perde ve Infuse. Infuse satırları firecore.com/infuse sayfasından (25 Kasım 2026 kopyası) doğrulandı;
// doğrulanamayan satır yazılmaz. Infuse'ta olup olmadığı bilinmeyen Perde özellikleri ayrı listede ("only").
type Text = { tr: string; en: string };
type Cell = { v: 'yes' | 'no' | 'partial'; note?: Text };

export const checkedOn = '2026-11-25';
export const source = 'https://firecore.com/infuse';

export const rows: { topic: Text; perde: Cell; infuse: Cell }[] = [
  {
    topic: { tr: 'Fiyat', en: 'Price' },
    perde: { v: 'yes', note: { tr: 'Ücretsiz, her şey açık', en: 'Free, everything unlocked' } },
    infuse: {
      v: 'partial',
      note: { tr: 'Ücretsiz sürüm; Pro 1,99 $/ay · 16,99 $/yıl · 99,99 $ ömür boyu', en: 'Free tier; Pro $1.99/month · $16.99/year · $99.99 lifetime' },
    },
  },
  {
    topic: { tr: 'Windows ve Linux', en: 'Windows and Linux' },
    perde: { v: 'yes' },
    infuse: { v: 'no' },
  },
  {
    topic: { tr: 'Apple TV, iPhone, iPad, Vision Pro', en: 'Apple TV, iPhone, iPad, Vision Pro' },
    perde: { v: 'no', note: { tr: 'Yalnız Mac', en: 'Mac only' } },
    infuse: { v: 'yes' },
  },
  {
    topic: { tr: 'Diskteki klasörden kütüphane', en: 'Library from a folder on disk' },
    perde: { v: 'yes' },
    infuse: { v: 'yes' },
  },
  {
    topic: { tr: 'Ağ paylaşımları (SMB, NFS, WebDAV)', en: 'Network shares (SMB, NFS, WebDAV)' },
    perde: { v: 'partial', note: { tr: 'Bilgisayarda klasör olarak bağlanınca', en: 'Once mounted as a folder' } },
    infuse: { v: 'yes', note: { tr: 'Doğrudan', en: 'Directly' } },
  },
  {
    topic: { tr: 'Plex, Emby, Jellyfin', en: 'Plex, Emby, Jellyfin' },
    perde: { v: 'no' },
    infuse: { v: 'yes' },
  },
  {
    topic: { tr: 'Bulut (Dropbox, Google Drive, OneDrive)', en: 'Cloud (Dropbox, Google Drive, OneDrive)' },
    perde: { v: 'partial', note: { tr: 'Bilgisayardaki eşitleme klasörü', en: 'Through the synced folder' } },
    infuse: { v: 'yes', note: { tr: 'Doğrudan, Pro', en: 'Directly, Pro' } },
  },
  {
    topic: { tr: 'Afiş ve film bilgisi', en: 'Artwork and details' },
    perde: { v: 'yes', note: { tr: 'TMDB; IMDb, Rotten Tomatoes, Metacritic puanı', en: 'TMDB; IMDb, Rotten Tomatoes, Metacritic scores' } },
    infuse: { v: 'yes', note: { tr: 'TMDB', en: 'TMDB' } },
  },
  {
    topic: { tr: 'Altyazı bulma', en: 'Finding subtitles' },
    perde: { v: 'yes', note: { tr: 'Kendiliğinden, dosya özetiyle; SubDL yedekte', en: 'Automatic, by file hash; SubDL as fallback' } },
    infuse: { v: 'yes', note: { tr: 'OpenSubtitles’tan tek dokunuşla', en: 'One tap from OpenSubtitles' } },
  },
  {
    topic: { tr: 'Dolby Vision', en: 'Dolby Vision' },
    perde: { v: 'partial', note: { tr: 'macOS’ta', en: 'On macOS' } },
    infuse: { v: 'partial', note: { tr: 'Pro, profil 5 ve 8', en: 'Pro, profiles 5 and 8' } },
  },
  {
    topic: { tr: 'AirPlay', en: 'AirPlay' },
    perde: { v: 'partial', note: { tr: 'macOS’ta, ücretsiz', en: 'On macOS, free' } },
    infuse: { v: 'partial', note: { tr: 'Pro; Google Cast da', en: 'Pro; Google Cast too' } },
  },
  {
    topic: { tr: 'iCloud ile eşitleme', en: 'iCloud sync' },
    perde: { v: 'partial', note: { tr: 'Mac’ler arasında, ücretsiz', en: 'Between Macs, free' } },
    infuse: { v: 'yes', note: { tr: 'Temel ücretsiz, tam eşitleme Pro', en: 'Basic free, full sync with Pro' } },
  },
  {
    topic: { tr: 'Trakt', en: 'Trakt' },
    perde: { v: 'no' },
    infuse: { v: 'yes' },
  },
  {
    topic: { tr: 'Jenerik ve giriş atlama', en: 'Skip intros and credits' },
    perde: { v: 'no' },
    infuse: { v: 'yes' },
  },
  {
    topic: { tr: 'Reklam ve izleme', en: 'Ads and tracking' },
    perde: { v: 'yes', note: { tr: 'Yok', en: 'None' } },
    infuse: { v: 'yes', note: { tr: 'Yok', en: 'None' } },
  },
];

/** Perde'de olan; Infuse'ta olup olmadığını doğrulamadığımız için tabloya konmayanlar. */
export const only: Text[] = [
  { tr: 'Klasör adlarından etiketleri silen, artıkları Çöp’e taşıyan kütüphane düzeni', en: 'Library cleanup that strips tags from folder names and moves leftovers to the Trash' },
  { tr: 'İki altyazı aynı anda', en: 'Two subtitles at once' },
  { tr: 'Bozuk Türkçe karakterleri onarma', en: 'Repairing broken Turkish characters' },
  { tr: 'Her disk için cam klasör ve akıllı klasörler', en: 'A glass folder for every disk, plus smart folders' },
  { tr: 'Türkçe ve İngilizce arayüz', en: 'Turkish and English interface' },
];
