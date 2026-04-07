import QRCode from "qrcode";

export async function buildQrDataUrl(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: "#2C2C24",
      light: "#FDFCF8"
    }
  });
}
