// 17/10 #15: kamera (fotoğraf doğrulama, QR okuyucu) yalnızca kendi kaynağımızda açıkça izinlidir.
// Başka özellikler listelenmez; böylece konum, pano vb. tarayıcı varsayılanında kalır.
// Not: buraya "camera=()" yazmak tarayıcının izin penceresini hiç göstermeden kamerayı reddetmesine yol açar.
export const permissionsPolicyHeader = "camera=(self)";
