import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QrCode, Camera, CircleCheck, ScanLine, X } from "lucide-react";
import { api } from "../api/client";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export function ScanPage({ token }) {
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token") || "";
  const [manualToken, setManualToken] = useState(queryToken);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeSession, setActiveSession] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("");
  const tokenValue = useMemo(() => manualToken.trim(), [manualToken]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  function extractToken(rawValue) {
    if (!rawValue) return "";

    try {
      const url = new URL(rawValue);
      return url.searchParams.get("token") || rawValue;
    } catch {
      return rawValue;
    }
  }

  function stopScanner() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    api
      .myAttendance(token)
      .then((payload) => {
        setActiveSession(payload.activeSession);
        if (!queryToken && payload.activeSession?.token) {
          setManualToken(payload.activeSession.token);
        }
      })
      .catch(() => null);
  }, [token, queryToken]);

  useEffect(() => stopScanner, []);

  async function openCameraScanner() {
    setMessage("");
    setError("");
    setScannerStatus("");

    if (!("BarcodeDetector" in window)) {
      setError("QR scanning is not supported in this browser. Use Chrome on Android or paste the token manually.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      setCameraOpen(true);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      setScannerStatus("Scanning for teacher QR...");

      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          if (!barcodes.length) return;

          const raw = barcodes[0].rawValue;
          const extractedToken = extractToken(raw);

          if (extractedToken) {
            setManualToken(extractedToken);
            setScannerStatus("QR detected successfully.");
            setCameraOpen(false);
            stopScanner();
          }
        } catch {
          setScannerStatus("Trying to detect QR...");
        }
      }, 700);
    } catch (cameraError) {
      setError("Camera access was denied or unavailable.");
      setCameraOpen(false);
      stopScanner();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const payload = await api.markAttendance(token, {
        token: tokenValue,
        deviceInfo: navigator.userAgent,
        locationText: "Browser submission"
      });
      setMessage(payload.message);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="dashboard-section scan-wrap">
      <div className="scan-layout">
        <Card className="scan-card scan-main shape-1">
          <p className="eyebrow">Student QR check-in</p>
          <h1 className="scan-title">Scan or paste a live attendance token.</h1>
          <p className="scan-copy">
            Use your device camera to open the teacher QR, or paste the session token manually if
            it was shared with you.
          </p>

          {activeSession ? (
            <div className="scan-highlight">
              <div className="icon-bubble">
                <QrCode size={22} />
              </div>
              <div>
                <strong>{activeSession.subjectName} session is active</strong>
                <p className="muted-copy">
                  Valid until {new Date(activeSession.qrExpiry).toLocaleString()}
                </p>
              </div>
            </div>
          ) : null}

          <form className="stack-form" onSubmit={handleSubmit}>
            <Input
              label="Session token"
              value={manualToken}
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="Paste or scan a live session token"
              required
            />
            <Button type="submit" disabled={!tokenValue}>
              Mark attendance
            </Button>
          </form>

          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </Card>

        <Card className="scan-side shape-5">
          <div className="scan-side-top">
            <p className="eyebrow">Quick actions</p>
            <h2 className="scan-side-title">Use camera to scan the teacher QR.</h2>
            <p className="muted-copy">
              Best experience is on phone. Open the scanner, point the camera at the teacher QR,
              and the session token will fill automatically.
            </p>
            <Button type="button" onClick={openCameraScanner}>
              <ScanLine size={18} />
              Open camera scanner
            </Button>
          </div>
          <div className="scan-tip">
            <div className="icon-bubble">
              <Camera size={22} />
            </div>
            <div>
              <h3>Best way on phone</h3>
              <p className="muted-copy">Open the device camera and scan the teacher QR directly.</p>
            </div>
          </div>
          <div className="scan-tip">
            <div className="icon-bubble">
              <CircleCheck size={22} />
            </div>
            <div>
              <h3>Before you submit</h3>
              <p className="muted-copy">
                Make sure the session is still active. Expired QR sessions will be rejected.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {cameraOpen ? (
        <div className="scanner-modal" role="dialog" aria-modal="true">
          <div className="scanner-panel">
            <div className="scanner-header">
              <div>
                <p className="eyebrow">Camera scanner</p>
                <h2>Point your camera at the teacher QR</h2>
              </div>
              <button
                type="button"
                className="icon-close"
                onClick={() => {
                  setCameraOpen(false);
                  stopScanner();
                }}
                aria-label="Close camera scanner"
              >
                <X size={18} />
              </button>
            </div>
            <video ref={videoRef} className="scanner-video" playsInline muted />
            <p className="muted-copy">{scannerStatus || "Waiting for camera..."}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
